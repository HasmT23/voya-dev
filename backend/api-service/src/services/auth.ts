import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import type { PrismaClient } from "@prisma/client";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_ACCESS_EXPIRY = "15m";
const JWT_REFRESH_EXPIRY = "7d";

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export class AuthService {
  constructor(private db: PrismaClient) {}

  /**
   * Verify Google ID token from mobile app, create/find user, issue JWT pair.
   */
  async loginWithGoogle(idToken: string) {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      throw new AuthError("Invalid Google token.", 401);
    }

    // Upsert user — create if first login, update if returning
    const user = await this.db.user.upsert({
      where: { googleId: payload.sub },
      update: { name: payload.name, email: payload.email },
      create: {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name,
      },
    });

    const accessToken = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_ACCESS_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, type: "refresh" },
      JWT_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRY }
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tier: user.tier,
      },
    };
  }

  /**
   * Issue new access token from refresh token.
   */
  async refreshAccessToken(refreshToken: string) {
    try {
      const payload = jwt.verify(refreshToken, JWT_SECRET) as {
        userId: string;
        type: string;
      };

      if (payload.type !== "refresh") {
        throw new AuthError("Invalid refresh token.", 401);
      }

      const user = await this.db.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new AuthError("User not found.", 401);
      }

      const accessToken = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_ACCESS_EXPIRY }
      );

      return { accessToken };
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError("Invalid or expired refresh token.", 401);
    }
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}
