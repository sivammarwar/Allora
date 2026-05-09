import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import * as turf from "@turf/turf";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roleGuard";
import { validateBody } from "../middleware/validate";
import { emitToUser } from "../socket";
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
    if (profile?.isVerifiedByAgent) {
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

    const [subcategories, agentPricing] = await Promise.all([
      prisma.subcategory.findMany({
        where: { id: { in: profile.subcategoryIds } },
        select: {
          id: true,
          name: true,
          category: { select: { name: true, type: true } },
        },
      }),
      profile.verifiedByAgentId
        ? prisma.agentSubcategoryPricing.findMany({
            where: {
              agentId: profile.verifiedByAgentId,
              subcategoryId: { in: profile.subcategoryIds },
            },
            select: {
              subcategoryId: true,
              baseServiceCharge: true,
              transportChargePerKm: true,
            },
          })
        : Promise.resolve([]),
    ]);

    res.json({
      heroId: profile.id,
      categoryIds: profile.categoryIds,
      subcategoryIds: profile.subcategoryIds,
      requiresDelivery: profile.requiresDelivery,
      pricing: profile.pricing,
      subcategories,
      agentPricing,
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

export default router;
