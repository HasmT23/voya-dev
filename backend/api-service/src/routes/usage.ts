import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { UsageService } from "../services/usage.js";
import { requireAuth } from "./middleware.js";

export function registerUsageRoutes(
  app: FastifyInstance,
  db: PrismaClient
): void {
  const usage = new UsageService(db);

  app.addHook("onRequest", requireAuth);

  /**
   * GET /usage
   * Get current usage stats for the authenticated user.
   */
  app.get("/usage", async (request, reply) => {
    const stats = await usage.getStats((request as any).userId);
    return reply.code(200).send(stats);
  });

  /**
   * GET /usage/check
   * Quick check if user can execute a command.
   */
  app.get("/usage/check", async (request, reply) => {
    const result = await usage.checkLimit((request as any).userId);
    return reply.code(200).send(result);
  });
}
