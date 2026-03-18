import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

const TOKEN_BYTES = 32; // 256-bit tokens
const PAIRING_CODE_BYTES = 16; // 128-bit pairing codes

/**
 * Generate a cryptographically secure device token (256-bit).
 * Returns both the raw token (given to client once) and its hash (stored in DB).
 */
export function generateDeviceToken(): { token: string; tokenHash: string } {
  const token = randomBytes(TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(token);
  return { token, tokenHash };
}

/**
 * Generate a short-lived pairing code for QR display.
 * Returns the code and its hash.
 */
export function generatePairingCode(): { code: string; codeHash: string } {
  const code = randomBytes(PAIRING_CODE_BYTES).toString("base64url");
  const codeHash = hashToken(code);
  return { code, codeHash };
}

/**
 * Hash a token using SHA-256.
 * We never store raw tokens — only hashes.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Constant-time token comparison to prevent timing attacks.
 */
export function verifyTokenHash(token: string, storedHash: string): boolean {
  const tokenHash = hashToken(token);
  const tokenBuf = Buffer.from(tokenHash, "hex");
  const storedBuf = Buffer.from(storedHash, "hex");

  if (tokenBuf.length !== storedBuf.length) return false;
  return timingSafeEqual(tokenBuf, storedBuf);
}
