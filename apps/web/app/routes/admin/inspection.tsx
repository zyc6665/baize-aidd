import { SITE } from "@aihot/site";
import { Link } from "react-router";
import type { Route } from "./+types/inspection";
import type { AdminInspection } from "@aihot/contracts/admin";
import { adminGet } from "../../lib/admin.server";
import { AdminPage, Card, DataTable, Empty, Stat } from "../../features/admin/ui";

export async function loader({ request }: Route.LoaderArgs) {
  return adminGet<AdminInspection>(request, "/api/admin/inspection?days=14");
}

export const meta: Route.MetaFunction = () => [{ title: `巡检 · ${SITE.name} 后台` }];

const n = (value: number) => value.toLocaleString("zh-CN");

/**
 * Daily inspection: one row per Beijing day. Today is still filling up, so its row is thinner than the rest —
 * the averages at the top leave it out. A number that slides for three days in a row is the thing to look at.
 */
export default function InspectionAdmin({ loaderData }: Route.ComponentProps) {
  const { days, averages } = loaderData;
  const today = days[0] ?? null;
  const yesterday = days[1] ?? null;
  const drop = yesterday && today ? yesterday.collected - today.collected : 0;

  return (
    <AdminPage
      title="巡检"
      subtitle={<>每天进了多少、判了多少、发了多少、哪张卡填上了、付费请求失败几次。今天还在跑，平均值不算今天。</>}
    >
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="每天新进" value={averages.collected} hint={`最近 ${loaderData.window} 天平均`} />
        <Stat label="每天判分" value={averages.judged} hint={`过筛 ${today ? n(today.passed) : "—"} 条（今天）`} />
        <Stat label="每天精选" value={averages.selected} hint={`发布 ${averages.published} 条/天`} />
        <Stat
          label="今天新进"
          value={today?.collected ?? 0}
          tone={drop > 0 ? "warn" : undefined}
          hint={drop > 0 ? `比昨天少 ${n(drop)} 条` : "与昨天持平或更多"}
        />
      </div>

      <Card>
        {days.length === 0 ? (
          <Empty>还没有可统计的天数。</Empty>
        ) : (
          <DataTable
            dense
            rows={days}
            rowKey={(d) => d.day}
            columns={[
              { key: "day", label: "日期", render: (d) => <span className="font-mono text-[12.5px] text-ink-2">{d.day}</span> },
              { key: "collected", label: "新进", align: "right", render: (d) => n(d.collected) },
              { key: "judged", label: "判分", align: "right", render: (d) => n(d.judged) },
              {
                key: "passed",
                label: "过筛",
                align: "right",
                render: (d) => (
                  <span className="text-ink-2">
                    {n(d.passed)}
                    {d.judged > 0 && <span className="ml-1 text-[11.5px] text-ink-4">{Math.round((d.passed / d.judged) * 100)}%</span>}
                  </span>
                ),
              },
              { key: "selected", label: "精选", align: "right", render: (d) => n(d.selected) },
              { key: "published", label: "发布", align: "right", render: (d) => n(d.published) },
              {
                key: "cards",
                label: "卡片 交易·读出·模型",
                align: "right",
                render: (d) => (
                  <span className="font-mono text-[12.5px] text-ink-2">
                    {d.deals} · {d.readouts} · {d.models}
                  </span>
                ),
              },
              { key: "receipts", label: "付费请求", align: "right", render: (d) => n(d.receipts) },
              {
                key: "failed",
                label: "失败",
                align: "right",
                render: (d) => (d.failed > 0 ? <span className="font-medium text-hot">{n(d.failed)}</span> : <span className="text-ink-4">0</span>),
              },
            ]}
          />
        )}
      </Card>

      <p className="mt-4 text-[12.5px] leading-[1.7] text-ink-4">
        某个信源停了、模型开始拒绝、卡片突然不填了，都会先在「新进」「判分」「卡片」这几列掉下来。对着{" "}
        <Link to="/admin/followups" className="text-accent-ink underline decoration-line-strong underline-offset-2">
          待跟进
        </Link>{" "}
        一起看：那边说坏在哪，这边说坏了多久。
      </p>
    </AdminPage>
  );
}
