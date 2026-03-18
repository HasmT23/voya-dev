import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@prisma/client";
import { AuthService, AuthError } from "../services/auth.js";
import { z } from "zod";

const GoogleLoginSchema = z.object({
  idToken: z.string().min(1, "Google ID token required"),
});

const RefreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token required"),
});

export function registerAuthRoutes(
  app: FastifyInstance,
  db: PrismaClient
): void {
  const auth = new AuthService(db);

  /**
   * POST /auth/google
   * Exchange Google ID token for Voya JWT pair.
   */
  app.post("/auth/google", async (request, reply) => {
    const parsed = GoogleLoginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const result = await auth.loginWithGoogle(parsed.data.idToken);
      return reply.code(200).send(result);
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.code(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  /**
   * POST /auth/refresh
   * Exchange refresh token for new access token.
   */
  app.post("/auth/refresh", async (request, reply) => {
    const parsed = RefreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const result = await auth.refreshAccessToken(parsed.data.refreshToken);
      return reply.code(200).send(result);
    } catch (err) {
      if (err instanceof AuthError) {
        return reply.code(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });
}
