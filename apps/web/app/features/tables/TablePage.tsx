/* 三张台账页（交易 / 临床读出 / 模型卡）共用一套骨架：服务端渲染的表格，每行都是“已收录的报告 +
   结构抽取出来的那一张卡”。卡里没有原文写明的数字时不补、不换算，所以空单元格是有意义的。
   列的取舍：做这行的人打开台账是为了找“谁跟谁、多少钱、什么靶点、多少例、多少 p、权重开不开”，
   其余信息留在标题和原文链接里。 */
import { Link, useSearchParams } from "react-router";
import type { DealCard, ModelCard, ReadoutCard, TableKind, TableResponse, TableRow } from "@aihot/contracts/site";
import { CATEGORY_LABELS } from "@aihot/contracts/taxonomy";
import { SITE, subjectAfter } from "@aihot/site";
import { pageMeta } from "../../lib/seo";
import { monthDay } from "../../lib/format";
import { EmptyState } from "../../components/ui/Page";

const COPY: Record<TableKind, { title: string; kicker: string; lead: string; path: string }> = {
  deals: {
    title: "交易台账",
    kicker: "交易与资本",
    lead: "授权、并购、融资与 IPO：谁跟谁、什么资产、首付与总额。金额只写原文给出的数字，没写就不填。",
    path: "/deals",
  },
  readouts: {
    title: "临床读出",
    kicker: "临床与管线",
    lead: "每一次读出：药物、靶点、适应症、期次、样本量与终点。阴性结果和终止同样入账，不做降权。",
    path: "/readouts",
  },
  models: {
    title: "模型卡",
    kicker: "模型与方法",
    lead: "新模型与新方法：做什么任务、在什么基准上测、权重能不能拿到。只有原文写明的指标才出现在这里。",
    path: "/model-cards",
  },
};

/** The site API path for one page of a table. Loaders call this; the fetch itself stays in the route. */
export function tablePath(kind: TableKind, search: string): string {
  const url = new URLSearchParams(search);
  const page = Math.min(Math.max(Number.parseInt(url.get("page") ?? "1", 10) || 1, 1), 100);
  const filter = url.get("filter")?.trim().slice(0, 40) || null;
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (filter) params.set("filter", filter);
  const query = params.size ? `?${params}` : "";
  return `/api/site/tables/${kind}${query}`;
}

export function tableMeta(kind: TableKind, data: TableResponse | undefined) {
  const copy = COPY[kind];
  const count = data?.total ?? 0;
  return pageMeta({
    title: `${copy.title} — ${subjectAfter("AIDD", "台账")}`,
    description: `${SITE.name} 的${copy.title}：${copy.lead}${count ? ` 目前收录 ${count} 条。` : ""}`,
    path: copy.path,
    noindex: false,
  });
}

const DEAL_KINDS: Array<{ key: DealCard["kind"]; label: string }> = [
  { key: "license", label: "授权" },
  { key: "collaboration", label: "合作" },
  { key: "acquisition", label: "并购" },
  { key: "financing", label: "融资" },
  { key: "ipo", label: "IPO" },
];
const RESULTS: Array<{ key: ReadoutCard["result"]; label: string }> = [
  { key: "positive", label: "阳性" },
  { key: "negative", label: "阴性" },
  { key: "mixed", label: "混合" },
];
const WEIGHTS: Array<{ key: ModelCard["weights"]; label: string }> = [
  { key: "open", label: "开源" },
  { key: "restricted", label: "需申请" },
  { key: "closed", label: "闭源" },
];

const RESULT_TONE: Record<ReadoutCard["result"], string> = {
  positive: "text-ok",
  negative: "text-hot",
  mixed: "text-amber-ink",
  neutral: "text-ink-3",
};
const RESULT_TEXT: Record<ReadoutCard["result"], string> = { positive: "阳性", negative: "阴性", mixed: "混合", neutral: "未定" };

function filters(kind: TableKind, active: string | null) {
  const options = kind === "deals" ? DEAL_KINDS : kind === "readouts" ? RESULTS : WEIGHTS;
  const copy = COPY[kind];
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        to={copy.path}
        className={`rounded-full border px-3 py-1 text-[13px] ${active ? "border-line text-ink-3 hover:text-ink" : "border-accent bg-accent-soft text-accent-ink"}`}
      >
        全部
      </Link>
      {options.map((o) => (
        <Link
          key={o.key}
          to={`${copy.path}?filter=${o.key}`}
          className={`rounded-full border px-3 py-1 text-[13px] ${active === o.key ? "border-accent bg-accent-soft text-accent-ink" : "border-line text-ink-3 hover:text-ink"}`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

function shortUsd(value: number | null) {
  if (value === null) return "—";
  if (value >= 1e9) return `${(value / 1e9).toFixed(1).replace(/\.0$/, "")}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return String(value);
}

function DealCells({ card }: { card: DealCard }) {
  const kind = DEAL_KINDS.find((k) => k.key === card.kind)?.label ?? "其他";
  return (
    <>
      <td className="px-3 py-2 align-top text-[13px] text-ink-3 whitespace-nowrap">{kind}</td>
      <td className="px-3 py-2 align-top text-[13px]">{card.parties.join(" × ") || "—"}</td>
      <td className="px-3 py-2 align-top text-[13px] text-ink-2">
        {card.asset ?? "—"}
        {card.modality ? <span className="ml-1 text-ink-4">（{card.modality}）</span> : null}
      </td>
      <td className="px-3 py-2 align-top text-[13px] whitespace-nowrap tabular-nums">{shortUsd(card.upfrontUsd)}</td>
      <td className="px-3 py-2 align-top text-[13px] whitespace-nowrap tabular-nums">
        {card.totalUsd !== null ? shortUsd(card.totalUsd) : (card.amountText ?? "—")}
      </td>
    </>
  );
}

function ReadoutCells({ card }: { card: ReadoutCard }) {
  const endpoints = card.endpoints
    .map((e) => `${e.name}${e.value ? ` ${e.value}${e.unit ?? ""}` : ""}${e.p ? ` (p=${e.p})` : ""}`)
    .join("；");
  return (
    <>
      <td className="px-3 py-2 align-top text-[13px]">
        {card.drug ?? "—"}
        {card.target ? <span className="ml-1 text-ink-3">/ {card.target}</span> : null}
      </td>
      <td className="px-3 py-2 align-top text-[13px] text-ink-2">{card.indication ?? "—"}</td>
      <td className="px-3 py-2 align-top text-[13px] text-ink-3 whitespace-nowrap">{card.phase ?? "—"}</td>
      <td className="px-3 py-2 align-top text-[13px] whitespace-nowrap tabular-nums">{card.n === null ? "—" : `n=${card.n}`}</td>
      <td className={`px-3 py-2 align-top text-[13px] whitespace-nowrap ${RESULT_TONE[card.result]}`}>{RESULT_TEXT[card.result]}</td>
      <td className="px-3 py-2 align-top text-[13px] text-ink-2">{endpoints || "—"}</td>
    </>
  );
}

function ModelCells({ card }: { card: ModelCard }) {
  const bench = card.benchmarks
    .map((b) => `${b.name}${b.metric ? ` ${b.metric}` : ""}${b.value ? ` ${b.value}` : ""}${b.baseline ? ` (基线 ${b.baseline})` : ""}`)
    .join("；");
  const weights = WEIGHTS.find((w) => w.key === card.weights)?.label ?? "未说明";
  return (
    <>
      <td className="px-3 py-2 align-top text-[13px]">
        {card.name}
        {card.version ? <span className="ml-1 text-ink-3">{card.version}</span> : null}
      </td>
      <td className="px-3 py-2 align-top text-[13px] text-ink-2">{card.task ?? "—"}</td>
      <td className="px-3 py-2 align-top text-[13px] text-ink-2">{bench || "—"}</td>
      <td className="px-3 py-2 align-top text-[13px] text-ink-3 whitespace-nowrap">
        {weights}
        {card.license ? <span className="ml-1 text-ink-4">{card.license}</span> : null}
      </td>
    </>
  );
}

const HEAD: Record<TableKind, string[]> = {
  deals: ["类型", "交易方", "资产 / 技术", "首付", "总额"],
  readouts: ["药物 / 靶点", "适应症", "期次", "样本量", "结果", "关键终点"],
  models: ["模型", "任务", "基准", "权重"],
};

function Row({ kind, row }: { kind: TableKind; row: TableRow }) {
  const card = row.card;
  return (
    <tr className="border-t border-line-soft align-top hover:bg-bg-sunk">
      <td className="px-3 py-2 align-top whitespace-nowrap">
        <Link to={`/items/${row.id}`} className="text-[13px] font-medium text-ink hover:text-accent-ink">
          {row.title}
        </Link>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-ink-4">
          <span>{row.publishedAt ? monthDay(row.publishedAt.slice(0, 10)) : "—"}</span>
          <span className="truncate">{row.sourceName}</span>
          {row.category ? <span className="text-ink-4">{CATEGORY_LABELS[row.category]}</span> : null}
        </div>
      </td>
      {kind === "deals" ? <DealCells card={card as DealCard} /> : null}
      {kind === "readouts" ? <ReadoutCells card={card as ReadoutCard} /> : null}
      {kind === "models" ? <ModelCells card={card as ModelCard} /> : null}
    </tr>
  );
}

export function TableView({ kind, data }: { kind: TableKind; data: TableResponse }) {
  const [params] = useSearchParams();
  const active = params.get("filter");
  const copy = COPY[kind];
  const pageHref = (page: number) => {
    const next = new URLSearchParams();
    if (active) next.set("filter", active);
    if (page > 1) next.set("page", String(page));
    const q = next.toString();
    return q ? `${copy.path}?${q}` : copy.path;
  };
  return (
    <div className="mx-auto max-w-[var(--page-max-wide)] px-4 pb-16 pt-6 lg:px-8">
      <header className="mb-5">
        <div className="text-[12px] uppercase tracking-wider text-accent-ink">{copy.kicker}</div>
        <h1 className="mt-1 text-[26px] font-semibold text-ink">{copy.title}</h1>
        <p className="mt-2 max-w-[70ch] text-[14px] leading-6 text-ink-3">{copy.lead}</p>
      </header>
      {/* 三张台账互相跳转：读一次读出的人，常常接着要看这笔交易的条款。 */}
      <div className="mb-3 flex flex-wrap gap-2 text-[13px]">
        {(Object.keys(COPY) as TableKind[]).map((k) => (
          <Link
            key={k}
            to={COPY[k].path}
            className={`rounded-full border px-3 py-1 ${k === kind ? "border-accent bg-accent-soft text-accent-ink" : "border-line text-ink-3 hover:text-ink"}`}
          >
            {COPY[k].title}
          </Link>
        ))}
      </div>
      {filters(kind, active)}
      {data.items.length === 0 ? (
        <EmptyState title="还没有可入账的记录">台账只收原文写明确切要素的报告；随着新内容被分析，这里会自动长出来。</EmptyState>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-bg-sunk text-[12px] text-ink-3">
                <th className="px-3 py-2 font-medium">时间与标题</th>
                {HEAD[kind].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => (
                <Row key={row.id} kind={kind} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
      <footer className="mt-4 flex items-center justify-between text-[12px] text-ink-4">
        <span>共 {data.total} 条 · 第 {data.page} / {data.pageCount} 页</span>
        <span className="flex gap-3">
          {data.page > 1 ? (
            <Link to={pageHref(data.page - 1)} className="hover:text-ink">
              ← 上一页
            </Link>
          ) : null}
          {data.page < data.pageCount ? (
            <Link to={pageHref(data.page + 1)} className="hover:text-ink">
              下一页 →
            </Link>
          ) : null}
        </span>
      </footer>
    </div>
  );
}
