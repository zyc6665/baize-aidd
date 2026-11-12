// Subscriptions: a row is a request, not a consent. These tests hold the two things that make the list worth
// having — nobody is subscribed until the mailed link is clicked, and one click takes them off again — plus the
// rate limits that keep a script from filling the table.
import { tag } from "./setup.ts";
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { closeDb, sql } from "@aihot/backend/db";
import { stopBoss } from "@aihot/backend/jobs/queue";
import {
  SubscribeRejected, confirmSubscription, normalizeEmail, sendDailyDigest, subscribe, unsubscribe,
} from "@aihot/backend/operations/subscription";

const T = tag();
const address = (n: string) => `${n}-${T}@example.com`;

after(async () => {
  await sql`DELETE FROM subscribers WHERE email LIKE ${`%-${T}@example.com`}`;
  await stopBoss();
  await closeDb();
});

test("an address is trimmed and lower-cased, and obvious junk is refused", () => {
  assert.equal(normalizeEmail("  Reader@Example.COM "), "reader@example.com");
  for (const bad of ["", "reader", "reader@", "@example.com", "a b@example.com", "reader@@example.com"]) {
    assert.equal(normalizeEmail(bad), null, bad);
  }
});

test("a subscription starts unconfirmed, and the mailed link is the only way to confirm it", async () => {
  const email = address("confirm");
  await subscribe({ email, ip: null });
  const [row] = await sql<{ token: string; confirmed_at: Date | null }[]>`
    SELECT token, confirmed_at FROM subscribers WHERE email = ${email}`;
  assert.ok(row, "the row is written");
  assert.equal(row.confirmed_at, null, "writing an address is not consent");
  assert.match(row.token, /^[0-9a-f]{48}$/);

  assert.equal(await confirmSubscription(row.token), email);
  const [after] = await sql<{ confirmed_at: Date | null }[]>`
    SELECT confirmed_at FROM subscribers WHERE email = ${email}`;
  assert.ok(after.confirmed_at, "the click confirms");
});

test("asked twice in two minutes, the second request is refused instead of mailing again", async () => {
  const email = address("again");
  await subscribe({ email, ip: null });
  await assert.rejects(
    () => subscribe({ email, ip: null }),
    (error: unknown) => error instanceof SubscribeRejected && error.status === 429 && error.code === "too_soon",
  );
});

test("unsubscribing takes one click and needs no password", async () => {
  const email = address("leave");
  await subscribe({ email, ip: null });
  const [row] = await sql<{ token: string }[]>`SELECT token FROM subscribers WHERE email = ${email}`;
  await confirmSubscription(row.token);
  assert.equal(await unsubscribe(row.token), email);
  const [after] = await sql<{ unsubscribed_at: Date | null }[]>`
    SELECT unsubscribed_at FROM subscribers WHERE email = ${email}`;
  assert.ok(after.unsubscribed_at);
});

test("an unknown or malformed token changes nothing", async () => {
  assert.equal(await confirmSubscription("not-a-token"), null);
  assert.equal(await unsubscribe("f".repeat(48)), null);
});

test("a day with no issue sends nothing at all", async () => {
  const email = address("digest");
  await subscribe({ email, ip: null });
  const [row] = await sql<{ token: string }[]>`SELECT token FROM subscribers WHERE email = ${email}`;
  await confirmSubscription(row.token);
  // Far enough back that no daily exists for that date, so the run must skip rather than send an empty mail.
  const run = await sendDailyDigest(new Date("2020-01-02T00:00:00Z"));
  assert.ok(run.skipped, "no issue, no mail");
  assert.equal(run.sent, 0);
  const [after] = await sql<{ last_report_key: string | null }[]>`
    SELECT last_report_key FROM subscribers WHERE email = ${email}`;
  assert.equal(after.last_report_key, null, "skipping does not mark anyone as served");
});
