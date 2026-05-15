import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import * as turf from "@turf/turf";
import { prisma } from "../lib/prisma";
import { env } from "../env";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roleGuard";
import { validateBody } from "../middleware/validate";
import { emitToUser, emitService } from "../socket";
import { v2 as cloudinary } from "cloudinary";
import { sendPushNotification } from "../lib/push";
import { initiatePayment, getPaymentStatus, verifyCallbackToken } from "../lib/phonepe";
import { markHeroOnboardingPaid } from "../lib/heroOnboarding";

const router = Router();

// ─── PUBLIC: Hero onboarding payment S2S callback (no auth) ─────────────────
// Mounted before requireAuth so PhonePe can hit it without a token.
router.post("/onboarding-payment/callback", async (req, res) => {
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

    const profile = await prisma.heroProfile.findFirst({
      where: { onboardingPaymentTxnId: merchantTxnId },
    });
    if (profile && state === "COMPLETED" && !profile.hasPaidOnboardingFee) {
      await markHeroOnboardingPaid(profile.id, { txnId: merchantTxnId, markedBy: "PHONEPE" });
      emitToUser(profile.userId, "hero:onboarding_paid", { ok: true });
    }

    res.status(200).json({ ok: true });
  } catch {
    res.status(200).json({ ok: true });
  }
});

router.use(requireAuth, requireRole("HERO"));

// Multer configuration for file uploads
const upload = multer({ dest: "uploads/" });

/**
 * GET /api/hero/me
 * Returns the current hero's onboarding/verification status.
 *  - { state: "needs_request" }              → not registered yet
 *  - { state: "pending", request, agent? }   → submitted, awaiting agent
 *  - { state: "verified", profile }          → verified, full dashboard
 */
router.get("/me", async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const profile = await prisma.heroProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { name: true, email: true } },
        verifiedByAgent: {
          select: { id: true, user: { select: { name: true, email: true } } },
        },
      },
    });
    if (profile?.isVerifiedByAgent && profile?.isActive) {
      // Determine if the hero needs (re-)payment:
      //   1. Never paid, OR
      //   2. Their snapshot expiry has passed.
      const now = new Date();
      const expired =
        profile.hasPaidOnboardingFee &&
        profile.onboardingExpiresAt !== null &&
        profile.onboardingExpiresAt.getTime() < now.getTime();

      if (!profile.hasPaidOnboardingFee || expired) {
        const settings = await prisma.globalSetting.findUnique({ where: { id: "global" } });
        const feeAmount = settings?.heroOnboardingFee ?? 999;
        const validityMonths = settings?.heroOnboardingValidityMonths ?? 12;
        return res.json({
          state: "payment_required",
          profile,
          feeAmount,
          validityMonths,
          expired,
        });
      }
      return res.json({ state: "verified", profile });
    }

    const request = await prisma.verificationRequest.findFirst({
      where: { requesterId: userId, requestType: "HERO" },
      orderBy: { createdAt: "desc" },
      include: {
        agent: {
          select: { id: true, user: { select: { name: true, email: true } } },
        },
      },
    });
    if (!request) return res.json({ state: "needs_request" });
    // If profile was revoked (exists but not verified/active), treat as pending
    // regardless of what the old verification request says
    const profileRevoked = profile && (!profile.isVerifiedByAgent || !profile.isActive);
    return res.json({
      state: !profileRevoked && request.status === "VERIFIED" ? "verified" : "pending",
      request,
      ...(profileRevoked && { revoked: true }),
    });
  } catch (e) {
    next(e);
  }
});

// ─── Hero Onboarding Payment ─────────────────────────────────────────────────

// POST /api/hero/onboarding-payment/initiate — start a PhonePe payment
router.post("/onboarding-payment/initiate", async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const profile = await prisma.heroProfile.findUnique({ where: { userId } });
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    if (!profile.isVerifiedByAgent) return res.status(403).json({ error: "Not verified by agent yet" });

    // Allow new payment if (a) never paid, OR (b) previous validity expired.
    const now = new Date();
    const isExpired =
      profile.onboardingExpiresAt !== null &&
      profile.onboardingExpiresAt.getTime() < now.getTime();
    if (profile.hasPaidOnboardingFee && !isExpired) {
      return res.status(409).json({ error: "Onboarding fee already paid and active" });
    }

    const settings = await prisma.globalSetting.upsert({
      where: { id: "global" },
      update: {},
      create: { id: "global" },
    });
    const feeAmount = settings.heroOnboardingFee;

    const merchantTxnId = `HO${profile.id.slice(-10)}${Date.now().toString().slice(-6)}`;
    const origins = env.WEB_ORIGIN.split(",").map((o) => o.trim());
    const webOrigin = origins.find((o) => o.startsWith("https://")) ?? origins[0];
    const redirectUrl = `${webOrigin}/hero/payment/result?txn=${merchantTxnId}`;
    const callbackUrl = `${env.API_PUBLIC_URL ?? env.NEXT_PUBLIC_API_URL}/api/hero/onboarding-payment/callback`;

    const result = await initiatePayment({
      merchantTransactionId: merchantTxnId,
      merchantUserId: userId,
      amountRupees: feeAmount,
      redirectUrl,
      callbackUrl,
    });

    // Reset payment state for a fresh attempt (renewal or first-time).
    await prisma.heroProfile.update({
      where: { id: profile.id },
      data: {
        onboardingPaymentTxnId: merchantTxnId,
        hasPaidOnboardingFee: false,
      },
    });

    res.json({
      redirectUrl: result.redirectUrl,
      merchantTransactionId: merchantTxnId,
      amount: feeAmount,
      validityMonths: settings.heroOnboardingValidityMonths,
    });
  } catch (e: any) {
    console.error("[Hero Onboarding Payment] Initiate failed:", e?.message ?? e);
    next(e);
  }
});

// GET /api/hero/onboarding-payment/status/:merchantTransactionId — poll status
router.get("/onboarding-payment/status/:merchantTransactionId", async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { merchantTransactionId } = req.params;
    const profile = await prisma.heroProfile.findUnique({ where: { userId } });
    if (!profile || profile.onboardingPaymentTxnId !== merchantTransactionId) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Already marked paid (via callback) — return immediately with expiry
    if (profile.hasPaidOnboardingFee) {
      return res.json({
        paid: true,
        state: "COMPLETED",
        expiresAt: profile.onboardingExpiresAt,
      });
    }

    // Otherwise, poll PhonePe
    const status = await getPaymentStatus(merchantTransactionId);
    if (status.success && !profile.hasPaidOnboardingFee) {
      const updated = await markHeroOnboardingPaid(profile.id);
      return res.json({
        paid: true,
        state: status.state,
        expiresAt: updated.onboardingExpiresAt,
      });
    }

    res.json({ paid: false, state: status.state });
  } catch (e: any) {
    console.error("[Hero Onboarding Payment] Status check failed:", e?.message ?? e);
    next(e);
  }
});

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  serviceName: z.string().trim().min(2).max(120).optional().nullable(),
  shopName: z.string().trim().max(120).optional().nullable(),
  categoryIds: z.array(z.string().min(1)).min(1),
  subcategoryIds: z.array(z.string().min(1)).optional().nullable(),
  phone: z.string().trim().min(7).max(20),
  address: z.string().trim().min(3).max(300),
  locationLat: z.number().gte(-90).lte(90),
  locationLng: z.number().gte(-180).lte(180),
  profileImageUrl: z.string().url().nullable().optional(),
  purpose: z.string().max(2000).optional().nullable(),
  preferredAgentId: z.string().optional().nullable(),
});

/**
 * POST /api/hero/register-request
 * Creates (or replaces an existing PENDING) verification request, finds the
 * matching Area by polygon containment, and routes it to the agent.
 */
router.post(
  "/register-request",
  validateBody(registerSchema),
  async (req, res, next) => {
    try {
      const userId = req.user!.id;
      const data = req.body as z.infer<typeof registerSchema>;

      // Reject if already verified
      const existingProfile = await prisma.heroProfile.findUnique({
        where: { userId },
      });
      if (existingProfile?.isVerifiedByAgent) {
        return res.status(409).json({ error: "Already verified" });
      }

      // Find the Area whose polygon contains the location
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

      // Update User.name + phone if provided
      await prisma.user.update({
        where: { id: userId },
        data: { name: data.name, phone: data.phone },
      });

      // Replace any prior PENDING request for this user
      await prisma.verificationRequest.updateMany({
        where: {
          requesterId: userId,
          requestType: "HERO",
          status: { in: ["PENDING", "IN_PROGRESS"] },
        },
        data: { status: "REJECTED" },
      });

      const created = await prisma.verificationRequest.create({
        data: {
          requestType: "HERO",
          requesterId: userId,
          areaId: matchingArea.id,
          agentId: data.preferredAgentId || undefined,
          status: "PENDING",
          details: {
            name: data.name,
            serviceName: data.serviceName,
            shopName: data.shopName ?? null,
            categoryIds: data.categoryIds,
            subcategoryIds: data.subcategoryIds,
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
        // Notify only the preferred agent
        const preferredAgent = await prisma.agentProfile.findUnique({
          where: { id: data.preferredAgentId },
          select: { userId: true },
        });
        if (preferredAgent) {
          emitToUser(preferredAgent.userId, "verification:request_new", {
            requestId: created.id,
            type: "HERO",
          });
        }
      } else {
        // Notify all agents covering the area
        const agents = await prisma.agentArea.findMany({
          where: { areaId: matchingArea.id },
          select: { agent: { select: { userId: true } } },
        });
        for (const a of agents) {
          emitToUser(a.agent.userId, "verification:request_new", {
            requestId: created.id,
            type: "HERO",
          });
        }
      }

      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  }
);

// ─── Store: pricing per subcategory ────────────────────────────────────────
router.get("/pricing", async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({
      where: { userId: req.user!.id },
      include: {
        pricing: {
          include: {
            subcategory: {
              select: {
                id: true,
                name: true,
                category: {
                  select: {
                    name: true,
                    type: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!profile?.isVerifiedByAgent)
      return res.status(403).json({ error: "Not yet verified" });

    const [subcategories, agentPricing, agentCategoryConfigs] = await Promise.all([
      prisma.subcategory.findMany({
        where: { id: { in: profile.subcategoryIds } },
        select: {
          id: true,
          name: true,
          categoryId: true,
          category: { select: { name: true, type: true } },
        },
      }),
      profile.verifiedByAgentId
        ? prisma.agentSubcategoryPricing.findMany({
            where: {
              agentId: profile.verifiedByAgentId,
              subcategoryId: { in: profile.subcategoryIds },
            },
            select: { subcategoryId: true, baseServiceCharge: true },
          })
        : Promise.resolve([]),
      profile.verifiedByAgentId
        ? (prisma as any).agentCategoryConfig.findMany({
            where: { agentId: profile.verifiedByAgentId },
            select: { categoryId: true, transportChargePerKm: true },
          })
        : Promise.resolve([]),
    ]);

    const catCfgMap = new Map<string, any>(agentCategoryConfigs.map((c: any) => [c.categoryId, c]));
    // Merge transport from category config back into agentPricing for hero display
    const agentPricingWithTransport = agentPricing.map((ap: any) => {
      const sub = subcategories.find((s) => s.id === ap.subcategoryId);
      const catCfg = sub ? catCfgMap.get(sub.categoryId) : null;
      return { ...ap, transportChargePerKm: catCfg ? String(catCfg.transportChargePerKm) : "0" };
    });

    res.json({
      heroId: profile.id,
      categoryIds: profile.categoryIds,
      subcategoryIds: profile.subcategoryIds,
      requiresDelivery: profile.requiresDelivery,
      pricing: profile.pricing,
      subcategories,
      agentPricing: agentPricingWithTransport,
    });
  } catch (e) {
    next(e);
  }
});

const pricingSchema = z.object({
  subcategoryId: z.string().min(1),
  serviceCharge: z.number().nonnegative(),
  deliveryCharge2km: z.number().nonnegative().default(0),
  deliveryCharge5km: z.number().nonnegative().default(0),
  deliveryCharge7km: z.number().nonnegative().default(0),
  deliveryCharge10km: z.number().nonnegative().default(0),
});

router.put("/pricing", validateBody(pricingSchema), async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile?.isVerifiedByAgent)
      return res.status(403).json({ error: "Not yet verified" });
    const body = req.body as z.infer<typeof pricingSchema>;
    if (!profile.subcategoryIds.includes(body.subcategoryId)) {
      return res.status(400).json({ error: "Subcategory not in your scope" });
    }
    const row = await prisma.heroSubcategoryPricing.upsert({
      where: {
        heroId_subcategoryId: {
          heroId: profile.id,
          subcategoryId: body.subcategoryId,
        },
      },
      update: { ...body, heroId: undefined } as any,
      create: { ...body, heroId: profile.id },
    });
    res.json(row);
  } catch (e) {
    next(e);
  }
});

// ─── Store: products (catalog the hero can pick from) ──────────────────────
router.get("/catalog-products", async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile?.isVerifiedByAgent)
      return res.status(403).json({ error: "Not yet verified" });
    const search =
      typeof req.query.search === "string" ? req.query.search : "";
    const categoryId =
      typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
    const products = await prisma.product.findMany({
      where: {
        categoryId: { in: profile.categoryIds },
        isActive: true,
        ...(categoryId && { categoryId }),
        ...(search && { name: { contains: search, mode: "insensitive" } }),
      },
      include: {
        category: { select: { id: true, name: true, type: true } },
        subcategory: { select: { id: true, name: true } },
      },
      take: 200,
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  } catch (e) {
    next(e);
  }
});

// ─── Hero Products (for PRODUCT categories) ──────────────────────────────
router.get("/my-products", async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile?.isVerifiedByAgent)
      return res.status(403).json({ error: "Not yet verified" });
    const rows = await prisma.heroProduct.findMany({
      where: { heroId: profile.id },
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true, type: true } },
            subcategory: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

const heroProductSchema = z.object({
  productId: z.string().min(1),
  sellingPrice: z.number().positive(),
  isAvailable: z.boolean().default(true),
});

router.post(
  "/my-products",
  validateBody(heroProductSchema),
  async (req, res, next) => {
    try {
      const profile = await prisma.heroProfile.findUnique({
        where: { userId: req.user!.id },
      });
      if (!profile?.isVerifiedByAgent)
        return res.status(403).json({ error: "Not yet verified" });

      const body = req.body as z.infer<typeof heroProductSchema>;
      
      const product = await prisma.product.findUnique({
        where: { id: body.productId },
        include: { category: { select: { id: true, type: true, isActive: true } } },
      });
      if (!product || !product.category.isActive || !product.isActive) {
        return res.status(400).json({ error: "Product not available" });
      }
      
      if (!profile.categoryIds.includes(product.category.id)) {
        return res.status(400).json({ error: "Product category is not in your scope" });
      }
      if (product.category.type !== "PRODUCT") {
        return res.status(400).json({ error: "Product must be from a PRODUCT category" });
      }

      const row = await prisma.heroProduct.create({
        data: {
          heroId: profile.id,
          productId: body.productId,
          sellingPrice: body.sellingPrice,
          isAvailable: body.isAvailable,
        },
        include: {
          product: {
            include: {
              category: { select: { id: true, name: true, type: true } },
              subcategory: { select: { id: true, name: true } },
            },
          },
        },
      });
      res.json(row);
    } catch (e) {
      next(e);
    }
  }
);

router.put("/my-products/:id", validateBody(heroProductSchema.partial()), async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile?.isVerifiedByAgent)
      return res.status(403).json({ error: "Not yet verified" });

    const body = req.body as z.infer<typeof heroProductSchema>;
    
    const existing = await prisma.heroProduct.findUnique({
      where: { id: req.params.id },
      select: { heroId: true, productId: true },
    });
    if (!existing || existing.heroId !== profile.id) {
      return res.status(404).json({ error: "Product not found" });
    }

    if (body.productId && body.productId !== existing.productId) {
      const product = await prisma.product.findUnique({
        where: { id: body.productId },
        include: { category: { select: { id: true, type: true, isActive: true } } },
      });
      if (!product || !product.category.isActive || !product.isActive) {
        return res.status(400).json({ error: "Product not available" });
      }
      if (!profile.categoryIds.includes(product.category.id)) {
        return res.status(400).json({ error: "Product category is not in your scope" });
      }
      if (product.category.type !== "PRODUCT") {
        return res.status(400).json({ error: "Product must be from a PRODUCT category" });
      }
    }

    const row = await prisma.heroProduct.update({
      where: { id: req.params.id },
      data: body,
      include: {
        product: {
          include: {
            category: { select: { id: true, name: true, type: true } },
            subcategory: { select: { id: true, name: true } },
          },
        },
      },
    });
    res.json(row);
  } catch (e) {
    next(e);
  }
});

router.delete("/my-products/:id", async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile) return res.status(404).json({ error: "No profile" });
    
    const existing = await prisma.heroProduct.findUnique({
      where: { id: req.params.id },
      select: { heroId: true },
    });
    if (!existing || existing.heroId !== profile.id) {
      return res.status(404).json({ error: "Product not found" });
    }
    
    await prisma.heroProduct.delete({
      where: { id: req.params.id },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ─── Incoming orders ───────────────────────────────────────────────────────
router.get("/orders", async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile?.isVerifiedByAgent)
      return res.status(403).json({ error: "Not yet verified" });

    const items = await prisma.orderItem.findMany({
      where: { heroId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        order: {
          include: { user: { select: { id: true, name: true, email: true, phone: true } } },
        },
        product: true,
        subcategory: true,
        assignedDeliveryBoy: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.put("/orders/:itemId/packed", async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile) return res.status(403).json({ error: "Not verified" });
    const item = await prisma.orderItem.findUnique({
      where: { id: req.params.itemId },
      select: { heroId: true, orderId: true, order: { select: { userId: true } } },
    });
    if (!item || item.heroId !== profile.id)
      return res.status(404).json({ error: "Item not found" });

    const updated = await prisma.orderItem.update({
      where: { id: req.params.itemId },
      data: { subOrderStatus: "PACKED" },
    });
    // Reflect status on parent Order
    await prisma.order.update({
      where: { id: item.orderId },
      data: { status: "PACKED" },
    });
    emitToUser(item.order.userId, "order:status_update", {
      orderId: item.orderId,
      status: "PACKED",
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

router.get("/delivery-boys", async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile) return res.status(403).json({ error: "Not verified" });
    const rows = await prisma.deliveryBoyProfile.findMany({
      where: {
        isVerifiedByAgent: true,
        isActive: true,
        assignedShopIds: { has: profile.id },
      },
      select: {
        id: true,
        phone: true,
        user: { select: { name: true, email: true } },
      },
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

const assignSchema = z.object({ deliveryBoyId: z.string().min(1) });
router.put(
  "/orders/:itemId/assign-delivery",
  validateBody(assignSchema),
  async (req, res, next) => {
    try {
      const profile = await prisma.heroProfile.findUnique({
        where: { userId: req.user!.id },
      });
      if (!profile) return res.status(403).json({ error: "Not verified" });
      const item = await prisma.orderItem.findUnique({
        where: { id: req.params.itemId },
        select: { heroId: true, orderId: true, order: { select: { userId: true } } },
      });
      if (!item || item.heroId !== profile.id)
        return res.status(404).json({ error: "Item not found" });

      const dboy = await prisma.deliveryBoyProfile.findUnique({
        where: { id: req.body.deliveryBoyId },
        select: {
          id: true,
          assignedShopIds: true,
          userId: true,
          user: { select: { name: true } },
        },
      });
      if (!dboy || !dboy.assignedShopIds.includes(profile.id)) {
        return res
          .status(400)
          .json({ error: "Delivery boy is not assigned to your shop" });
      }
      const updated = await prisma.orderItem.update({
        where: { id: req.params.itemId },
        data: {
          assignedDeliveryBoyId: dboy.id,
          deliveryBoyConfirmedAt: new Date(),
          subOrderStatus: "ASSIGNED_DELIVERY",
        },
      });
      await prisma.order.update({
        where: { id: item.orderId },
        data: { status: "OUT_FOR_DELIVERY" },
      });
      // Update PaymentRecord to associate the delivery boy
      await prisma.paymentRecord.updateMany({
        where: { orderId: item.orderId, heroId: profile.id, deliveryBoyId: null },
        data: { deliveryBoyId: dboy.id },
      });

      emitToUser(dboy.userId, "delivery:assigned", {
        orderItemId: updated.id,
        orderId: item.orderId,
      });
      emitToUser(item.order.userId, "order:status_update", {
        orderId: item.orderId,
        status: "OUT_FOR_DELIVERY",
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  }
);

router.post("/store-page", upload.array("assets", 10), async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({
      where: { userId: req.user!.id },
    });
    if (!profile?.isVerifiedByAgent)
      return res.status(403).json({ error: "Not yet verified" });

    const html = (req.body as any).html as string;
    const assets = (req.files as Express.Multer.File[]) || [];

    // Validate HTML size
    if (html.length > 200 * 1024) {
      return res.status(400).json({ error: "HTML content exceeds 200KB limit" });
    }

    // Upload assets to Cloudinary
    const uploadedAssets = await Promise.all(
      assets.map(async (file) => {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: "hero-store-pages",
          resource_type: "image",
        });
        return { name: file.originalname, url: result.secure_url };
      })
    );

    // Update profile with store page content
    await prisma.heroProfile.update({
      where: { id: profile.id },
      data: {
        storePageContent: {
          html,
          assets: uploadedAssets,
        },
      },
    });

    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

// ─── Availability toggle ─────────────────────────────────────────────────────
router.put("/availability", async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ error: "Hero not found" });
    const { isAvailable } = req.body as { isAvailable: boolean };
    const updated = await prisma.heroProfile.update({
      where: { id: profile.id },
      data: { isAvailable: Boolean(isAvailable) },
      select: { isAvailable: true },
    });

    // Notify slot watchers: re-evaluate availability for all this hero's subcategories
    // across the next 7 days so users see the change immediately (no 30s wait).
    const today = new Date();
    for (const subId of profile.subcategoryIds) {
      for (let d = 0; d < 7; d++) {
        const dt = new Date(today);
        dt.setDate(dt.getDate() + d);
        const dateStr = dt.toISOString().split("T")[0];
        emitService(`slots:${subId}:${dateStr}`, "slot:updated", {
          date: dateStr,
          availabilityChanged: true,
          isAvailable: updated.isAvailable,
        });
      }
    }

    res.json(updated);
  } catch (e) { next(e); }
});

// ─── Slots ────────────────────────────────────────────────────────────────────
// GET /api/hero/slots?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/slots", async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ error: "Hero not found" });

    const from = req.query.from ? new Date(req.query.from as string) : new Date();
    const to = req.query.to
      ? new Date(req.query.to as string)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Get agent slot config for time range
    let slotStartHour = 6, slotEndHour = 20;
    if (profile.verifiedByAgentId) {
      const cfg = await prisma.agentSlotConfig.findUnique({ where: { agentId: profile.verifiedByAgentId } });
      if (cfg) { slotStartHour = cfg.slotStartHour; slotEndHour = cfg.slotEndHour; }
    }

    // Get existing slot records
    const existing = await prisma.heroSlot.findMany({
      where: { heroId: profile.id, date: { gte: from, lte: to } },
      include: { serviceRequest: { select: { id: true, status: true, userName: true, userPhone: true, scheduledHour: true } } },
    });

    res.json({ slots: existing, slotStartHour, slotEndHour });
  } catch (e) { next(e); }
});

// POST /api/hero/slots/busy  — mark/unmark a slot as manually busy
const slotBusySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  hour: z.number().int().min(0).max(23),
  isBusy: z.boolean(),
});
router.post("/slots/busy", validateBody(slotBusySchema), async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ error: "Hero not found" });
    const { date, hour, isBusy } = req.body as z.infer<typeof slotBusySchema>;
    const dateObj = new Date(date);

    const slot = await prisma.heroSlot.upsert({
      where: { heroId_date_hour: { heroId: profile.id, date: dateObj, hour } },
      update: { isBusyByHero: isBusy },
      create: { heroId: profile.id, date: dateObj, hour, isBusyByHero: isBusy },
    });

    // Notify users watching this subcategory's slots in real time
    const subcategoryIds = profile.subcategoryIds;
    for (const subId of subcategoryIds) {
      const key = `${subId}:${date}`;
      emitService(`slots:${key}`, "slot:updated", { date, hour, isBooked: slot.isBooked, isBusy: slot.isBusyByHero });
    }
    res.json(slot);
  } catch (e) { next(e); }
});

// ─── Service Requests (Hero side) ────────────────────────────────────────────
// GET /api/hero/service-requests?status=PENDING|ACCEPTED|COMPLETED|CANCELLED
router.get("/service-requests", async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ error: "Hero not found" });
    const status = (req.query.status as string | undefined)?.toUpperCase();
    const where: any = { heroId: profile.id };
    if (status) where.status = status;
    const requests = await prisma.serviceRequest.findMany({
      where,
      include: {
        subcategory: { select: { id: true, name: true, category: { select: { id: true, name: true } } } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(requests);
  } catch (e) { next(e); }
});

// GET /api/hero/service-requests/incoming — requests broadcast to this hero (PENDING, not yet accepted)
router.get("/service-requests/incoming", async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile || !profile.isVerifiedByAgent) return res.json([]);
    const agentId = profile.verifiedByAgentId!;

    const incoming = await prisma.serviceRequest.findMany({
      where: {
        agentId,
        status: "PENDING",
        subcategoryId: { in: profile.subcategoryIds },
        heroId: null,
      },
      include: {
        subcategory: { select: { id: true, name: true, category: { select: { id: true, name: true } } } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(incoming);
  } catch (e) { next(e); }
});

// POST /api/hero/service-requests/:id/accept
router.post("/service-requests/:id/accept", async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile || !profile.isVerifiedByAgent) return res.status(403).json({ error: "Not verified" });
    if (!profile.isAvailable) return res.status(400).json({ error: "You are currently unavailable" });

    const request = await prisma.serviceRequest.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.status !== "PENDING") return res.status(409).json({ error: "Request already accepted or closed" });
    if (request.agentId !== profile.verifiedByAgentId)
      return res.status(403).json({ error: "Not in your area" });
    if (!profile.subcategoryIds.includes(request.subcategoryId))
      return res.status(403).json({ error: "Not your subcategory" });

    // Atomically: lock slot + accept request in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.heroSlot.findUnique({
        where: { heroId_date_hour: { heroId: profile.id, date: request.scheduledDate, hour: request.scheduledHour } },
      });
      if (existing && (existing.isBooked || existing.isBusyByHero)) {
        // Allow if this hero already accepted another request from the same user session
        const sameSession = await tx.serviceRequest.findFirst({
          where: {
            heroId: profile.id,
            userId: request.userId,
            scheduledDate: request.scheduledDate,
            scheduledHour: request.scheduledHour,
            status: "ACCEPTED",
          },
        });
        if (!sameSession) throw new Error("SLOT_TAKEN");
        // Same session — accept without creating a new slot entry
        return tx.serviceRequest.update({
          where: { id: request.id },
          data: { heroId: profile.id, status: "ACCEPTED" },
          include: {
            hero: { select: { id: true, serviceName: true, shopName: true, phone: true, gender: true, user: { select: { name: true } } } },
            subcategory: { select: { id: true, name: true } },
          },
        });
      }
      const slot = await tx.heroSlot.upsert({
        where: { heroId_date_hour: { heroId: profile.id, date: request.scheduledDate, hour: request.scheduledHour } },
        update: { isBooked: true },
        create: { heroId: profile.id, date: request.scheduledDate, hour: request.scheduledHour, isBooked: true },
      });
      return tx.serviceRequest.update({
        where: { id: request.id },
        data: { heroId: profile.id, slotId: slot.id, status: "ACCEPTED" },
        include: {
          hero: { select: { id: true, serviceName: true, shopName: true, phone: true, gender: true, user: { select: { name: true } } } },
          subcategory: { select: { id: true, name: true } },
        },
      });
    });

    // Notify user via socket
    emitService(`user:${request.userId}`, "service_request:accepted", updated);

    // Notify user via push notification
    sendPushNotification(
      request.userId,
      "Service Request Accepted",
      `${updated.hero?.serviceName ?? "Hero"} has accepted your ${updated.subcategory?.name ?? "service"} request.`
    ).catch((e) => console.error("Push notification failed:", e));

    // Get all other eligible heroes and notify them the booking is taken
    const otherHeroes = await prisma.heroProfile.findMany({
      where: {
        verifiedByAgentId: profile.verifiedByAgentId!,
        subcategoryIds: { has: request.subcategoryId },
        isVerifiedByAgent: true,
        isAvailable: true,
        id: { not: profile.id },
      },
      select: { userId: true },
    });
    for (const h of otherHeroes) {
      emitService(`user:${h.userId}`, "service_request:taken", { requestId: request.id });
    }

    // Notify slot watchers
    const dateStr = request.scheduledDate.toISOString().split("T")[0];
    emitService(`slots:${request.subcategoryId}:${dateStr}`, "slot:updated", {
      date: dateStr, hour: request.scheduledHour, isBooked: true, isBusy: false,
    });

    res.json(updated);
  } catch (e: any) {
    if (e?.message === "SLOT_TAKEN") return res.status(409).json({ error: "Your slot for this time is already taken" });
    next(e);
  }
});

// POST /api/hero/service-requests/:id/decline
router.post("/service-requests/:id/decline", async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile || !profile.isVerifiedByAgent) return res.status(403).json({ error: "Not verified" });

    const request = await prisma.serviceRequest.findUnique({ where: { id: req.params.id } });
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.status !== "PENDING") return res.status(409).json({ error: "Request already processed" });
    if (request.agentId !== profile.verifiedByAgentId)
      return res.status(403).json({ error: "Not in your area" });
    if (!profile.subcategoryIds.includes(request.subcategoryId))
      return res.status(403).json({ error: "Not your subcategory" });

    // Track that this hero declined this request
    await prisma.heroDeclinedRequest.create({
      data: {
        heroId: profile.id,
        requestId: request.id,
      },
    });

    // Check if all eligible heroes have declined
    const totalHeroes = await prisma.heroProfile.count({
      where: {
        verifiedByAgentId: request.agentId,
        isVerifiedByAgent: true,
        isAvailable: true,
        subcategoryIds: { has: request.subcategoryId },
      },
    });
    const declinedCount = await prisma.heroDeclinedRequest.count({
      where: { requestId: request.id },
    });

    console.log("[Decline] Total heroes:", totalHeroes, "Declined:", declinedCount);

    // If all heroes have declined, update request status and notify user
    if (declinedCount >= totalHeroes) {
      await prisma.serviceRequest.update({
        where: { id: request.id },
        data: { status: "CANCELLED" },
      });

      // Notify user
      emitService(`user:${request.userId}`, "service_request:all_declined", {
        requestId: request.id,
        message: "All heroes are busy. Please try a different slot on another day.",
      });

      sendPushNotification(
        request.userId,
        "Service Request Cancelled",
        "All heroes are busy. Please try a different slot on another day."
      ).catch((e) => console.error("Push notification failed:", e));
    }

    res.json({ ok: true });
  } catch (e) { next(e); }
});

// POST /api/hero/service-requests/:id/complete
router.post("/service-requests/:id/complete", async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ error: "Hero not found" });
    const request = await prisma.serviceRequest.findFirst({
      where: { id: req.params.id, heroId: profile.id },
      include: { subcategory: { select: { name: true, category: { select: { name: true } } } } },
    });
    if (!request) return res.status(404).json({ error: "Not found" });
    if (request.status !== "ACCEPTED") return res.status(400).json({ error: "Not accepted" });
    const updated = await prisma.serviceRequest.update({
      where: { id: request.id },
      data: { status: "COMPLETED", completedAt: new Date(), slotId: null },
    });

    const dateStr = (request.scheduledDate as Date).toISOString().split("T")[0];

    // Free the slot only if no other ACCEPTED requests from the same session remain
    const remaining = await prisma.serviceRequest.count({
      where: {
        heroId: profile.id,
        userId: request.userId,
        scheduledDate: request.scheduledDate,
        scheduledHour: request.scheduledHour,
        status: "ACCEPTED",
        id: { not: request.id },
      },
    });
    if (remaining === 0) {
      const slot = request.slotId
        ? await prisma.heroSlot.findUnique({ where: { id: request.slotId } })
        : await prisma.heroSlot.findUnique({
            where: { heroId_date_hour: { heroId: profile.id, date: request.scheduledDate, hour: request.scheduledHour } },
          });
      if (slot) {
        await prisma.heroSlot.update({ where: { id: slot.id }, data: { isBooked: false } });
        emitService(`slots:${request.subcategoryId}:${dateStr}`, "slot:updated", {
          date: dateStr, hour: request.scheduledHour, isBooked: false, isBusy: false,
        });
      }
    }

    emitService(`user:${request.userId}`, "service_request:completed", {
      requestId: request.id,
      subcategoryName: request.subcategory.name,
      categoryName: request.subcategory.category.name,
    });
    res.json(updated);
  } catch (e) { next(e); }
});

// POST /api/hero/service-requests/:id/cancel — hero cancels an accepted request
router.post("/service-requests/:id/cancel", async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ error: "Hero not found" });

    const request = await prisma.serviceRequest.findFirst({
      where: { id: req.params.id, heroId: profile.id },
    });
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (!["PENDING", "ACCEPTED"].includes(request.status))
      return res.status(400).json({ error: "Cannot cancel at this stage" });

    const updated = await prisma.serviceRequest.update({
      where: { id: request.id },
      data: { status: "CANCELLED", heroId: null, slotId: null },
    });

    // Free the slot if it was locked
    if (request.slotId) {
      await prisma.heroSlot.update({
        where: { id: request.slotId },
        data: { isBooked: false },
      }).catch(() => {});
    }

    emitService(`user:${request.userId}`, "service_request:cancelled", { requestId: request.id });
    res.json(updated);
  } catch (e) { next(e); }
});

// ─── Earnings ─────────────────────────────────────────────────────────────────
router.get("/stats", async (req, res, next) => {
  try {
    console.log("[Stats] Fetching stats for user:", req.user!.id);
    const profile = await prisma.heroProfile.findUnique({ where: { userId: req.user!.id } });
    console.log("[Stats] Hero profile:", profile ? `id=${profile.id} verified=${profile.isVerifiedByAgent}` : "NOT FOUND");
    if (!profile) return res.status(404).json({ error: "Hero not found" });

    // Count completed requests
    const completedCount = await prisma.serviceRequest.count({
      where: { heroId: profile.id, status: "COMPLETED" },
    });
    console.log("[Stats] Completed count:", completedCount);

    // Count pending/accepted requests
    const pendingCount = await prisma.serviceRequest.count({
      where: { heroId: profile.id, status: { in: ["PENDING", "ACCEPTED"] } },
    });
    console.log("[Stats] Pending count:", pendingCount);

    // Calculate average rating
    const completedRequestsWithRatings = await prisma.serviceRequest.findMany({
      where: { heroId: profile.id, status: "COMPLETED" },
      include: { bookingRating: true },
    });
    const ratings = completedRequestsWithRatings
      .map((r) => r.bookingRating?.rating)
      .filter((r): r is number => r !== undefined);
    const avgRating = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0;
    console.log("[Stats] Reviews:", ratings.length, "Avg rating:", avgRating);

    // Calculate total earnings
    const completedRequests = await prisma.serviceRequest.findMany({
      where: { heroId: profile.id, status: "COMPLETED" },
      select: { charge: true, discountPercent: true },
    });
    const totalEarnings = completedRequests.reduce(
      (sum, r) => sum + Number(r.charge) * (1 - Number(r.discountPercent ?? 0) / 100),
      0
    );
    console.log("[Stats] Total earnings:", totalEarnings);

    res.json({
      completedCount,
      pendingCount,
      avgRating,
      totalEarnings: Math.round(totalEarnings),
    });
  } catch (e) {
    console.log("[Stats] Error:", e);
    next(e);
  }
});

router.get("/earnings", async (req, res, next) => {
  try {
    console.log("[Earnings] Fetching earnings for user:", req.user!.id);
    const profile = await prisma.heroProfile.findUnique({ where: { userId: req.user!.id } });
    console.log("[Earnings] Hero profile:", profile ? `id=${profile.id}` : "NOT FOUND");
    if (!profile) return res.status(404).json({ error: "Hero not found" });
    
    const requests = await prisma.serviceRequest.findMany({
      where: { heroId: profile.id, status: "COMPLETED" },
      include: { subcategory: { select: { name: true } } },
      orderBy: { completedAt: "desc" },
    });
    console.log("[Earnings] Found", requests.length, "completed requests");

    // Group by date
    const earningsByDate: Record<string, {
      date: string;
      total: number;
      count: number;
      transactions: any[];
    }> = {};

    let totalEarnings = 0;
    for (const r of requests) {
      const base = Number(r.charge);
      const disc = Number(r.discountPercent ?? 0);
      const bulkDisc = Number((r as any).bulkDiscountPercent ?? 0);
      const discounted = base * (1 - disc / 100) * (1 - bulkDisc / 100);
      const transport = Number(r.transportCharge ?? 0);
      const final = discounted + transport;
      
      totalEarnings += final;
      
      const dateStr = r.completedAt ? new Date(r.completedAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      if (!earningsByDate[dateStr]) {
        earningsByDate[dateStr] = {
          date: dateStr,
          total: 0,
          count: 0,
          transactions: [],
        };
      }
      earningsByDate[dateStr].total += final;
      earningsByDate[dateStr].count += 1;
      earningsByDate[dateStr].transactions.push({
        id: r.id,
        service: r.subcategory?.name,
        charge: base,
        discount: disc,
        final: Math.round(final),
        completedAt: r.completedAt,
      });
    }

    const dailyEarnings = Object.values(earningsByDate).sort((a, b) => b.date.localeCompare(a.date));
    
    console.log("[Earnings] Total earnings:", totalEarnings, "Days:", dailyEarnings.length);

    res.json({
      totalEarnings: Math.round(totalEarnings),
      dailyEarnings,
      allTransactions: requests.map(r => ({
        id: r.id,
        service: r.subcategory?.name,
        charge: r.charge,
        discountPercent: r.discountPercent,
        transportCharge: r.transportCharge,
        completedAt: r.completedAt,
        scheduledDate: r.scheduledDate,
      })),
    });
  } catch (e) {
    console.log("[Earnings] Error:", e);
    next(e);
  }
});

export default router;
