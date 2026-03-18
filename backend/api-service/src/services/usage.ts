import type { PrismaClient, Tier } from "@prisma/client";

const FREE_TIER_LIMIT = 25; // commands per month

export class UsageService {
  constructor(private db: PrismaClient) {}

  /**
   * Get current month key in "YYYY-MM" format.
   */
  private getCurrentMonth(): string {
    return new Date().toISOString().slice(0, 7);
  }

  /**
   * Check if user can execute a command.
   * Returns remaining count or throws if limit exceeded.
   */
  async checkLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    if (!user) {
      return { allowed: false, remaining: 0 };
    }

    // Pro users have unlimited usage
    if (user.tier === "PRO") {
      return { allowed: true, remaining: -1 }; // -1 = unlimited
    }

    const month = this.getCurrentMonth();
    const usage = await this.db.usage.findUnique({
      where: { userId_month: { userId, month } },
    });

    const used = usage?.commandCount ?? 0;
    const remaining = FREE_TIER_LIMIT - used;

    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
    };
  }

  /**
   * Increment command count for the current month.
   * Called after a command is successfully executed.
   */
  async recordUsage(userId: string): Promise<void> {
    const month = this.getCurrentMonth();

    await this.db.usage.upsert({
      where: { userId_month: { userId, month } },
      update: { commandCount: { increment: 1 } },
      create: { userId, month, commandCount: 1 },
    });
  }

  /**
   * Get usage stats for a user.
   */
  async getStats(userId: string) {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    const month = this.getCurrentMonth();
    const usage = await this.db.usage.findUnique({
      where: { userId_month: { userId, month } },
    });

    const used = usage?.commandCount ?? 0;

    return {
      tier: user?.tier ?? "FREE",
      month,
      used,
      limit: user?.tier === "PRO" ? null : FREE_TIER_LIMIT,
      remaining: user?.tier === "PRO" ? null : Math.max(0, FREE_TIER_LIMIT - used),
    };
  }
}
