// 周报和月报的「台账」：把这一周（这一月）里抽到的交易、临床读出、模型卡按规则数一遍。
// 不调模型，只读库，所以每周的数字是确定的、可复核的；写手的正文仍只写它自己的段落。
import type { ReportLedger } from "@aihot/contracts/site";
import { sql } from "../db.ts";

/** One line of the ledger: the card's own words, cut to fit a printed row. */

const LINES = 4;
const TEXT = 60;

/** A card field as written; '' when the writer left it out or wrote something wide. */
function one(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, TEXT) : "";
}

function joined(parts: Array<string | null>): string {
  return parts.filter((p): p is string => Boolean(p)).join("｜");
}

/** Money as a printed figure: 12.5亿美元 / 6,000万美元 / 450万美元; '' when nothing was named. */
function usd(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n >= 1e8) return `${(n / 1e8).toFixed(n >= 1e9 ? 0 : 1).replace(/\.0$/, "")}亿美元`;
  return `${Math.round(n / 1e4).toLocaleString("en-US")}万美元`;
}

const DEAL_KIND: Record<string, string> = { license: "授权", acquisition: "并购", collaboration: "合作", financing: "融资", ipo: "上市", other: "" };
const RESULT: Record<string, string> = { positive: "达到终点", negative: "未达到终点", mixed: "结果不一", neutral: "结果中性" };
const WEIGHTS: Record<string, string> = { open: "开源权重", restricted: "受限制权重", closed: "闭源", unknown: "" };

interface CardRow {
  id: string;
  title: string;
  deal: Record<string, unknown> | null;
  readout: Record<string, unknown> | null;
  model: Record<string, unknown> | null;
}

/**
 * The period's structured cards. A row counts once, by the card it carries; a card naming no number is
 * still listed (the reader decides), but only a named amount is summed.
 */
export async function periodLedger(start: Date, end: Date): Promise<ReportLedger> {
  const rows = await sql<CardRow[]>`
    SELECT p.article_id AS id, p.title,
           CASE WHEN jsonb_typeof(a.output->'deal') = 'object' THEN a.output->'deal' END AS deal,
           CASE WHEN jsonb_typeof(a.output->'readout') = 'object' THEN a.output->'readout' END AS readout,
           CASE WHEN jsonb_typeof(a.output->'modelCard') = 'object' THEN a.output->'modelCard' END AS model
    FROM publications p JOIN analyses a ON a.id = p.analysis_id
    WHERE p.visibility = 'public' AND p.selected AND NOT p.backfill
      AND p.published_at >= ${start} AND p.published_at < ${end}
      AND (jsonb_exists(a.output, 'deal') OR jsonb_exists(a.output, 'readout') OR jsonb_exists(a.output, 'modelCard'))
    ORDER BY p.published_at DESC, p.article_id DESC
    LIMIT 400`;

  const deals = rows.filter((r) => r.deal);
  const readouts = rows.filter((r) => r.readout);
  const models = rows.filter((r) => r.model);

  const namedUsd = deals.reduce((sum, r) => {
    const total = Number(r.deal?.totalUsd ?? r.deal?.upfrontUsd ?? 0);
    return sum + (Number.isFinite(total) && total > 0 ? total : 0);
  }, 0);

  const result = (r: CardRow) => String(r.readout?.result ?? "");
  const weights = (r: CardRow) => String(r.model?.weights ?? "");

  const biggest = [...deals]
    .sort((a, b) => Number(b.deal?.totalUsd ?? b.deal?.upfrontUsd ?? 0) - Number(a.deal?.totalUsd ?? a.deal?.upfrontUsd ?? 0))
    .slice(0, LINES)
    .map((r) => ({
      itemId: r.id,
      title: one(r.title),
      detail: joined([
        one(r.deal?.parties && Array.isArray(r.deal.parties) ? (r.deal.parties as unknown[]).slice(0, 2).join(" × ") : ""),
        one(r.deal?.asset),
        DEAL_KIND[String(r.deal?.kind ?? "")] ?? "",
        one(r.deal?.amountText) || usd(r.deal?.totalUsd ?? r.deal?.upfrontUsd),
      ]),
    }));

  const trials = [...readouts]
    .sort((a, b) => Number(b.readout?.n ?? 0) - Number(a.readout?.n ?? 0))
    .slice(0, LINES)
    .map((r) => ({
      itemId: r.id,
      title: one(r.title),
      detail: joined([
        one(r.readout?.drug),
        one(r.readout?.phase),
        one(r.readout?.indication),
        RESULT[result(r)] ?? "",
        Number(r.readout?.n) > 0 ? `n=${Number(r.readout?.n)}` : "",
      ]),
    }));

  const cards = models.slice(0, LINES).map((r) => ({
    itemId: r.id,
    title: one(r.title),
    detail: joined([one(r.model?.name), one(r.model?.task), WEIGHTS[weights(r)] ?? ""]),
  }));

  return {
    deals: { count: deals.length, namedUsd, items: biggest },
    readouts: {
      count: readouts.length,
      positive: readouts.filter((r) => result(r) === "positive").length,
      negative: readouts.filter((r) => result(r) === "negative").length,
      mixed: readouts.filter((r) => result(r) === "mixed").length,
      items: trials,
    },
    models: {
      count: models.length,
      open: models.filter((r) => weights(r) === "open").length,
      restricted: models.filter((r) => weights(r) === "restricted").length,
      items: cards,
    },
  };
}

/** Whether a ledger carries anything worth printing. */
export function ledgerIsEmpty(ledger: ReportLedger): boolean {
  return ledger.deals.count === 0 && ledger.readouts.count === 0 && ledger.models.count === 0;
}
