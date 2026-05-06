import { Router } from "express";
import { z } from "zod";
import * as turf from "@turf/turf";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roleGuard";
import { validateBody } from "../middleware/validate";
import { emitToUser } from "../socket";

const router = Router();
router.use(requireAuth, requireRole("DELIVERY_BOY"));

router.get("/me", async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const profile = await prisma.deliveryBoyProfile.findUnique({
      where: { userId },
      include: {
        verifiedByAgent: {
          select: { id: true, user: { select: { name: true, email: true } } },
        },
      },
    });
    if (profile?.isVerifiedByAgent) {
      return res.json({ state: "verified", profile });
    }
    const request = await prisma.verificationRequest.findFirst({
      where: { requesterId: userId, requestType: "DELIVERY_BOY" },
      orderBy: { createdAt: "desc" },
    });
    if (!request) return res.json({ state: "needs_request" });
    return res.json({
      state: request.status === "VERIFIED" ? "verified" : "pending",
      request,
    });
  } catch (e) {
    next(e);
  }
});

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(7).max(20),
  address: z.string().trim().min(3).max(300),
  locationLat: z.number().gte(-90).lte(90),
  locationLng: z.number().gte(-180).lte(180),
  profileImageUrl: z.string().url().nullable().optional(),
  purpose: z.string().max(2000).optional().nullable(),
  preferredAgentId: z.string().optional().nullable(),
});

router.post(
  "/register-request",
  validateBody(registerSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const data = req.body as z.infer<typeof registerSchema>;

      const existingProfile = await prisma.deliveryBoyProfile.findUnique({
        where: { userId },
      });
      if (existingProfile?.isVerifiedByAgent) {
        return res.status(409).json({ error: "Already verified" });
      }

      const allAreas = await prisma.area.findMany({
        select: { id: true, polygon: true },
      });
      const point = turf.point([data.locationLng, data.locationLat]);
      const matchingArea = allAreas.find((a) => {
        try {
          const poly = turf.polygon(
            (a.polygon as any).coordinates as number[][][]
          );
          return turf.booleanPointInPolygon(point, poly);
        } catch {
          return false;
        }
      });
      if (!matchingArea) {
        return res
          .status(400)
          .json({ error: "Your location is outside any serviced area." });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { name: data.name, phone: data.phone },
      });

      await prisma.verificationRequest.updateMany({
        where: {
          requesterId: userId,
          requestType: "DELIVERY_BOY",
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
        data: { status: "REJECTED" },
      });

      const created = await prisma.verificationRequest.create({
        data: {
          requestType: "DELIVERY_BOY",
          requesterId: userId,
          areaId: matchingArea.id,
          agentId: data.preferredAgentId || undefined,
          status: "PENDING",
          details: {
            name: data.name,
            phone: data.phone,
            address: data.address,
            locationLat: data.locationLat,
            locationLng: data.locationLng,
            profileImageUrl: data.profileImageUrl ?? null,
            purpose: data.purpose ?? null,
          },
        },
      });

      // Notify preferred agent or agents covering the area
      if (data.preferredAgentId) {
        const preferredAgent = await prisma.agentProfile.findUnique({
          where: { id: data.preferredAgentId },
          select: { userId: true },
        });
        if (preferredAgent) {
          emitToUser(preferredAgent.userId, "verification:request_new", {
            requestId: created.id,
            type: "DELIVERY_BOY",
          });
        }
      } else {
        const agents = await prisma.agentArea.findMany({
          where: { areaId: matchingArea.id },
          select: { agent: { select: { userId: true } } },
        });
        for (const a of agents) {
          emitToUser(a.agent.userId, "verification:request_new", {
            requestId: created.id,
            type: "DELIVERY_BOY",
          });
        }
      }

      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  }
);

// ─── Active orders for this delivery boy ───────────────────────────────────
router.get("/orders", async (req, res, next) => {
  try {
    const profile = await prisma.deliveryBoyProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile?.isVerifiedByAgent)
      return res.status(403).json({ error: "Not yet verified" });

    const items = await prisma.orderItem.findMany({
      where: { assignedDeliveryBoyId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        order: {
          include: {
            user: { select: { name: true, phone: true, email: true } },
          },
        },
        hero: {
          select: {
            id: true,
            shopName: true,
            serviceName: true,
            phone: true,
            address: true,
            locationLat: true,
            locationLng: true,
          },
        },
        product: { select: { id: true, name: true, imageUrl: true } },
        subcategory: { select: { id: true, name: true } },
      },
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.put("/orders/:itemId/delivered", async (req, res, next) => {
  try {
    const profile = await prisma.deliveryBoyProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile) return res.status(403).json({ error: "Not verified" });

    const item = await prisma.orderItem.findUnique({
      where: { id: req.params.itemId },
      include: { order: true },
    });
    if (!item || item.assignedDeliveryBoyId !== profile.id)
      return res.status(404).json({ error: "Item not found" });

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.update({
        where: { id: item.id },
        data: { subOrderStatus: "DELIVERED", deliveredAt: new Date() },
      });
      // If all items delivered, mark order DELIVERED + mark COD as PAID
      const remaining = await tx.orderItem.count({
        where: {
          orderId: item.orderId,
          subOrderStatus: { not: "DELIVERED" },
          NOT: { id: item.id },
        },
      });
      if (remaining === 0) {
        const isCOD = item.order.paymentMethod === "COD";
        await tx.order.update({
          where: { id: item.orderId },
          data: {
            status: "DELIVERED",
            ...(isCOD && { paymentStatus: "PAID" }),
          },
        });
      }
    });

    emitToUser(item.order.userId, "order:status_update", {
      orderId: item.orderId,
      status: "DELIVERED",
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ─── UPI receiving address (for COD-as-UPI) ────────────────────────────────
const upiSchema = z.object({
  upiVpa: z
    .string()
    .trim()
    .regex(/^[\w.\-]{2,256}@[A-Za-z]{2,64}$/, "Invalid UPI ID")
    .nullable()
    .optional(),
  upiName: z.string().trim().min(2).max(100).nullable().optional(),
});

router.put(
  "/profile/upi",
  validateBody(upiSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const profile = await prisma.deliveryBoyProfile.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (!profile)
        return res.status(404).json({ error: "Profile not found" });

      const body = req.body as z.infer<typeof upiSchema>;
      const updated = await prisma.deliveryBoyProfile.update({
        where: { id: profile.id },
        data: {
          upiVpa: body.upiVpa ?? null,
          upiName: body.upiName ?? null,
        },
        select: { id: true, upiVpa: true, upiName: true },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  }
);

export default router;
