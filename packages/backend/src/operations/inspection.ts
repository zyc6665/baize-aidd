// Daily inspection: what came in, what got judged, what got published, which cards were filled,
// and how the paid calls went 鈥?one row per Beijing day, so a slow drift shows up as a number
// instead of being noticed a week later.
import type { AdminInspection, AdminInspectionDay, BeforeJson } from "@aihot/contracts/admin";
import { beijingDate, beijingMidnight } from "@aihot/contracts/time";
import { sql } from "../db.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

function shift(date: string, days: number): string {
  return beijingDate(beijingMidnight(date).getTime() + days * DAY_MS);
}

type Row = {
  day: string;
  collected: string;
  published: string;
  judged: string;
  passed: string;
  selected: string;
  deals: string;
  readouts: string;
  models: string;
  receipts: string;
  failed: string;
};

/** The last `days` Beijing days, newest first, including today (which is still filling up). */
export async function inspectionOverview(days = 7, now = Date.now()): Promise<BeforeJson<AdminInspection>> {
  const today = beijingDate(now);
  const dates = Array.from({ length: Math.max(1, Math.min(31, days)) }, (_, i) => shift(today, -i));
  const starts = dates.map((date) => beijingMidnight(date));
  const ends = dates.map((date) => beijingMidnight(shift(date, 1)));

  const rows = await sql<Row[]>`
    WITH w AS (SELECT d, e FROM unnest(${sql.array(starts)}::timestamptz[], ${sql.array(ends)}::timestamptz[]) AS x(d, e))
    SELECT to_char(w.d AT TIME ZONE 'Asia/Shanghai', 'YYYY-MM-DD') AS day,
      (SELECT count(*) FROM articles t WHERE t.created_at >= w.d AND t.created_at < w.e) AS collected,
      (SELECT count(*) FROM publications p WHERE p.published_at >= w.d AND p.published_at < w.e AND p.visibility = 'public') AS published,
      (SELECT count(*) FROM analyses a WHERE a.created_at >= w.d AND a.created_at < w.e) AS judged,
      (SELECT count(*) FROM analyses a WHERE a.created_at >= w.d AND a.created_at < w.e AND a.relevance = 'pass') AS passed,
      (SELECT count(*) FROM analyses a WHERE a.created_at >= w.d AND a.created_at < w.e AND a.selected) AS selected,
      (SELECT count(*) FROM analyses a WHERE a.created_at >= w.d AND a.created_at < w.e AND jsonb_typeof(a.output->'deal') = 'object') AS deals,
      (SELECT count(*) FROM analyses a WHERE a.created_at >= w.d AND a.created_at < w.e AND jsonb_typeof(a.output->'readout') = 'object') AS readouts,
      (SELECT count(*) FROM analyses a WHERE a.created_at >= w.d AND a.created_at < w.e AND jsonb_typeof(a.output->'modelCard') = 'object') AS models,
      (SELECT count(*) FROM receipts r WHERE r.created_at >= w.d AND r.created_at < w.e) AS receipts,
      (SELECT count(*) FROM receipts r WHERE r.created_at >= w.d AND r.created_at < w.e AND r.status IN ('failed', 'unknown')) AS failed
    FROM w ORDER BY w.d DESC`;

  const day = (r: Row): AdminInspectionDay => ({
    day: r.day,
    collected: Number(r.collected),
    published: Number(r.published),
    judged: Number(r.judged),
    passed: Number(r.passed),
    selected: Number(r.selected),
    deals: Number(r.deals),
    readouts: Number(r.readouts),
    models: Number(r.models),
    receipts: Number(r.receipts),
    failed: Number(r.failed),
  });

  const list = rows.map(day);
  // Days before the site had anything to say are not rows: drop trailing all-zero days, newest first.
  while (list.length > 1 && empty(list[list.length - 1]!)) list.pop();

  // Backups announce themselves in settings; a backup that stops leaves the last one standing here.
  type Saved = { at?: string; uploaded?: boolean; objects?: unknown[] };
  const [saved] = await sql<{ value: Saved | null }[]>`SELECT value FROM settings WHERE key = 'backup.last'`;
  const last = saved?.value ?? null;
  const backup = last?.at
    ? { at: last.at, uploaded: Boolean(last.uploaded), objects: Array.isArray(last.objects) ? last.objects.length : 0 }
    : null;

  return {
    days: list,
    window: list.length,
    // Today is still filling up, so the averages leave it out.
    averages: average(list.slice(1).length > 0 ? list.slice(1) : list),
    backup,
  };
}

// Backfilled items keep their original dates, so "published" says nothing about whether the site was
// running that day; work done is what matters.
const empty = (d: AdminInspectionDay) =>
  d.collected === 0 && d.judged === 0 && d.receipts === 0
  && d.deals === 0 && d.readouts === 0 && d.models === 0;

function average(days: AdminInspectionDay[]): AdminInspection["averages"] {  if (days.length === 0) return { collected: 0, judged: 0, selected: 0, published: 0 };
  const sum = (pick: (d: AdminInspectionDay) => number) => days.reduce((n, d) => n + pick(d), 0);
  const round = (n: number) => Math.round((n / days.length) * 10) / 10;
  return {
    collected: round(sum((d) => d.collected)),
    judged: round(sum((d) => d.judged)),
    selected: round(sum((d) => d.selected)),
    published: round(sum((d) => d.published)),
  };
}
