import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { registerDeviceRoutes } from "./routes/devices.js";
import type { PrismaClient } from "@prisma/client";

export async function buildServer(db: PrismaClient) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || "info",
    },
    trustProxy: true,
  });

  // CORS — only allow Voya origins
  await app.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || [
      "https://voya.dev",
      "http://localhost:3000",
    ],
    credentials: true,
  });

  // Global rate limiting
  await app.register(rateLimit, {
    max: 100,
    timeWindow: "1 minute",
  });

  // Health check (no auth required)
  app.get("/health", async () => ({ status: "ok", service: "registry" }));

  // Device routes
  registerDeviceRoutes(app, db);

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const code = (error as Record<string, unknown>).statusCode as number | undefined;

    if (code === 429) {
      return reply.code(429).send({
        error: "Too many requests. Please try again later.",
      });
    }

    return reply.code(code || 500).send({
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : (error as Error).message,
    });
  });

  return app;
}
