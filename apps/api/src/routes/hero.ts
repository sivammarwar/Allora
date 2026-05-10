import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import * as turf from "@turf/turf";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roleGuard";
import { validateBody } from "../middleware/validate";
import { emitToUser, emitService } from "../socket";
import { v2 as cloudinary } from "cloudinary";

const router = Router();
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
        verifiedByAgent: {
          select: { id: true, user: { select: { name: true, email: true } } },
        },
      },
    });
    if (profile?.isVerifiedByAgent && profile?.isActive) {
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

    // Notify user
    emitService(`user:${request.userId}`, "service_request:accepted", updated);

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

// POST /api/hero/service-requests/:id/complete
router.post("/service-requests/:id/complete", async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ error: "Hero not found" });
    const request = await prisma.serviceRequest.findFirst({
      where: { id: req.params.id, heroId: profile.id },
    });
    if (!request) return res.status(404).json({ error: "Not found" });
    if (request.status !== "ACCEPTED") return res.status(400).json({ error: "Not accepted" });
    const updated = await prisma.serviceRequest.update({
      where: { id: request.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
    emitService(`user:${request.userId}`, "service_request:completed", { requestId: request.id });
    res.json(updated);
  } catch (e) { next(e); }
});

// ─── Earnings ─────────────────────────────────────────────────────────────────
router.get("/earnings", async (req, res, next) => {
  try {
    const profile = await prisma.heroProfile.findUnique({ where: { userId: req.user!.id } });
    if (!profile) return res.status(404).json({ error: "Hero not found" });
    const requests = await prisma.serviceRequest.findMany({
      where: { heroId: profile.id, status: { in: ["ACCEPTED", "COMPLETED"] } },
      include: { subcategory: { select: { name: true } } },
      orderBy: { scheduledDate: "desc" },
    });
    const totalEarnings = requests.reduce((sum, r) => {
      const base = Number(r.charge);
      const disc = Number(r.discountPercent);
      const bulkDisc = Number((r as any).bulkDiscountPercent ?? 0);
      const discounted = base * (1 - disc / 100) * (1 - bulkDisc / 100);
      return sum + discounted + Number(r.transportCharge);
    }, 0);
    res.json({ totalEarnings, history: requests });
  } catch (e) { next(e); }
});

export default router;
