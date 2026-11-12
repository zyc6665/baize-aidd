import { SITE } from "@aihot/site";
import type { Route } from "./+types/followups";
import type { AdminFollowUps } from "@aihot/contracts/admin";
import { adminGet } from "../../lib/admin.server";
import { ago, bj } from "../../features/admin/format";
import { AdminPage, Badge, Card, Empty, Stat } from "../../features/admin/ui";

export async function loader({ request }: Route.LoaderArgs) {
  return adminGet<AdminFollowUps>(request, "/api/admin/followups");
}

export const meta: Route.MetaFunction = () => [{ title: `待跟进 · ${SITE.name} 后台` }];

const LEVEL: Record<string, { label: string; tone: "bad" | "warn" | "muted" }> = {
  now: { label: "读者现在就受影响", tone: "bad" },
  today: { label: "今天要处理", tone: "warn" },
  later: { label: "可以等", tone: "muted" },
};

/**
 * The same list the 09:00 digest would send, shown here so a site without a chat channel still sees it:
 * what broke, who it hurts, and what the owner has to do. Ordered by how soon it matters.
 */
export default function FollowUpsAdmin({ loaderData }: Route.ComponentProps) {
  const order = ["now", "today", "later"] as const;
  const items = [...loaderData.items].sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));
  const urgent = items.filter((i) => i.level !== "later").length;

  return (
    <AdminPage title="待跟进" subtitle={<>系统自己发现的问题，按「现在」「今天」「可以等」排。09:00 的日报发的是同一份清单；没有配飞书或 webhook 时，只有这一页能看到。最近检查 {bj(loaderData.checkedAt)}</>}>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="全部" value={items.length} hint="已经关掉的不算" />
        <Stat label="现在或今天" value={urgent} tone={urgent ? "warn" : "ok"} hint="读者受影响，或今天就得动手" />
        <Stat label="可以等" value={items.length - urgent} hint="不影响读者，攒着一起处理" />
      </div>
      {items.length === 0 ? (
        <Card>
          <Empty>没有待跟进的事项：采集、判分、投递、备份都按预期跑着。</Empty>
        </Card>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => {
            const level = LEVEL[item.level] ?? LEVEL.later!;
            return (
              <li key={item.key} className="card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={level.tone}>{level.label}</Badge>
                  <span className="text-[15px] font-semibold text-ink">{item.title}</span>
                  <span className="ml-auto text-[12px] text-ink-4">{ago(item.since)}前就有</span>
                </div>
                {item.impact && <p className="mt-2 text-[13px] leading-[1.7] text-ink-2">影响：{item.impact}</p>}
                {item.action && <p className="mt-1 text-[13px] leading-[1.7] text-ink-2">要做的：{item.action}</p>}
                {item.detail && <p className="mt-1 font-mono text-[11.5px] leading-[1.6] text-ink-4">{item.detail}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </AdminPage>
  );
}
