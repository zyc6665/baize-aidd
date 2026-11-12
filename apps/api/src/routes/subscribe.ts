// Reader subscriptions: one POST to join, two GETs the mail's links land on. The GETs answer with a redirect
// to the page that explains what happened, so a click in a mail never shows raw JSON.
import type { FastifyInstance } from "fastify";
import { config } from "@aihot/backend/config";
import {
  SubscribeRejected, confirmSubscription, subscribe, unsubscribe,
} from "@aihot/backend/operations/subscription";
import { clientIp, sendProblem } from "../http/respond.ts";

const landed = (state: "confirmed" | "unsubscribed" | "unknown") => `${config.siteUrl}/subscribe?state=${state}`;

export function subscribeRoutes(app: FastifyInstance) {
  app.post("/api/site/subscribe", async (req, reply) => {
    const body = (req.body ?? {}) as { email?: unknown };
    try {
      const result = await subscribe({ email: body.email, ip: clientIp(req) });
      reply.header("cache-control", "no-store");
      return { status: result.status };
    } catch (error) {
      if (error instanceof SubscribeRejected) {
        return sendProblem(req, reply, {
          status: error.status,
          code: error.code,
          detail: error.message,
          retryAfter: error.retryAfter,
        });
      }
      return sendProblem(req, reply, { status: 503, code: "temporarily_unavailable", detail: "暂时无法订阅，请稍后再试。", retryAfter: 30 });
    }
  });

  app.get("/api/site/subscribe/confirm", async (req, reply) => {
    const token = String((req.query as { token?: string }).token ?? "");
    const email = await confirmSubscription(token);
    return reply.redirect(landed(email ? "confirmed" : "unknown"), 302);
  });

  app.get("/api/site/subscribe/unsubscribe", async (req, reply) => {
    const token = String((req.query as { token?: string }).token ?? "");
    const email = await unsubscribe(token);
    return reply.redirect(landed(email ? "unsubscribed" : "unknown"), 302);
  });
}
