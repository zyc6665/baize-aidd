/* 靶点页 / 药物页：实体来自结构化卡片，页面只做两件事——把提到它的临床读出声列出来，把资产或技术里
   点名它的交易挂在下面。没有就留空，不推测“这个靶点应该还有哪些公司”。 */
import { Link } from "react-router";
import type { EntityKind, EntityListResponse, EntityPageResponse } from "@aihot/contracts/site";
import { SITE, subjectAfter } from "@aihot/site";
import { pageMeta } from "../../lib/seo";
import { EmptyState } from "../../components/ui/Page";
import { HEAD, Row } from "../tables/TablePage";

export const COPY: Record<EntityKind, { title: string; lead: string; path: string; rowNoun: string }> = {
  targets: {
    title: "靶点",
    lead: "按靶点看进展：哪些药物在读数、结果如何、期次与样本量。靶点名来自原文，同一靶点的不同写法会出现在不同条目里。",
    path: "/targets",
    rowNoun: "临床读出",
  },
  drugs: {
    title: "药物",
    lead: "按药物代号或商品名看进展：读数、适应症与终点。只收原文点名的药物，不做别名合并。",
    path: "/drugs",
    rowNoun: "临床读出",
  },
};

export function entityIndexMeta(kind: EntityKind, data: EntityListResponse | undefined) {
  const copy = COPY[kind];
  return pageMeta({
    title: `${copy.title}索引 — ${subjectAfter("AIDD", "台账")}`,
    description: `${SITE.name} 的${copy.title}索引：${copy.lead}${data ? ` 目前 ${data.items.length} 个。` : ""}`,
    path: copy.path,
    noindex: false,
  });
}

export function entityMeta(kind: EntityKind, data: EntityPageResponse | undefined) {
  const copy = COPY[kind];
  const name = data?.name ?? "该实体";
  return pageMeta({
    title: `${name}：最新进展与临床读出 — ${subjectAfter("AIDD", "台账")}`,
    description: `${SITE.name} 收录的与 ${name} 有关的${copy.rowNoun}：药物、适应症、期次、终点与结果，按时间倒序。`,
    path: `${copy.path}/${data?.slug ?? ""}`,
    noindex: false,
  });
}

export function EntityIndex({ kind, data }: { kind: EntityKind; data: EntityListResponse }) {
  const copy = COPY[kind];
  return (
    <div className="mx-auto max-w-[var(--page-max-wide)] px-4 pb-16 pt-6 lg:px-8">
      <header className="mb-6">
        <div className="text-[12px] uppercase tracking-wider text-accent-ink">{subjectAfter("AIDD", "台账")}</div>
        <h1 className="mt-1 text-[26px] font-semibold text-ink">{copy.title}索引</h1>
        <p className="mt-2 max-w-[70ch] text-[14px] leading-6 text-ink-3">{copy.lead}</p>
      </header>
      {data.items.length === 0 ? (
        <EmptyState title="还没有可索引的实体">实体来自结构化卡片；等有读出写明了靶点或药物名，这里会自动长出来。</EmptyState>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((e) => (
            <li key={e.slug}>
              <Link
                to={`${copy.path}/${encodeURIComponent(e.slug)}`}
                className="flex items-baseline justify-between gap-3 rounded-tile border border-line bg-surface px-3 py-2 hover:border-line-strong"
              >
                <span className="truncate text-[14px] font-medium text-ink">{e.name}</span>
                <span className="shrink-0 text-[12px] tabular-nums text-ink-4">{e.readouts} 条</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EntityDetail({ kind, data }: { kind: EntityKind; data: EntityPageResponse }) {
  const copy = COPY[kind];
  return (
    <div className="mx-auto max-w-[var(--page-max-wide)] px-4 pb-16 pt-6 lg:px-8">
      <nav className="mb-3 text-[12px] text-ink-4">
        <Link to={copy.path} className="hover:text-ink">
          {copy.title}索引
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-3">{data.name}</span>
      </nav>
      <header className="mb-5">
        <h1 className="text-[26px] font-semibold text-ink">{data.name}</h1>
        <p className="mt-2 max-w-[70ch] text-[14px] leading-6 text-ink-3">
          {data.readouts.length} 条临床读出{data.deals.length ? `，以及 ${data.deals.length} 笔点名它的交易` : ""}。按时间倒序，数字与结论照原文。
        </p>
      </header>

      {data.readouts.length === 0 ? (
        <EmptyState title="还没有读出">这个实体只出现在交易里，等有临床数据再列出来。</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-bg-sunk text-[12px] text-ink-3">
                <th className="px-3 py-2 font-medium">时间与标题</th>
                {HEAD.readouts.map((h) => (
                  <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.readouts.map((row) => (
                <Row key={row.id} kind="readouts" row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.deals.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-2 text-[15px] font-semibold text-ink">点名它的交易</h2>
          <ul className="space-y-1.5">
            {data.deals.map((row) => {
              const card = row.card as { kind?: string; amountText?: string | null; parties?: string[] };
              return (
                <li key={row.id} className="flex flex-wrap items-baseline gap-2 text-[13px]">
                  <Link to={`/items/${row.id}`} className="font-medium text-ink hover:text-accent-ink">
                    {row.title}
                  </Link>
                  <span className="text-ink-4">
                    {card.parties?.join(" × ") ?? ""}
                    {card.amountText ? ` · ${card.amountText}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
