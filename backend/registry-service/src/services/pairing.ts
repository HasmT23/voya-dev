import { PrismaClient, PairingStatus } from "@prisma/client";
import {
  generateDeviceToken,
  generatePairingCode,
  hashToken,
} from "../utils/crypto.js";
import { generateQRDataURL } from "../utils/qrcode.js";
import type { InitiatePairingInput } from "../schemas/devices.js";

const PAIRING_EXPIRY_MINUTES = 5;

export class PairingService {
  constructor(private db: PrismaClient) {}

  /**
   * Step 1: Desktop initiates pairing.
   * Creates a temporary pairing request and returns a QR code.
   */
  async initiatePairing(userId: string, input: InitiatePairingInput) {
    // Clean up any expired pairing requests for this user
    await this.db.pairingRequest.deleteMany({
      where: {
        userId,
        expiresAt: { lt: new Date() },
      },
    });

    // Limit active pairing requests per user (prevent flooding)
    const activeCount = await this.db.pairingRequest.count({
      where: {
        userId,
        status: PairingStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    if (activeCount >= 3) {
      throw new PairingError(
        "Too many active pairing requests. Wait for existing ones to expire.",
        429
      );
    }

    const { code, codeHash } = generatePairingCode();
    const expiresAt = new Date(
      Date.now() + PAIRING_EXPIRY_MINUTES * 60 * 1000
    );

    await this.db.pairingRequest.create({
      data: {
        code,
        codeHash,
        deviceName: input.deviceName,
        deviceType: input.deviceType,
        userId,
        expiresAt,
      },
    });

    const serverUrl = process.env.API_BASE_URL || "https://api.voya.dev";

    const qrDataUrl = await generateQRDataURL({
      code,
      server: serverUrl,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      qrDataUrl,
      expiresAt: expiresAt.toISOString(),
      expiresInSeconds: PAIRING_EXPIRY_MINUTES * 60,
    };
  }

  /**
   * Step 2: Mobile scans QR code and confirms pairing.
   * Validates the code, creates the device, and returns a device token.
   * The raw token is returned ONCE — we only store its hash.
   */
  async confirmPairing(userId: string, code: string) {
    const codeHash = hashToken(code);

    const request = await this.db.pairingRequest.findUnique({
      where: { codeHash },
    });

    if (!request) {
      throw new PairingError("Invalid pairing code.", 400);
    }

    if (request.status !== PairingStatus.PENDING) {
      throw new PairingError("Pairing code already used.", 400);
    }

    if (request.expiresAt < new Date()) {
      await this.db.pairingRequest.update({
        where: { id: request.id },
        data: { status: PairingStatus.EXPIRED },
      });
      throw new PairingError("Pairing code expired.", 400);
    }

    // Both users must be the same (the one who initiated and the one confirming)
    if (request.userId !== userId) {
      throw new PairingError("Pairing code does not belong to this account.", 403);
    }

    // Generate the device token
    const { token, tokenHash } = generateDeviceToken();

    // Create device and mark pairing as completed in a transaction
    const device = await this.db.$transaction(async (tx) => {
      await tx.pairingRequest.update({
        where: { id: request.id },
        data: { status: PairingStatus.COMPLETED },
      });

      return tx.device.create({
        data: {
          name: request.deviceName,
          type: request.deviceType,
          tokenHash,
          userId,
        },
      });
    });

    return {
      deviceId: device.id,
      deviceName: device.name,
      deviceType: device.type,
      token, // Only time the raw token is exposed
    };
  }

  /**
   * Verify a device token is valid.
   * Used by other services to authenticate device connections.
   */
  async verifyToken(token: string) {
    const tokenHash = hashToken(token);

    const device = await this.db.device.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!device) {
      return null;
    }

    // Update last seen timestamp
    await this.db.device.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });

    return {
      deviceId: device.id,
      deviceName: device.name,
      deviceType: device.type,
      userId: device.user.id,
      userEmail: device.user.email,
    };
  }

  /**
   * List all devices for a user.
   */
  async listDevices(userId: string) {
    return this.db.device.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        type: true,
        lastSeenAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Remove a device (unpair).
   */
  async removeDevice(userId: string, deviceId: string) {
    const device = await this.db.device.findUnique({
      where: { id: deviceId },
    });

    if (!device || device.userId !== userId) {
      throw new PairingError("Device not found.", 404);
    }

    await this.db.device.delete({ where: { id: deviceId } });
    return { success: true };
  }
}

export class PairingError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "PairingError";
  }
}
