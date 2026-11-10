// Entity pages built from the structured cards: a target ("KRAS G12C") and a drug ("PGN-EDODM1") are not
// seeded tables — they are whatever the readouts name. Nothing is inferred: a page exists only when a listed
// report's card names that entity, and a deal only joins it when its own text mentions the name. Scope is the
// same browse scope as every other exit.
//
// One name, one page: the cards spell the same entity differently ("Factor XIa" / "XIa" / "factor XIa (FXIa)",
// "Sunharbo" / "Sunharbo (asundexian)"), so names whose letters one contains the other are one cluster. The
// longest spelling is the page's name and slug; merging beyond that would need an alias table we do not keep.
import type { EntityKind, EntityListResponse, EntityPageResponse, TableRow } from "@aihot/contracts/site";
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

/** Letters and digits only, for the containment test that decides which spellings are one entity. */
const letters = (name: string) => name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

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

interface Cluster {
  slug: string;
  name: string;
  /** Every spelling the cards use for this entity; pages query by these, not by the slug. */
  names: string[];
  readouts: number;
}

/** Every spelling the listed cards use, with how many readouts use it. */
async function spellings(kind: EntityKind, now: Date) {
  const field = FIELD[kind];
  const rows = await sql<{ name: string; readouts: number }[]>`
    SELECT btrim(a.output->'readout'->>${field}) AS name, count(*)::int AS readouts
    FROM publications p JOIN analyses a ON a.id = p.analysis_id
    WHERE ${browsedCondition(now)} AND NOT ${compositeCondition()} AND a.output ? 'readout'
      AND coalesce(btrim(a.output->'readout'->>${field}), '') <> ''
    GROUP BY 1
  `;
  return rows.filter((r) => r.name.length > 0);
}

/** Spellings folded into one page each: a name joins the first cluster whose letters it shares. */
export async function entityClusters(kind: EntityKind, now = new Date()): Promise<Cluster[]> {
  const rows = await spellings(kind, now);
  const clusters: Cluster[] = [];
  for (const row of rows) {
    const key = letters(row.name);
    if (!key) continue;
    const hit = clusters.find((c) => {
      const other = letters(c.name);
      return other.includes(key) || key.includes(other);
    });
    if (!hit) {
      clusters.push({ slug: slugOf(row.name), name: row.name, names: [row.name], readouts: row.readouts });
      continue;
    }
    hit.readouts += row.readouts;
    hit.names.push(row.name);
    // The longest spelling stands for the entity: it is the one that still says what the short one means.
    if (row.name.length > hit.name.length) {
      hit.name = row.name;
      hit.slug = slugOf(row.name);
    }
  }
  return clusters.sort((a, b) => b.readouts - a.readouts || a.name.localeCompare(b.name));
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
