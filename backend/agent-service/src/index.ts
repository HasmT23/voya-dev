import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { generatePlan } from "./planner.js";
import { z } from "zod";

const PORT = parseInt(process.env.PORT || "3003", 10);
const HOST = process.env.HOST || "0.0.0.0";

const PlanRequestSchema = z.object({
  userId: z.string().min(1),
  text: z.string().min(1).max(1000),
  requestId: z.string().uuid(),
});

async function main() {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL || "info" },
    trustProxy: true,
  });

  await app.register(cors, {
    origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:*"],
    credentials: true,
  });

  await app.register(rateLimit, {
    max: 50,
    timeWindow: "1 minute",
  });

  app.get("/health", async () => ({ status: "ok", service: "agent" }));

  /**
   * POST /plan
   * Takes natural language text, returns an action plan.
   * Called internally by ws-service.
   */
  app.post("/plan", async (request, reply) => {
    const parsed = PlanRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const plan = await generatePlan(parsed.data.text, parsed.data.requestId);
      return reply.code(200).send(plan);
    } catch (err) {
      app.log.error(err);
      return reply.code(500).send({ error: "Failed to generate action plan." });
    }
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const code = (error as Record<string, unknown>).statusCode as number | undefined;
    return reply.code(code || 500).send({
      error: process.env.NODE_ENV === "production"
        ? "Internal server error"
        : (error as Error).message,
    });
  });

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`Agent service running on ${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  const shutdown = async () => {
    console.log("Shutting down...");
    await app.close();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main();
