// Structured tables: deals, clinical readouts and model cards. A row exists only when the structure step
// wrote that card from the material itself, so these tables never invent a column value. Which rows are
// public is decided here exactly as on every other exit — the same browse scope as 全部动态 — and the
// card is an annotation carried by the analysis the publication was built from (`p.analysis_id`), not a
// second copy of the judgement.
import type { CategoryKey } from "@aihot/contracts/taxonomy";
import type { DealCard, ModelCard, ReadoutCard, TableKind, TableResponse, TableRow } from "@aihot/contracts/site";
import { sql } from "../db.ts";
import { publicSourceName } from "./rules.ts";
import { browsedCondition, compositeCondition } from "./scope.ts";

/** The jsonb key each table reads; the analysis writes it under exactly this name. */
const CARD_KEY = { deals: "deal", readouts: "readout", models: "modelCard" } as const;

export interface TableQuery {
  page?: number;
  limit?: number;
  /** deals: license / acquisition / collaboration / financing / ipo; readouts: positive / negative / mixed; models: open / restricted / closed. */
  filter?: string | null;
  now?: Date;
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
  card: DealCard | ReadoutCard | ModelCard;
}

function filterCondition(kind: TableKind, filter: string | null | undefined) {
  if (!filter) return sql`TRUE`;
  const key = CARD_KEY[kind];
  if (kind === "models") return sql`a.output->${key}->>'weights' = ${filter}`;
  if (kind === "readouts") return sql`a.output->${key}->>'result' = ${filter}`;
  return sql`a.output->${key}->>'kind' = ${filter}`;
}

/**
 * One page of a structured table, newest first. The publication must be listed, above the browse floor
 * and not a composite analysis (a roundup mentions many facts but is evidence for none of them).
 */
export async function loadTable(kind: TableKind, query: TableQuery = {}): Promise<TableResponse> {
  const now = query.now ?? new Date();
  const limit = Math.min(Math.max(query.limit ?? 30, 1), 100);
  const page = Math.min(Math.max(query.page ?? 1, 1), 100);
  const key = CARD_KEY[kind];
  const where = sql`${browsedCondition(now)} AND NOT ${compositeCondition()} AND jsonb_exists(a.output, ${key}) AND ${filterCondition(kind, query.filter)}`;

  const [counted] = await sql<{ total: number }[]>`
    SELECT count(*)::int AS total
    FROM publications p
    JOIN analyses a ON a.id = p.analysis_id
    WHERE ${where}
  `;
  const total = counted?.total ?? 0;
  const rows = await sql<RawRow[]>`
    SELECT p.article_id AS id, p.title, p.url, p.published_at, p.category, p.tags, p.score,
           s.name AS source_name, a.output->${key} AS card
    FROM publications p
    JOIN analyses a ON a.id = p.analysis_id
    JOIN sources s ON s.id = p.source_id
    WHERE ${where}
    ORDER BY p.published_at DESC NULLS LAST, p.article_id DESC
    LIMIT ${limit} OFFSET ${(page - 1) * limit}
  `;
  const items: TableRow[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    url: row.url,
    publishedAt: row.published_at?.toISOString() ?? null,
    sourceName: publicSourceName(row.source_name),
    category: (row.category as CategoryKey | null) ?? null,
    tags: row.tags ?? [],
    score: row.score === null ? null : Number(row.score),
    card: row.card,
  }));
  return { kind, items, page, pageCount: Math.max(1, Math.ceil(total / limit)), total };
}
