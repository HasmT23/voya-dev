import type { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "";

export interface JWTPayload {
  userId: string;
  email: string;
}

/**
 * Fastify hook to verify JWT from Authorization header.
 * Attaches userId and email to request.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    reply.code(401).send({ error: "Missing or invalid authorization header." });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    (request as any).userId = payload.userId;
    (request as any).email = payload.email;
  } catch {
    reply.code(401).send({ error: "Invalid or expired token." });
  }
}
