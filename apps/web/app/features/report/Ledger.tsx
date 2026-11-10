import { Link } from "react-router";
import type { ReportLedger } from "@aihot/contracts/site";

/** 亿元/万美元 写法与服务端一致：只用于「合计」一行，明细仍用卡片原话。 */
function usd(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value >= 1e8) return `${(value / 1e8).toFixed(value >= 1e9 ? 0 : 1).replace(/\.0$/, "")} 亿美元`;
  return `${Math.round(value / 1e4).toLocaleString("en-US")} 万美元`;
}

function Block({ title, figure, lines }: { title: string; figure: string; lines: ReportLedger["deals"]["items"] }) {
  if (!lines.length) return null;
  return (
    <div className="border-b border-line py-5 last:border-b-0">
      <h3 className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[15px] font-semibold text-ink">
        {title}
        <span className="text-[13px] font-normal text-ink-3">{figure}</span>
      </h3>
      <ul className="mt-3 space-y-2">
        {lines.map((line) => (
          <li key={line.itemId} className="text-[14.5px] leading-[1.7] text-ink-2">
            <Link viewTransition to={`/items/${line.itemId}`} className="text-ink transition-colors hover:text-accent">
              {line.title}
            </Link>
            {line.detail && <span className="ml-2 text-[13px] text-ink-3">{line.detail}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 一期周报或月报的台账：这一段时间里抽到的交易、临床读出和模型卡，按规则数好。
 * 数字来自卡片本身，不是写手写的，所以可以逐条回到条目核对。
 */
export function LedgerPage({ id, no, ledger }: { id: string; no: number; ledger: ReportLedger }) {
  const money = usd(ledger.deals.namedUsd);
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-[calc(var(--bar-h)+1.5rem)] pt-12 @[880px]:pt-16">
      <header className="flex items-baseline gap-3 border-b border-line-strong pb-3 @[880px]:gap-4">
        <span className="font-mono text-[12px] text-ink-4">{String(no).padStart(2, "0")}</span>
        <h2 id={`${id}-t`} className="text-[19px] font-semibold tracking-tight text-ink @[880px]:text-[21px]">
          台账
        </h2>
        <span className="ml-auto text-[12.5px] text-ink-4">按条目里的数字数出来的</span>
      </header>
      <p className="border-b border-line py-5 text-[15.5px] leading-[1.9] text-ink-2 @[560px]:text-justify">
        这一期的交易、临床读出和模型卡，都记在这三张表里：点标题回到原文，数字以原文为准。
      </p>
      <Block
        title="交易"
        figure={[`${ledger.deals.count} 笔`, money ? `披露金额合计 ${money}` : ""].filter(Boolean).join("，")}
        lines={ledger.deals.items}
      />
      <Block
        title="临床读出"
        figure={[
          `${ledger.readouts.count} 条`,
          ledger.readouts.positive ? `达到终点 ${ledger.readouts.positive}` : "",
          ledger.readouts.negative ? `未达到 ${ledger.readouts.negative}` : "",
          ledger.readouts.mixed ? `结果不一 ${ledger.readouts.mixed}` : "",
        ].filter(Boolean).join("，")}
        lines={ledger.readouts.items}
      />
      <Block
        title="模型"
        figure={[
          `${ledger.models.count} 个`,
          ledger.models.open ? `开源权重 ${ledger.models.open}` : "",
          ledger.models.restricted ? `受限制 ${ledger.models.restricted}` : "",
        ].filter(Boolean).join("，")}
        lines={ledger.models.items}
      />
    </section>
  );
}
