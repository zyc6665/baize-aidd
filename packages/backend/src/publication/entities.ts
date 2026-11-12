// Entity pages built from the structured cards: a target ("KRAS G12C") and a drug ("PGN-EDODM1") are not
// seeded tables — they are whatever the readouts name. Nothing is inferred: a page exists only when a listed
// report's card names that entity, and a deal only joins it when its own text mentions the name. Scope is the
// same browse scope as every other exit.
//
// One entity, one page. Two mechanisms, in this order:
//   1. industry/aliases.json — the curated list. A page's canonical name and every spelling that belongs to it
//      (brand vs generic, hyphen vs space, the parenthesised form) are written down there by hand. Matching
//      compares letters and digits only, over three candidates: the whole string, the part before "(", and each
//      name inside the parentheses — so "abemaciclib (Verzenio)" finds the group of either name.
//   2. containment, for everything not curated: names whose letters one contains the other are one cluster
//      ("Factor XIa" / "XIa" / "factor XIa (FXIa)"). Without the alias table this splits brand/generic pairs
//      ("Sunharbo" vs "asundexian (Sunharbo)") into two pages, which is what the table is for.
import type { EntityKind, EntityListResponse, EntityPageResponse, TableRow } from "@aihot/contracts/site";
import { readFileSync } from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "../config.ts";
import { sql } from "../db.ts";
import { publicSourceName } from "./rules.ts";
import { browsedCondition, compositeCondition } from "./scope.ts";

/** The card field each entity kind reads. */
const FIELD: Record<EntityKind, string> = { targets: "target", drugs: "drug" };

export const ENTITY_KINDS: readonly EntityKind[] = ["targets", "drugs"];

/** A name as one URL segment: letters and digits kept (Chinese too), everything else a single hyphen. */
const slugOf = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");

/** Letters and digits only, for the alias lookup and the containment test. */
const letters = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/**
 * The keys a spelling is looked up by: the whole string, the part before "(" and every name inside the
 * parentheses. "pembrolizumab (Keytruda, Merck)" gives pembrolizumab / keytruda / merck.
 */
function nameKeys(name: string): string[] {
  const keys = new Set<string>();
  const push = (value: string) => {
    const key = letters(value);
    if (key) keys.add(key);
  };
  push(name);
  push(name.split("(")[0] ?? "");
  for (const inside of name.match(/\(([^)]*)\)/g) ?? []) {
    for (const part of inside.slice(1, -1).split(/[,，;；、/]/)) push(part);
  }
  return [...keys];
}

interface AliasGroup {
  name: string;
  aliases: string[];
}

type AliasFile = Partial<Record<EntityKind, AliasGroup[]>>;

/** alias key → curated group, per kind; the file is read once per process. */
let aliasCache: Partial<Record<EntityKind, Map<string, AliasGroup>>> | null = null;

function aliasIndex(kind: EntityKind): Map<string, AliasGroup> {
  if (!aliasCache) {
    const loaded: Partial<Record<EntityKind, Map<string, AliasGroup>>> = {};
    try {
      const file = JSON.parse(readFileSync(path.join(REPO_ROOT, "industry/aliases.json"), "utf8")) as AliasFile;
      for (const k of ENTITY_KINDS) {
        const index = new Map<string, AliasGroup>();
        for (const group of file[k] ?? []) {
          for (const spelling of [group.name, ...group.aliases]) {
            const key = letters(spelling);
            if (key) index.set(key, group);
          }
        }
        loaded[k] = index;
      }
    } catch {
      // A missing or malformed alias file must not take the entity pages down: fall back to containment only.
      for (const k of ENTITY_KINDS) loaded[k] = new Map();
    }
    aliasCache = loaded;
  }
  return aliasCache[kind] ?? new Map();
}

interface RawRow {
  id: string;
  title: string;
  url: string;
  published_at: Date | null;
  category: string | null;
  tags: string[];
  score: number | null;
  source_name: string;
  card: unknown;
}

const toRow = (row: RawRow): TableRow => ({
  id: row.id,
  title: row.title,
  url: row.url,
  publishedAt: row.published_at?.toISOString() ?? null,
  sourceName: publicSourceName(row.source_name),
  category: (row.category as TableRow["category"]) ?? null,
  tags: row.tags ?? [],
  score: row.score === null ? null : Number(row.score),
  card: row.card as TableRow["card"],
});

export interface Cluster {
  slug: string;
  name: string;
  /** Every spelling the cards use for this entity; pages query by these, not by the slug. */
  names: string[];
  readouts: number;
}

/** One spelling as the cards wrote it, with how many readouts use it. */
export interface Spelling {
  name: string;
  readouts: number;
}

/** Every spelling the listed cards use, with how many readouts use it. */
async function spellings(kind: EntityKind, now: Date): Promise<Spelling[]> {
  const field = FIELD[kind];
  const rows = await sql<Spelling[]>`
    SELECT btrim(a.output->'readout'->>${field}) AS name, count(*)::int AS readouts
    FROM publications p JOIN analyses a ON a.id = p.analysis_id
    WHERE ${browsedCondition(now)} AND NOT ${compositeCondition()} AND a.output ? 'readout'
      AND coalesce(btrim(a.output->'readout'->>${field}), '') <> ''
    GROUP BY 1
  `;
  return rows.filter((r) => r.name.length > 0);
}

/**
 * Fold spellings into pages. Pure so the rule can be tested without a database. Curated spellings (those the
 * alias table knows) each go to their group's page and never merge by containment — otherwise "KRAS G12C"
 * would be swallowed by a "KRAS" page. Everything else falls back to containment among the uncurated.
 */
export function clusterSpellings(rows: readonly Spelling[], index: ReadonlyMap<string, AliasGroup>): Cluster[] {
  const clusters: Cluster[] = [];
  const curated = new Map<string, Cluster>();
  const loose: Spelling[] = [];
  for (const row of rows) {
    const group = nameKeys(row.name)
      .map((key) => index.get(key))
      .find((hit): hit is AliasGroup => Boolean(hit));
    if (!group) {
      loose.push(row);
      continue;
    }
    const slug = slugOf(group.name);
    let hit = curated.get(slug);
    if (!hit) {
      hit = { slug, name: group.name, names: [], readouts: 0 };
      curated.set(slug, hit);
      clusters.push(hit);
    }
    hit.readouts += row.readouts;
    if (!hit.names.includes(row.name)) hit.names.push(row.name);
  }
  for (const row of loose) {
    const key = letters(row.name);
    if (!key) continue;
    const hit = clusters.find((c) => {
      // A curated page only takes the spellings its group lists; guessing would undo the table.
      if (curated.has(c.slug)) return false;
      const other = letters(c.name);
      return other.includes(key) || key.includes(other);
    });
    if (!hit) {
      clusters.push({ slug: slugOf(row.name), name: row.name, names: [row.name], readouts: row.readouts });
      continue;
    }
    hit.readouts += row.readouts;
    if (!hit.names.includes(row.name)) hit.names.push(row.name);
    // The longest spelling stands for the entity: it still says what the short one means.
    if (!curated.has(hit.slug) && row.name.length > hit.name.length) {
      hit.name = row.name;
      hit.slug = slugOf(row.name);
    }
  }
  return clusters.sort((a, b) => b.readouts - a.readouts || a.name.localeCompare(b.name));
}

/** Spellings folded into one page each: the alias table first, then letter containment. */
export async function entityClusters(kind: EntityKind, now = new Date()): Promise<Cluster[]> {
  return clusterSpellings(await spellings(kind, now), aliasIndex(kind));
}

/** The entities mentioned by listed readouts, most-mentioned first. */
export async function listEntities(kind: EntityKind, now = new Date()): Promise<EntityListResponse> {
  const clusters = await entityClusters(kind, now);
  return { kind, items: clusters.slice(0, 200).map((c) => ({ slug: c.slug, name: c.name, readouts: c.readouts })) };
}

/**
 * One entity's page: the readouts that name it, plus the deals whose asset or modality mentions it. Null when
 * no listed readout names it (a deal alone does not make a target page: there would be no readout to show).
 */
export async function loadEntity(kind: EntityKind, slug: string, now = new Date()): Promise<EntityPageResponse | null> {
  const field = FIELD[kind];
  const cluster = (await entityClusters(kind, now)).find((c) => c.slug === slug);
  if (!cluster) return null;
  const readouts = await sql<RawRow[]>`
    SELECT p.article_id AS id, p.title, p.url, p.published_at, p.category, p.tags, p.score,
           s.name AS source_name, a.output->'readout' AS card
    FROM publications p
    JOIN analyses a ON a.id = p.analysis_id
    JOIN sources s ON s.id = p.source_id
    WHERE ${browsedCondition(now)} AND NOT ${compositeCondition()} AND a.output ? 'readout'
      AND btrim(a.output->'readout'->>${field}) = ANY(${cluster.names})
    ORDER BY p.published_at DESC NULLS LAST, p.article_id DESC
    LIMIT 100
  `;
  const deals = await sql<RawRow[]>`
    SELECT p.article_id AS id, p.title, p.url, p.published_at, p.category, p.tags, p.score,
           s.name AS source_name, a.output->'deal' AS card
    FROM publications p
    JOIN analyses a ON a.id = p.analysis_id
    JOIN sources s ON s.id = p.source_id
    WHERE ${browsedCondition(now)} AND NOT ${compositeCondition()} AND a.output ? 'deal'
      AND (coalesce(a.output->'deal'->>'asset', '') ILIKE ${"%" + cluster.name + "%"}
        OR coalesce(a.output->'deal'->>'modality', '') ILIKE ${"%" + cluster.name + "%"})
    ORDER BY p.published_at DESC NULLS LAST, p.article_id DESC
    LIMIT 30
  `;
  return { kind, slug: cluster.slug, name: cluster.name, readouts: readouts.map(toRow), deals: deals.map(toRow) };
}
