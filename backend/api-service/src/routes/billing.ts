import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { BillingService, BillingError } from "../services/billing.js";
import { requireAuth } from "./middleware.js";

export function registerBillingRoutes(
  app: FastifyInstance,
  db: PrismaClient
): void {
  const billing = new BillingService(db);

  /**
   * POST /billing/checkout
   * Create Stripe checkout session for Pro upgrade. Requires auth.
   */
  app.post("/billing/checkout", { onRequest: requireAuth }, async (request, reply) => {
    try {
      const result = await billing.createCheckoutSession(
        (request as any).userId,
        (request as any).email
      );
      return reply.code(200).send(result);
    } catch (err) {
      if (err instanceof BillingError) {
        return reply.code(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  /**
   * POST /billing/webhook
   * Stripe webhook — no auth, verified by Stripe signature.
   */
  app.post("/billing/webhook", {
    config: { rawBody: true },
  }, async (request, reply) => {
    const signature = request.headers["stripe-signature"] as string;
    if (!signature) {
      return reply.code(400).send({ error: "Missing Stripe signature." });
    }

    try {
      const result = await billing.handleWebhook(
        request.body as Buffer,
        signature
      );
      return reply.code(200).send(result);
    } catch {
      return reply.code(400).send({ error: "Webhook verification failed." });
    }
  });
}
