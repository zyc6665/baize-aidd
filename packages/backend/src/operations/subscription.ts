// Reader subscriptions: one address, one confirmation link, one email a day.
//
// Two things this deliberately is not: it is not a newsletter platform (no lists, no drafts, no editor — the
// mail is the page's own daily issue, rendered to text and a few links), and it does not send anything without
// an explicit click in a mail the reader asked for. A subscription row therefore starts unconfirmed, and the
// only way a row gets a `confirmed_at` is the confirm link.
//
// Mail goes out through an HTTP endpoint (MAIL_API_URL / MAIL_API_KEY / MAIL_FROM) so any transactional mail
// service works without a dependency. Without those three, "sending" writes the message to <dataDir>/mail —
// enough to walk the whole flow locally, and loud enough in the alert when someone forgets to configure it.
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { ReportDetail } from "@aihot/contracts/site";
import { beijingDate } from "@aihot/contracts/time";
import { config } from "../config.ts";
import { sql } from "../db.ts";
import { loadReport } from "../publication/reports.ts";

/** A refusal the route turns into a problem document; never a silent no-op on the reader's side. */
export class SubscribeRejected extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfter?: number;

  constructor(status: number, code: string, message: string, retryAfter?: number) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

const EMAIL = /^[^\s@"()[\],:;<>\\]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** Lower-cased, trimmed address, or null when it is obviously not one. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 6 || email.length > 254) return null;
  return EMAIL.test(email) ? email : null;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface MailResult {
  delivered: boolean;
  via: "api" | "file";
  detail: string;
}

/** Send one message: through the configured endpoint, or into the local outbox when nothing is configured. */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  const { mailApiUrl, mailApiKey, mailFrom } = config;
  if (!mailApiUrl || !mailApiKey || !mailFrom) {
    const dir = path.join(config.dataDir, "mail");
    mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}-${message.to.replace(/[^\w.@-]+/g, "_")}.json`);
    writeFileSync(file, JSON.stringify({ ...message, from: mailFrom ?? "unconfigured", at: new Date().toISOString() }, null, 2));
    return { delivered: false, via: "file", detail: file };
  }
  const res = await fetch(mailApiUrl, {
    method: "POST",
    redirect: "error",
    headers: { "content-type": "application/json", authorization: `Bearer ${mailApiKey}` },
    body: JSON.stringify({ from: mailFrom, to: message.to, subject: message.subject, text: message.text, html: message.html }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`mail endpoint answered HTTP ${res.status}`);
  return { delivered: true, via: "api", detail: `HTTP ${res.status}` };
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function shell(title: string, body: string): string {
  return [
    `<!doctype html><html><body style="margin:0;padding:24px;background:#faf8f3;color:#1c2a26;font:15px/1.7 -apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans SC',sans-serif">`,
    `<div style="max-width:640px;margin:0 auto">`,
    `<p style="margin:0 0 18px;font-size:13px;color:#4c6b5f">白泽智药 · ${escapeHtml(title)}</p>`,
    body,
    `</div></body></html>`,
  ].join("");
}

/** The confirm mail: one link, and a sentence saying what happens if it was not them. */
function confirmMail(email: string, token: string) {
  const url = `${config.mailPublicUrl}/subscribe/confirm?token=${encodeURIComponent(token)}`;
  const text = [
    "有人（希望是你）在白泽智药用这个地址订阅了每日简报。",
    "",
    "点这个链接确认，明天早上八点开始，每天一封：",
    url,
    "",
    "不是你点的就忽略这封邮件，地址不会被加入名单。",
    `确认链接发出后 7 天内有效；之后想再订阅，在 ${config.mailPublicUrl}/subscribe 重新填一次。`,
  ].join("\n");
  const html = shell(
    "确认订阅",
    `<p>有人（希望是你）用这个地址订阅了每日简报。</p>
     <p style="margin:24px 0"><a href="${url}" style="background:#1f5a4a;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none">确认订阅</a></p>
     <p style="font-size:13px;color:#55645e">链接 7 天内有效。不是你点的就忽略这封邮件，地址不会被加入名单。</p>`,
  );
  return { to: email, subject: "确认订阅白泽智药每日简报", text, html } satisfies MailMessage;
}

/** Today's issue as mail: the title, the lead, every section's entries, and an unsubscribe link. */
function digestMail(email: string, token: string, report: ReportDetail) {
  const base = config.mailPublicUrl;
  const article = (itemId: string | null) => (itemId ? `${base}/items/${itemId}` : null);
  const lines: string[] = [report.title, ""];
  if (report.lead) lines.push(report.lead.leadParagraph, "");
  else if (report.overview) lines.push(report.overview, "");
  for (const section of report.sections) {
    lines.push(`【${section.label}】`);
    if (section.summary) lines.push(section.summary);
    for (const item of section.items) {
      if (!item.available) continue;
      const link = article(item.itemId);
      lines.push(`· ${item.title}${link ? ` — ${link}` : ""}`);
    }
    lines.push("");
  }
  const unsubscribe = `${base}/subscribe/unsubscribe?token=${encodeURIComponent(token)}`;
  lines.push(`本期：${base}/daily/${report.key}`);
  lines.push(`不想再收到：${unsubscribe}`);
  const html = shell(
    report.title,
    [
      `<h1 style="font-size:21px;line-height:1.4;margin:0 0 14px">${escapeHtml(report.title)}</h1>`,
      report.lead
        ? `<p style="margin:0 0 22px">${escapeHtml(report.lead.leadParagraph)}</p>`
        : report.overview
          ? `<p style="margin:0 0 22px">${escapeHtml(report.overview)}</p>`
          : "",
      ...report.sections.map((section) =>
        [
          `<h2 style="font-size:15px;margin:26px 0 8px;color:#1f5a4a">${escapeHtml(section.label)}</h2>`,
          section.summary ? `<p style="margin:0 0 10px;color:#2b3a35">${escapeHtml(section.summary)}</p>` : "",
          ...section.items
            .filter((item) => item.available)
            .map((item) => {
              const link = article(item.itemId);
              const title = escapeHtml(item.title);
              return `<p style="margin:0 0 8px">${link ? `<a href="${link}" style="color:#17473a">${title}</a>` : title}<span style="color:#616f69;font-size:13px"> — ${escapeHtml(item.sourceName)}</span></p>`;
            }),
        ].join(""),
      ),
      `<p style="margin:28px 0 0;padding-top:14px;border-top:1px solid #e0e2d9;font-size:12px;color:#616f69">`,
      `<a href="${base}/daily/${report.key}" style="color:#4c6b5f">在网页上读这一期</a> · `,
      `<a href="${unsubscribe}" style="color:#4c6b5f">不想再收到</a>`,
      `</p>`,
    ].join(""),
  );
  return { to: email, subject: report.title, text: lines.join("\n"), html } satisfies MailMessage;
}

/** New or returning subscriber: (re)issue a token and mail the confirm link. */
export async function subscribe(input: { email: unknown; ip: string | null }): Promise<{ status: "pending" | "already"; email: string }> {
  const email = normalizeEmail(input.email);
  if (!email) throw new SubscribeRejected(400, "invalid_email", "这个地址看起来不像邮箱，检查一下再提交。");
  const [recent] = await sql<{ n: number }[]>`
    SELECT count(*)::int AS n FROM subscribers WHERE email = ${email} AND updated_at > now() - interval '2 minutes'`;
  if (recent && recent.n > 0) {
    throw new SubscribeRejected(429, "too_soon", "刚刚已经发过一封确认信，等两分钟再试。", 120);
  }
  if (input.ip) {
    const [byIp] = await sql<{ n: number }[]>`
      SELECT count(*)::int AS n FROM subscribers WHERE request_ip = ${input.ip} AND created_at > now() - interval '1 hour'`;
    if (byIp && byIp.n >= 5) throw new SubscribeRejected(429, "too_many", "这个网络今天订阅得有点多，稍后再试。", 600);
  }
  const token = randomBytes(24).toString("hex");
  const rows = await sql<{ confirmed: boolean }[]>`
    INSERT INTO subscribers (email, token, request_ip)
    VALUES (${email}, ${token}, ${input.ip})
    ON CONFLICT (email) DO UPDATE
      SET token = excluded.token, request_ip = excluded.request_ip,
          confirmed_at = NULL, unsubscribed_at = NULL, updated_at = now()
    RETURNING (confirmed_at IS NOT NULL) AS confirmed
  `;
  await sendMail(confirmMail(email, token));
  return { status: rows.length ? "pending" : "already", email };
}

/** The click in the confirm mail: the only place a row becomes confirmed. */
export async function confirmSubscription(token: string): Promise<string | null> {
  if (!/^[0-9a-f]{24,64}$/.test(token)) return null;
  const [row] = await sql<{ email: string }[]>`
    UPDATE subscribers SET confirmed_at = now(), unsubscribed_at = NULL, updated_at = now()
    WHERE token = ${token} AND created_at > now() - interval '7 days'
    RETURNING email
  `;
  return row?.email ?? null;
}

/** One click, no questions: the token in the mail is the whole authority. */
export async function unsubscribe(token: string): Promise<string | null> {
  if (!/^[0-9a-f]{24,64}$/.test(token)) return null;
  const [row] = await sql<{ email: string }[]>`
    UPDATE subscribers SET unsubscribed_at = now(), updated_at = now()
    WHERE token = ${token} RETURNING email
  `;
  return row?.email ?? null;
}

export interface DigestRun {
  key: string;
  sent: number;
  failed: number;
  skipped: string | null;
}

/**
 * Send today's issue to everyone confirmed. Skips silently when today's daily does not exist yet (the worker
 * runs after the 08:00 compose): a digest that is one issue behind is worse than no digest that morning.
 */
export async function sendDailyDigest(now = new Date()): Promise<DigestRun> {
  const key = beijingDate(now);
  const report = await loadReport("daily", key);
  if (!report) return { key, sent: 0, failed: 0, skipped: "no daily issue for today yet" };
  const rows = await sql<{ email: string; token: string }[]>`
    SELECT email, token FROM subscribers
    WHERE confirmed_at IS NOT NULL AND unsubscribed_at IS NULL AND last_report_key IS DISTINCT FROM ${key}
    ORDER BY created_at LIMIT 5000
  `;
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await sendMail(digestMail(row.email, row.token, report));
      await sql`UPDATE subscribers SET last_report_key = ${key}, updated_at = now() WHERE email = ${row.email}`;
      sent += 1;
    } catch {
      failed += 1;
    }
  }
  return { key, sent, failed, skipped: null };
}
