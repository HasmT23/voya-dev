import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerUsageRoutes } from "./routes/usage.js";
import { registerBillingRoutes } from "./routes/billing.js";
import type { PrismaClient } from "@prisma/client";

export async function buildServer(db: PrismaClient) {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL || "info" },
    trustProxy: true,
  });

  await app.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "https://voya.dev",
      "http://localhost:3000",
    ],
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  app.get("/health", async () => ({ status: "ok", service: "api" }));

  registerAuthRoutes(app, db);
  registerUsageRoutes(app, db);
  registerBillingRoutes(app, db);

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const code = (error as Record<string, unknown>).statusCode as number | undefined;
    if (code === 429) {
      return reply.code(429).send({ error: "Too many requests." });
    }
    return reply.code(code || 500).send({
      error: process.env.NODE_ENV === "production"
        ? "Internal server error"
        : (error as Error).message,
    });
  });

  return app;
}
