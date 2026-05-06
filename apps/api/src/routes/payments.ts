import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import {
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "../lib/razorpay";
import { validateBody } from "../middleware/validate";
import { emitToUser } from "../socket";
import { logger } from "../lib/logger";

const router = Router();

// ─── Verify checkout payment (called by client after Razorpay popup) ───────
const verifySchema = z.object({
  orderId: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

router.post(
  "/razorpay/verify",
  requireAuth,
  validateBody(verifySchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const body = req.body as z.infer<typeof verifySchema>;
      const order = await prisma.order.findFirst({
        where: { id: body.orderId, userId, razorpayOrderId: body.razorpay_order_id },
      });
      if (!order)
        return res.status(404).json({ error: "Order not found" });

      const ok = verifyPaymentSignature(
        body.razorpay_order_id,
        body.razorpay_payment_id,
        body.razorpay_signature
      );
      if (!ok) return res.status(400).json({ error: "Invalid signature" });

      const updated = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          razorpayPaymentId: body.razorpay_payment_id,
          status: "CONFIRMED",
        },
      });
      await dispatchOrderToHeroes(order.id);
      res.json({ ok: true, order: updated });
    } catch (e) {
      next(e);
    }
  }
);

// ─── Razorpay webhook (signature-verified, raw body) ───────────────────────
router.post("/razorpay/webhook", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string | undefined;
    const rawBody = (req as any).rawBody as string | undefined;
    if (!signature || !rawBody) {
      return res.status(400).json({ error: "Missing signature or body" });
    }
    const payload = verifyWebhookSignature(rawBody, signature);

    const event = payload?.event as string | undefined;
    if (event === "payment.captured" || event === "order.paid") {
      const orderId = payload?.payload?.payment?.entity?.notes?.orderId as string | undefined;
      const razorpayPaymentId = payload?.payload?.payment?.entity?.id as string | undefined;
      if (orderId) {
        const order = await prisma.order.findUnique({ where: { id: orderId } });
        if (order && order.paymentStatus !== "PAID") {
          await prisma.order.update({
            where: { id: orderId },
            data: {
              paymentStatus: "PAID",
              razorpayPaymentId: razorpayPaymentId ?? order.razorpayPaymentId,
              status: order.status === "PENDING" ? "CONFIRMED" : order.status,
            },
          });
          await dispatchOrderToHeroes(orderId);
        }
      }
    }
    res.json({ ok: true });
  } catch (e: any) {
    logger.error("[razorpay webhook]", e?.message ?? e);
    res.status(400).json({ error: "Invalid webhook" });
  }
});

async function dispatchOrderToHeroes(orderId: string) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { hero: { select: { userId: true } } },
  });
  const seen = new Set<string>();
  for (const i of items) {
    if (seen.has(i.hero.userId)) continue;
    seen.add(i.hero.userId);
    emitToUser(i.hero.userId, "order:new", { orderId });
    emitToUser(i.hero.userId, "payment:confirmed", { orderId });
  }
  // Notify the user
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { userId: true },
  });
  if (order) {
    emitToUser(order.userId, "order:status_update", {
      orderId,
      status: "CONFIRMED",
    });
  }
}

export default router;
