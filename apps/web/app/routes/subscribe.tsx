import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { SITE } from "@aihot/site";
import { RingMark } from "@aihot/site/brand/Logo.tsx";
import { AsideCard, ReadingLayout, BackLink } from "../components/ui/Page";
import { Presence } from "../components/ui/Presence";
import { IconCheck, IconClose, IconRss, IconPlug } from "../components/icons";
import { edgeTtl } from "../lib/api.server";
import { pageMeta } from "../lib/seo";
import type { Screen } from "../components/shell/screens";

export const handle: Screen = { tab: "me", name: "订阅" };

export function headers() {
  return edgeTtl(300);
}

export function meta() {
  return pageMeta({
    title: "订阅",
    description: `订阅 ${SITE.name} 的每日简报：每天一封邮件，把当天 AIDD 里值得看的几条送到你的收件箱；也可以直接用 RSS 和 API。`,
    path: "/subscribe",
    image: "/og/pages/feedback.png",
  });
}

/** The mail's two links land here with a state; anything else is the form. */
const LANDED: Record<string, { title: string; body: string; good: boolean }> = {
  confirmed: {
    title: "订阅成功，明天早上开始",
    body: "每天 08:00 的日报发出后，你会收到一封邮件。不想再收到时，邮件底部有退订链接，点一下就好。",
    good: true,
  },
  unsubscribed: {
    title: "已退订",
    body: "这个地址不会再收到简报。想回来随时在下面重新填一次——要重新确认一次，是为了确认地址确实是你本人的。",
    good: true,
  },
  unknown: {
    title: "这个链接失效了",
    body: "确认链接 7 天内有效，退订链接只对已经确认过的地址有效。重新填一次邮箱就好。",
    good: false,
  },
};

const CHANNELS = [
  { label: "全部动态", href: "/feed.xml", note: "所有已发布条目" },
  { label: "日报", href: "/feed/daily.xml", note: "每天的摘要，一期一个" },
  { label: "分类", href: "/feed/category/models.xml", note: "把 models 换成 tools、clinical、deals、policy、industry、opinion" },
];

const field =
  "w-full rounded-card bg-well text-ink outline-none ring-1 ring-inset ring-line-soft transition-[background-color,box-shadow] placeholder:text-ink-4 hover:ring-line-strong focus:bg-surface focus:shadow-[0_0_0_3px_var(--accent-soft)] focus:ring-accent";

export default function SubscribePage() {
  const [params] = useSearchParams();
  const state = params.get("state") ?? "";
  const landed = LANDED[state];
  const [email, setEmail] = useState("");
  const [stage, setStage] = useState<{ kind: "idle" | "sending" | "sent" | "error"; message?: string }>({ kind: "idle" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStage({ kind: "sending" });
    try {
      const res = await fetch("/api/site/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) return setStage({ kind: "error", message: body.detail ?? "订阅没成功，稍后再试。" });
      setStage({ kind: "sent" });
    } catch {
      setStage({ kind: "error", message: "网络不太顺，稍后再试。" });
    }
  };

  return (
    <ReadingLayout
      aside={
        <>
          <AsideCard title="订阅会收到什么">
            <p className="text-[13px] leading-[1.75] text-ink-3">
              每天一封，内容就是当天日报：几条值得看的进展，带一句为什么值得看、原文链接。没有促销、没有转发抽奖，也不会因为你三天没点就换成别的邮件。
            </p>
          </AsideCard>
          <AsideCard title="邮件地址怎么用">
            <p className="text-[13px] leading-[1.75] text-ink-3">
              只用来发这一封摘要，用来确认你是本人、用来让你退订。不卖给任何人，不做画像，不发第三方广告。细节见
              <Link to="/privacy" className="text-accent hover:underline">
                隐私说明
              </Link>
              。
            </p>
          </AsideCard>
        </>
      }
    >
      <div className="mb-3">
        <BackLink to="/more">返回我的</BackLink>
      </div>
      <header>
        <h1 data-page-title="" className="text-[24px] font-semibold leading-[1.3] text-ink">
          订阅
        </h1>
        <p className="mt-2 text-[14.5px] leading-relaxed text-ink-3">
          每天 08:00，一份读完不费劲的 AIDD 摘要，用邮件送到你手上。不想留邮箱也没关系——下面的 RSS 和 API 是同一批内容。
        </p>
      </header>

      {landed && (
        <div className="card mt-6 px-6 py-8 text-center">
          <div
            className={`anim-pop-in mx-auto flex size-12 items-center justify-center rounded-full ${landed.good ? "bg-accent text-accent-contrast" : "bg-bg-muted text-ink-3"}`}
          >
            {landed.good ? <IconCheck size={22} /> : <IconClose size={22} />}
          </div>
          <h2 className="mt-5 text-[19px] font-semibold text-ink">{landed.title}</h2>
          <p className="mx-auto mt-2 max-w-[420px] text-[14px] leading-relaxed text-ink-3">{landed.body}</p>
        </div>
      )}

      {stage.kind === "sent" ? (
        <div className="card mt-6 px-6 py-8">
          <h2 className="text-[17px] font-semibold text-ink">确认信已发出</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-ink-3">
            去 <span className="font-medium text-ink-2">{email}</span> 收一下，点里面的确认链接才算订阅成功。七分钟内没收到就看一眼垃圾邮件，或者换个地址再试。
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="card mt-6 overflow-hidden">
          <div className="p-5 sm:p-6">
            <label htmlFor="sub-email" className="mb-2 block text-[13px] font-semibold text-ink">
              邮箱
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="sub-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`${field} h-11 px-4 text-[16px] sm:text-[14.5px]`}
              />
              <button
                type="submit"
                disabled={stage.kind === "sending" || !email.trim()}
                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-6 text-[14px] font-medium text-accent-contrast transition-[background-color,opacity] hover:bg-accent-ink disabled:bg-line-strong disabled:text-ink-4"
              >
                {stage.kind === "sending" && <RingMark className="size-4" spinning />}
                订阅
              </button>
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-4">
              提交后你会收到一封确认邮件，点开里面的链接才真正订阅上；不点就什么都不会发。
            </p>
            <Presence show={stage.kind === "error"} enter="anim-notice-in" exit="anim-fade-out" duration={160}>
              <p role="alert" className="mt-3 rounded-tile bg-hot-soft px-3.5 py-2.5 text-[13px] text-hot">
                {stage.kind === "error" ? stage.message : ""}
              </p>
            </Presence>
          </div>
        </form>
      )}

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <IconRss size={16} className="text-ink-4" />
          不用邮件的话
        </h2>
        <ul className="card mt-3 divide-y divide-line-soft overflow-hidden">
          {CHANNELS.map((c) => (
            <li key={c.href}>
              <a href={c.href} className="flex min-h-[52px] items-center gap-3 px-4 transition-colors hover:bg-bg-sunk">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-ink">{c.label}</span>
                  <span className="mt-0.5 block truncate text-[12px] text-ink-4">{c.note}</span>
                </span>
                <span className="mono shrink-0 text-[11.5px] text-ink-4">{c.href}</span>
              </a>
            </li>
          ))}
          <li>
            <Link to="/agent" className="flex min-h-[52px] items-center gap-3 px-4 transition-colors hover:bg-bg-sunk">
              <IconPlug size={18} className="text-ink-4" />
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-medium text-ink">API 与 MCP</span>
                <span className="mt-0.5 block text-[12px] text-ink-4">让自己的 agent 直接读，不用经过邮件</span>
              </span>
            </Link>
          </li>
        </ul>
      </section>
    </ReadingLayout>
  );
}
