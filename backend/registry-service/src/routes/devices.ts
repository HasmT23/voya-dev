import type { FastifyInstance } from "fastify";
import { PairingService, PairingError } from "../services/pairing.js";
import { requireAuth } from "../middleware/auth.js";
import {
  InitiatePairingSchema,
  ConfirmPairingSchema,
  VerifyTokenSchema,
} from "../schemas/devices.js";
import type { PrismaClient } from "@prisma/client";

export function registerDeviceRoutes(
  app: FastifyInstance,
  db: PrismaClient
): void {
  const pairing = new PairingService(db);

  /**
   * POST /devices/pair/initiate
   * Desktop calls this to start pairing. Returns QR code data URL.
   */
  app.post("/devices/pair/initiate", { onRequest: requireAuth }, async (request, reply) => {
    const parsed = InitiatePairingSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const result = await pairing.initiatePairing(
        (request as any).userId,
        parsed.data
      );
      return reply.code(201).send(result);
    } catch (err) {
      if (err instanceof PairingError) {
        return reply.code(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  /**
   * POST /devices/pair/confirm
   * Mobile calls this after scanning QR. Returns the device token (once).
   */
  app.post("/devices/pair/confirm", { onRequest: requireAuth }, async (request, reply) => {
    const parsed = ConfirmPairingSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    try {
      const result = await pairing.confirmPairing(
        (request as any).userId,
        parsed.data.code
      );
      return reply.code(200).send(result);
    } catch (err) {
      if (err instanceof PairingError) {
        return reply.code(err.statusCode).send({ error: err.message });
      }
      throw err;
    }
  });

  /**
   * POST /devices/verify
   * Internal endpoint — other services verify device tokens here.
   * No JWT auth required — authenticated by device token.
   */
  app.post("/devices/verify", async (request, reply) => {
    const parsed = VerifyTokenSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const device = await pairing.verifyToken(parsed.data.token);
    if (!device) {
      return reply.code(401).send({ error: "Invalid device token." });
    }

    return reply.code(200).send(device);
  });

  /**
   * GET /devices
   * List all paired devices for the authenticated user.
   */
  app.get("/devices", { onRequest: requireAuth }, async (request, reply) => {
    const devices = await pairing.listDevices((request as any).userId);
    return reply.code(200).send({ devices });
  });

  /**
   * DELETE /devices/:deviceId
   * Unpair a device.
   */
  app.delete<{ Params: { deviceId: string } }>(
    "/devices/:deviceId",
    { onRequest: requireAuth },
    async (request, reply) => {
      try {
        const result = await pairing.removeDevice(
          (request as any).userId,
          request.params.deviceId
        );
        return reply.code(200).send(result);
      } catch (err) {
        if (err instanceof PairingError) {
          return reply.code(err.statusCode).send({ error: err.message });
        }
        throw err;
      }
    }
  );
}
