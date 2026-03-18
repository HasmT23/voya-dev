import Stripe from "stripe";
import type { PrismaClient } from "@prisma/client";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-01-27.acacia",
});

const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID || "";

export class BillingService {
  constructor(private db: PrismaClient) {}

  /**
   * Create a Stripe checkout session for Pro upgrade.
   */
  async createCheckoutSession(userId: string, email: string) {
    let user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user) throw new BillingError("User not found.", 404);

    // Create Stripe customer if needed
    if (!user.stripeCustomerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { voyaUserId: userId },
      });

      user = await this.db.user.update({
        where: { id: userId },
        data: { stripeCustomerId: customer.id },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: user.stripeCustomerId!,
      mode: "subscription",
      line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.APP_URL || "https://voya.dev"}/billing/success`,
      cancel_url: `${process.env.APP_URL || "https://voya.dev"}/billing/cancel`,
    });

    return { url: session.url };
  }

  /**
   * Handle Stripe webhook events.
   */
  async handleWebhook(payload: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.customer) {
          await this.db.user.updateMany({
            where: { stripeCustomerId: session.customer as string },
            data: { tier: "PRO" },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        if (subscription.customer) {
          await this.db.user.updateMany({
            where: { stripeCustomerId: subscription.customer as string },
            data: { tier: "FREE" },
          });
        }
        break;
      }
    }

    return { received: true };
  }
}

export class BillingError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "BillingError";
  }
}
