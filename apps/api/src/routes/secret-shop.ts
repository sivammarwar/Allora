import { Router } from "express";
import { z } from "zod";
import type { AgentInventoryItem } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { env } from "../env";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roleGuard";
import { validateBody } from "../middleware/validate";
import { initiatePayment, getPaymentStatus, verifyCallbackToken } from "../lib/phonepe";

const router = Router();

// ─── PUBLIC: PhonePe S2S callback (no auth) ───────────────────────────────────
router.post("/payment/callback", async (req, res) => {
  try {
    const authHeader = req.headers["authorization"] as string | undefined;
    if (authHeader) {
      const valid = await verifyCallbackToken(authHeader);
      if (!valid) return res.status(401).json({ ok: false, error: "Invalid token" });
    }

    const body = req.body as { merchantOrderId?: string; state?: string };
    const merchantTxnId = body.merchantOrderId;
    const state = body.state;
    if (!merchantTxnId) return res.status(200).json({ ok: true });

    const paymentStatus = state === "COMPLETED" ? "PAID" : "FAILED";

    const order = await prisma.secretOrder.findFirst({
      where: { paymentTxnId: merchantTxnId },
      include: { items: true },
    });

    if (order) {
      if (paymentStatus === "FAILED") {
        await prisma.$transaction(async (tx) => {
          await tx.secretOrder.update({
            where: { id: order.id },
            data: { paymentStatus: "FAILED", status: "CANCELLED" },
          });
          for (const item of order.items) {
            await tx.agentInventoryItem.update({
              where: { id: item.inventoryItemId },
              data: { quantity: { increment: item.quantity } },
            });
          }
        });
      } else {
        await prisma.secretOrder.update({
          where: { id: order.id },
          data: { paymentStatus: "PAID" },
        });
      }
    }

    res.status(200).json({ ok: true });
  } catch {
    res.status(200).json({ ok: true });
  }
});

router.use(requireAuth);

// ─── Registration request (no profile needed) ────────────────────────────────

const registerSchema = z.object({
  shopName: z.string().trim().min(2),
  phone: z.string().trim().min(7),
  address: z.string().trim().min(3),
  locationLat: z.number(),
  locationLng: z.number(),
  preferredAgentId: z.string().optional().nullable(),
  purpose: z.string().optional().nullable(),
});

router.post("/register-request", validateBody(registerSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof registerSchema>;

    // Check if already has a pending/approved request
    const existing = await prisma.secretShopRequest.findFirst({
      where: { userId: req.user!.id, status: { in: ["PENDING", "IN_PROGRESS", "VERIFIED"] } },
    });
    if (existing) {
      return res.status(400).json({ error: "You already have a pending or verified request" });
    }

    // Find best agent for location if no preference
    let agentId = body.preferredAgentId ?? null;
    if (!agentId) {
      const agent = await prisma.agentProfile.findFirst({
        where: { isVerifiedByAdmin: true },
      });
      agentId = agent?.id ?? null;
    }

    const request = await prisma.secretShopRequest.create({
      data: {
        userId: req.user!.id,
        agentId,
        shopName: body.shopName,
        phone: body.phone,
        address: body.address,
        locationLat: body.locationLat,
        locationLng: body.locationLng,
        purpose: body.purpose ?? null,
      },
    });

    res.json(request);
  } catch (e) {
    next(e);
  }
});

// ─── Me (profile + request status) ──────────────────────────────────────────

router.get("/me", async (req, res, next) => {
  try {
    const profile = await prisma.secretShopProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        verifiedByAgent: {
          select: { id: true, user: { select: { name: true } } },
        },
      },
    });

    if (profile?.isVerifiedByAgent) {
      return res.json({ state: "verified", profile });
    }

    const request = await prisma.secretShopRequest.findFirst({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });

    if (!request) {
      return res.json({ state: "needs_request" });
    }

    return res.json({ state: "pending", request });
  } catch (e) {
    next(e);
  }
});

// ─── Browse agent inventory (requires verified profile) ──────────────────────

router.get("/items", requireRole("SECRET_SHOP"), async (req, res, next) => {
  try {
    const profile = await prisma.secretShopProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile?.isVerifiedByAgent || !profile.verifiedByAgentId) {
      return res.status(403).json({ error: "Not verified yet" });
    }

    const { search } = req.query;

    const rows = await prisma.agentInventoryItem.findMany({
      where: {
        agentId: profile.verifiedByAgentId,
        isActive: true,
        ...(search
          ? {
              item: {
                OR: [
                  { name: { contains: String(search), mode: "insensitive" } },
                  { brandName: { contains: String(search), mode: "insensitive" } },
                ],
              },
            }
          : {}),
      },
      include: {
        item: { select: { id: true, name: true, brandName: true, imageUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// ─── Orders ──────────────────────────────────────────────────────────────────

const placeOrderSchema = z.object({
  items: z
    .array(
      z.object({
        inventoryItemId: z.string(),
        quantity: z.number().int().min(1),
      })
    )
    .min(1),
  notes: z.string().optional().nullable(),
  paymentMode: z.enum(["COD", "ONLINE"]).default("COD"),
});

router.post("/orders", requireRole("SECRET_SHOP"), validateBody(placeOrderSchema), async (req, res, next) => {
  try {
    const profile = await prisma.secretShopProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile?.isVerifiedByAgent || !profile.verifiedByAgentId) {
      return res.status(403).json({ error: "Not verified yet" });
    }

    const body = req.body as z.infer<typeof placeOrderSchema>;
    const inventoryIds = body.items.map((i) => i.inventoryItemId);

    const invItems: AgentInventoryItem[] = await prisma.agentInventoryItem.findMany({
      where: {
        id: { in: inventoryIds },
        agentId: profile.verifiedByAgentId,
        isActive: true,
      },
    });

    if (invItems.length !== inventoryIds.length) {
      return res.status(400).json({ error: "Some items are unavailable" });
    }

    // Check stock
    const invMap = new Map<string, AgentInventoryItem>(invItems.map((i) => [i.id, i]));
    for (const reqItem of body.items) {
      const inv = invMap.get(reqItem.inventoryItemId)!;
      if (inv.quantity < reqItem.quantity) {
        return res.status(400).json({ error: "Insufficient stock for one or more items" });
      }
    }

    const priceMap = new Map(invItems.map((i) => [i.id, Number(i.price)]));
    const totalAmount = body.items.reduce(
      (sum, i) => sum + (priceMap.get(i.inventoryItemId) ?? 0) * i.quantity,
      0
    );

    const paymentMode = body.paymentMode ?? "COD";

    // Create order + decrement inventory in a transaction
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.secretOrder.create({
        data: {
          shopId: profile.id,
          agentId: profile.verifiedByAgentId!,
          totalAmount,
          notes: body.notes ?? null,
          paymentMode,
          paymentStatus: "PENDING",
          items: {
            create: body.items.map((i) => ({
              inventoryItemId: i.inventoryItemId,
              quantity: i.quantity,
              unitPrice: priceMap.get(i.inventoryItemId) ?? 0,
            })),
          },
        },
        include: {
          items: {
            include: {
              inventoryItem: {
                include: { item: true },
              },
            },
          },
        },
      });

      // Decrement each inventory item's quantity
      for (const reqItem of body.items) {
        await tx.agentInventoryItem.update({
          where: { id: reqItem.inventoryItemId },
          data: { quantity: { decrement: reqItem.quantity } },
        });
      }

      return created;
    });

    res.json(order);
  } catch (e) {
    next(e);
  }
});

// ─── Payment: initiate PhonePe for an ONLINE order ─────────────────────────
router.post("/payment/initiate", requireRole("SECRET_SHOP"), async (req, res, next) => {
  try {
    const profile = await prisma.secretShopProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile?.isVerifiedByAgent) return res.status(403).json({ error: "Not verified" });

    const { orderId } = req.body as { orderId?: string };
    if (!orderId) return res.status(400).json({ error: "orderId required" });

    const order = await prisma.secretOrder.findFirst({
      where: { id: orderId, shopId: profile.id, paymentMode: "ONLINE", paymentStatus: "PENDING" },
    });
    if (!order) return res.status(404).json({ error: "Order not found or not eligible" });

    const merchantTxnId = `SS${order.id}`;
    const origins = env.WEB_ORIGIN.split(",").map((o) => o.trim());
    const webOrigin = origins.find((o) => o.startsWith("https://")) ?? origins[0];
    const redirectUrl = `${webOrigin}/secret-shop/payment/result?txn=${merchantTxnId}`;
    const callbackUrl = `${env.API_PUBLIC_URL ?? env.NEXT_PUBLIC_API_URL}/api/secret-shop/payment/callback`;

    const result = await initiatePayment({
      merchantTransactionId: merchantTxnId,
      merchantUserId: profile.userId,
      amountRupees: Number(order.totalAmount),
      redirectUrl,
      callbackUrl,
    });

    await prisma.secretOrder.update({
      where: { id: order.id },
      data: { paymentTxnId: merchantTxnId },
    });

    res.json({ redirectUrl: result.redirectUrl, merchantTransactionId: merchantTxnId });
  } catch (e) {
    next(e);
  }
});

// ─── Payment: check status ────────────────────────────────────────────────────
router.get("/payment/status/:merchantTransactionId", requireRole("SECRET_SHOP"), async (req, res, next) => {
  try {
    const profile = await prisma.secretShopProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile?.isVerifiedByAgent) return res.status(403).json({ error: "Not verified" });

    const { merchantTransactionId } = req.params;
    const order = await prisma.secretOrder.findFirst({
      where: { paymentTxnId: merchantTransactionId, shopId: profile.id },
    });
    if (!order) return res.status(404).json({ error: "Order not found" });

    const status = await getPaymentStatus(merchantTransactionId);

    if (status.state === "COMPLETED" && order.paymentStatus !== "PAID") {
      await prisma.secretOrder.update({
        where: { id: order.id },
        data: { paymentStatus: "PAID" },
      });
    } else if (status.state === "FAILED" && order.paymentStatus !== "FAILED") {
      await prisma.$transaction(async (tx) => {
        await tx.secretOrder.update({
          where: { id: order.id },
          data: { paymentStatus: "FAILED", status: "CANCELLED" },
        });
        const items = await tx.secretOrderItem.findMany({ where: { orderId: order.id } });
        for (const item of items) {
          await tx.agentInventoryItem.update({
            where: { id: item.inventoryItemId },
            data: { quantity: { increment: item.quantity } },
          });
        }
      });
    }

    res.json({ orderId: order.id, paymentStatus: status.state === "COMPLETED" ? "PAID" : status.state === "FAILED" ? "FAILED" : "PENDING", ...status });
  } catch (e) {
    next(e);
  }
});

router.get("/orders", requireRole("SECRET_SHOP"), async (req, res, next) => {
  try {
    const profile = await prisma.secretShopProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile?.isVerifiedByAgent) {
      return res.status(403).json({ error: "Not verified yet" });
    }

    const { past, all } = req.query;
    const pastOrders = past === "true";
    const allOrders = all === "true";

    const orders = await prisma.secretOrder.findMany({
      where: {
        shopId: profile.id,
        ...(allOrders ? {} : pastOrders
          ? { status: { in: ["DELIVERED", "CANCELLED"] } }
          : { status: { notIn: ["DELIVERED", "CANCELLED"] } }),
      },
      include: {
        items: {
          include: {
            inventoryItem: {
              include: { item: { select: { id: true, name: true, brandName: true, imageUrl: true } } },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(orders);
  } catch (e) {
    next(e);
  }
});

export default router;
