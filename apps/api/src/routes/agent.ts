import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { validatePolygon } from "../lib/geo";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roleGuard";
import { validateBody } from "../middleware/validate";
import { emitToUser } from "../socket";

const router = Router();
router.use(requireAuth, requireRole("AGENT"));

/** Fetch (or create) the agent profile for the current user. */
async function getAgentProfile(userId: string) {
  return prisma.agentProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

// ─── Workspace (areas) ─────────────────────────────────────────────────────
router.get("/areas", async (req, res, next) => {
  try {
    const profile = await getAgentProfile(req.user!.id);
    const links = await prisma.agentArea.findMany({
      where: { agentId: profile.id },
      include: { area: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(
      links.map((l) => ({
        id: l.area.id,
        name: l.area.name,
        code: l.area.code,
        polygon: l.area.polygon,
      }))
    );
  } catch (e) {
    next(e);
  }
});

const workspaceSchema = z.object({
  areaName: z.string().trim().min(1),
  areaCode: z.string().trim().regex(/^[A-Za-z0-9]{20}$/, "Code must be 20 chars"),
});

router.post(
  "/workspace",
  validateBody(workspaceSchema),
  async (req, res, next) => {
    try {
      const { areaName, areaCode } = req.body as z.infer<typeof workspaceSchema>;
      const area = await prisma.area.findUnique({
        where: { code: areaCode.toUpperCase() },
      });
      if (!area) {
        return res.status(404).json({ error: "No area matches that code" });
      }
      if (area.name.trim().toLowerCase() !== areaName.trim().toLowerCase()) {
        return res
          .status(400)
          .json({ error: "Area name does not match the code" });
      }
      const profile = await getAgentProfile(req.user!.id);
      await prisma.agentArea.upsert({
        where: { agentId_areaId: { agentId: profile.id, areaId: area.id } },
        update: {},
        create: { agentId: profile.id, areaId: area.id },
      });
      if (!profile.primaryAreaId) {
        await prisma.agentProfile.update({
          where: { id: profile.id },
          data: { primaryAreaId: area.id },
        });
      }
      res.json({ id: area.id, name: area.name, code: area.code });
    } catch (e) {
      next(e);
    }
  }
);

// ─── Verification requests ─────────────────────────────────────────────────
router.get("/requests", async (req, res, next) => {
  try {
    const profile = await getAgentProfile(req.user!.id);
    const myAreaIds = (
      await prisma.agentArea.findMany({
        where: { agentId: profile.id },
        select: { areaId: true },
      })
    ).map((a) => a.areaId);

    if (myAreaIds.length === 0) return res.json([]);

    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const areaId = typeof req.query.areaId === "string" ? req.query.areaId : undefined;

    const rows = await prisma.verificationRequest.findMany({
      where: {
        areaId: areaId ? areaId : { in: myAreaIds },
        ...(status && { status: status as any }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        requester: { select: { id: true, email: true, name: true } },
      },
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.get("/requests/:id", async (req, res, next) => {
  try {
    const profile = await getAgentProfile(req.user!.id);
    const myAreaIds = (
      await prisma.agentArea.findMany({
        where: { agentId: profile.id },
        select: { areaId: true },
      })
    ).map((a) => a.areaId);

    const row = await prisma.verificationRequest.findUnique({
      where: { id: req.params.id },
      include: {
        requester: { select: { id: true, email: true, name: true } },
      },
    });
    if (!row || (row.areaId && !myAreaIds.includes(row.areaId))) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json(row);
  } catch (e) {
    next(e);
  }
});

const statusSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "REJECTED"]),
});
router.put(
  "/requests/:id/status",
  validateBody(statusSchema),
  async (req, res, next) => {
    try {
      const profile = await getAgentProfile(req.user!.id);
      const updated = await prisma.verificationRequest.update({
        where: { id: req.params.id },
        data: {
          status: req.body.status,
          agentId: profile.id,
        },
      });
      emitToUser(updated.requesterId, "verification:status_update", {
        requestId: updated.id,
        status: updated.status,
        message:
          updated.status === "IN_PROGRESS"
            ? "An agent is on the way to your location."
            : "Verification status updated.",
      });
      res.json(updated);
    } catch (e: any) {
      if (e?.code === "P2025")
        return res.status(404).json({ error: "Request not found" });
      next(e);
    }
  }
);

// ─── Verify as Hero ────────────────────────────────────────────────────────
// Agent confirms/overrides the hero's submitted details during physical
// verification. The hero's service-area polygon is automatically inherited
// from the agent's assigned area (request.areaId). The agent picks ONE OR
// MORE categories the hero is allowed to operate under. These values are
// canonical and cannot be edited by the hero afterwards.
const verifyHeroSchema = z.object({
  requestId: z.string().min(1),
  requiresDelivery: z.boolean(),
  categoryIds: z.array(z.string().min(1)).min(1),
  subcategoryIds: z.array(z.string().min(1)).optional(),
  shopName: z.string().trim().min(1).max(120),
  serviceName: z.string().trim().min(1).max(120).optional(),
  profileImageUrl: z.string().url(),
});

router.post(
  "/verify/hero",
  validateBody(verifyHeroSchema),
  async (req, res, next) => {
    try {
      const profile = await getAgentProfile(req.user!.id);
      const { requestId, requiresDelivery, categoryIds, subcategoryIds, shopName, serviceName, profileImageUrl } = req.body as z.infer<typeof verifyHeroSchema>;

      const request = await prisma.verificationRequest.findUnique({
        where: { id: requestId },
        include: { area: true },
      });
      if (!request || request.requestType !== "HERO") {
        return res.status(404).json({ error: "Hero request not found" });
      }

      // The hero's service area = the area assigned to the agent for this
      // request (admin-drawn polygon). Fall back to the agent's primaryArea
      // if for some reason areaId is missing.
      let inheritedPolygon: any = null;
      if (request.area?.polygon) {
        inheritedPolygon = request.area.polygon;
      } else if (profile.primaryAreaId) {
        const fallback = await prisma.area.findUnique({
          where: { id: profile.primaryAreaId },
          select: { polygon: true },
        });
        inheritedPolygon = fallback?.polygon ?? null;
      }
      if (!inheritedPolygon) {
        return res.status(400).json({
          error:
            "Cannot derive service area: no area linked to this request and you have no primary area.",
        });
      }
      const validatedPolygon = validatePolygon(inheritedPolygon);

      // Validate the agent-selected categories & subcategories actually exist
      // (subcategories must belong to one of the chosen categories).
      const [cats, subs] = await Promise.all([
        prisma.category.findMany({
          where: { id: { in: categoryIds }, isActive: true },
          select: { id: true },
        }),
        subcategoryIds && subcategoryIds.length > 0
          ? prisma.subcategory.findMany({
              where: { id: { in: subcategoryIds }, categoryId: { in: categoryIds } },
              select: { id: true },
            })
          : Promise.resolve([]),
      ]);
      if (cats.length !== categoryIds.length) {
        return res.status(400).json({ error: "One or more categories are invalid" });
      }
      if (subcategoryIds && subcategoryIds.length > 0 && subs.length !== subcategoryIds.length) {
        return res.status(400).json({
          error: "One or more subcategories don't belong to the chosen categories",
        });
      }

      const details = request.details as any;
      const finalServiceName = serviceName ?? details.serviceName;

      const result = await prisma.$transaction(async (tx) => {
        // Update user role to HERO
        await tx.user.update({
          where: { id: request.requesterId },
          data: { role: "HERO", isVerified: true },
        });

        // Create or update the HeroProfile (agent values are canonical)
        const hero = await tx.heroProfile.upsert({
          where: { userId: request.requesterId },
          update: {
            shopName,
            serviceName: finalServiceName,
            categoryIds,
            subcategoryIds,
            phone: details.phone,
            address: details.address,
            locationLat: details.locationLat,
            locationLng: details.locationLng,
            serviceAreaPolygon: validatedPolygon as any,
            requiresDelivery,
            isVerifiedByAgent: true,
            verifiedByAgentId: profile.id,
            profileImageUrl,
          },
          create: {
            userId: request.requesterId,
            shopName,
            serviceName: finalServiceName,
            categoryIds,
            subcategoryIds,
            phone: details.phone,
            address: details.address,
            locationLat: details.locationLat,
            locationLng: details.locationLng,
            serviceAreaPolygon: validatedPolygon as any,
            requiresDelivery,
            isVerifiedByAgent: true,
            verifiedByAgentId: profile.id,
            profileImageUrl,
          },
        });

        await tx.verificationRequest.update({
          where: { id: requestId },
          data: { status: "VERIFIED", agentId: profile.id },
        });

        return hero;
      });

      emitToUser(request.requesterId, "verification:status_update", {
        requestId,
        status: "VERIFIED",
        message: "You're verified! Log out and sign in at /hero/login to access your hero dashboard.",
      });

      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

// ─── Heroes (in agent's areas) needing delivery — for the boy-verify step ──
router.get("/heroes-needing-delivery", async (req, res, next) => {
  try {
    const profile = await getAgentProfile(req.user!.id);
    const areaId =
      typeof req.query.areaId === "string" ? req.query.areaId : undefined;

    const myAreaIds = (
      await prisma.agentArea.findMany({
        where: { agentId: profile.id },
        ...(areaId && { where: { agentId: profile.id, areaId } }),
        select: { areaId: true },
      })
    ).map((a) => a.areaId);

    if (myAreaIds.length === 0) return res.json([]);

    // We don't store hero→area linkage; instead surface heroes verified by
    // this agent (they were verified within this agent's areas).
    const heroes = await prisma.heroProfile.findMany({
      where: {
        verifiedByAgentId: profile.id,
        requiresDelivery: true,
        isActive: true,
      },
      select: {
        id: true,
        shopName: true,
        serviceName: true,
        locationLat: true,
        locationLng: true,
        user: { select: { name: true, email: true } },
      },
    });
    res.json(heroes);
  } catch (e) {
    next(e);
  }
});

// ─── Verify as Delivery Boy ────────────────────────────────────────────────
const verifyDeliverySchema = z.object({
  requestId: z.string().min(1),
  shopIds: z.array(z.string().min(1)).min(1),
});

router.post(
  "/verify/delivery-boy",
  validateBody(verifyDeliverySchema),
  async (req, res, next) => {
    try {
      const profile = await getAgentProfile(req.user!.id);
      const { requestId, shopIds } = req.body as z.infer<typeof verifyDeliverySchema>;

      const request = await prisma.verificationRequest.findUnique({
        where: { id: requestId },
      });
      if (!request || request.requestType !== "DELIVERY_BOY") {
        return res.status(404).json({ error: "Delivery request not found" });
      }
      const details = request.details as any;

      // Verify shops are real and belong to this agent's heroes
      const validShops = await prisma.heroProfile.findMany({
        where: { id: { in: shopIds }, verifiedByAgentId: profile.id },
        select: { id: true },
      });
      if (validShops.length !== shopIds.length) {
        return res.status(400).json({ error: "One or more shopIds are invalid" });
      }

      const result = await prisma.$transaction(async (tx) => {
        const dboy = await tx.deliveryBoyProfile.upsert({
          where: { userId: request.requesterId },
          update: {
            phone: details.phone,
            address: details.address,
            locationLat: details.locationLat,
            locationLng: details.locationLng,
            purpose: details.purpose ?? null,
            assignedShopIds: shopIds,
            isVerifiedByAgent: true,
            verifiedByAgentId: profile.id,
            profileImageUrl: details.profileImageUrl ?? null,
          },
          create: {
            userId: request.requesterId,
            phone: details.phone,
            address: details.address,
            locationLat: details.locationLat,
            locationLng: details.locationLng,
            purpose: details.purpose ?? null,
            assignedShopIds: shopIds,
            isVerifiedByAgent: true,
            verifiedByAgentId: profile.id,
            profileImageUrl: details.profileImageUrl ?? null,
          },
        });

        await tx.verificationRequest.update({
          where: { id: requestId },
          data: { status: "VERIFIED", agentId: profile.id },
        });

        return dboy;
      });

      emitToUser(request.requesterId, "verification:status_update", {
        requestId,
        status: "VERIFIED",
        message: "You're verified! Open the dashboard to see assignments.",
      });

      res.json(result);
    } catch (e) {
      next(e);
    }
  }
);

// ─── Global Item Catalog ──────────────────────────────────────────────────────

const catalogItemSchema = z.object({
  name: z.string().trim().min(1),
  brandName: z.string().trim().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
});

router.get("/items", async (req, res, next) => {
  try {
    const { search } = req.query;
    const items = await prisma.agentItem.findMany({
      where: {
        isActive: true,
        ...(search
          ? {
              OR: [
                { name: { contains: String(search), mode: "insensitive" } },
                { brandName: { contains: String(search), mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    });
    res.json(items);
  } catch (e) {
    next(e);
  }
});

router.post("/items", validateBody(catalogItemSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof catalogItemSchema>;
    const item = await prisma.agentItem.create({
      data: {
        name: body.name,
        brandName: body.brandName ?? null,
        imageUrl: body.imageUrl ?? null,
      },
    });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

router.put("/items/:id", validateBody(catalogItemSchema.partial()), async (req, res, next) => {
  try {
    const item = await prisma.agentItem.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(item);
  } catch (e) {
    next(e);
  }
});

router.delete("/items/:id", async (req, res, next) => {
  try {
    await prisma.agentItem.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ─── Agent Inventory ──────────────────────────────────────────────────────────

const inventoryItemSchema = z.object({
  itemId: z.string().min(1),
  quantity: z.number().int().min(0),
  mrp: z.number().positive().optional().nullable(),
  price: z.number().positive(),
  specification: z.string().trim().optional().nullable(),
});

const inventoryUpdateSchema = z.object({
  quantity: z.number().int().min(0).optional(),
  mrp: z.number().positive().optional().nullable(),
  price: z.number().positive().optional(),
  specification: z.string().trim().optional().nullable(),
});

router.get("/inventory", async (req, res, next) => {
  try {
    const profile = await getAgentProfile(req.user!.id);
    const { search } = req.query;
    const rows = await prisma.agentInventoryItem.findMany({
      where: {
        agentId: profile.id,
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
      include: { item: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.post("/inventory", validateBody(inventoryItemSchema), async (req, res, next) => {
  try {
    const profile = await getAgentProfile(req.user!.id);
    const body = req.body as z.infer<typeof inventoryItemSchema>;
    const row = await prisma.agentInventoryItem.upsert({
      where: { agentId_itemId: { agentId: profile.id, itemId: body.itemId } },
      update: {
        quantity: body.quantity,
        mrp: body.mrp ?? null,
        price: body.price,
        specification: body.specification ?? null,
        isActive: true,
      },
      create: {
        agentId: profile.id,
        itemId: body.itemId,
        quantity: body.quantity,
        mrp: body.mrp ?? null,
        price: body.price,
        specification: body.specification ?? null,
      },
      include: { item: true },
    });
    res.json(row);
  } catch (e) {
    next(e);
  }
});

router.put("/inventory/:id", validateBody(inventoryUpdateSchema), async (req, res, next) => {
  try {
    const profile = await getAgentProfile(req.user!.id);
    const existing = await prisma.agentInventoryItem.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.agentId !== profile.id) {
      return res.status(404).json({ error: "Inventory item not found" });
    }
    const row = await prisma.agentInventoryItem.update({
      where: { id: req.params.id },
      data: req.body,
      include: { item: true },
    });
    res.json(row);
  } catch (e) {
    next(e);
  }
});

router.delete("/inventory/:id", async (req, res, next) => {
  try {
    const profile = await getAgentProfile(req.user!.id);
    const existing = await prisma.agentInventoryItem.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.agentId !== profile.id) {
      return res.status(404).json({ error: "Inventory item not found" });
    }
    await prisma.agentInventoryItem.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ─── Secret Shop Verification ────────────────────────────────────────────────

router.get("/secret-shop-requests", async (req, res, next) => {
  try {
    const profile = await getAgentProfile(req.user!.id);
    const requests = await prisma.secretShopRequest.findMany({
      where: {
        OR: [{ agentId: profile.id }, { agentId: null }],
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json(requests);
  } catch (e) {
    next(e);
  }
});

router.get("/verified-secret-shops", async (req, res, next) => {
  try {
    const profile = await getAgentProfile(req.user!.id);
    const shops = await prisma.secretShopProfile.findMany({
      where: { verifiedByAgentId: profile.id, isActive: true },
      include: {
        user: { select: { id: true, email: true, name: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(shops);
  } catch (e) {
    next(e);
  }
});

const verifySecretShopSchema = z.object({
  requestId: z.string(),
  action: z.enum(["approve", "reject"]),
});

router.post("/secret-shop-requests/verify", validateBody(verifySecretShopSchema), async (req, res, next) => {
  try {
    const profile = await getAgentProfile(req.user!.id);
    const { requestId, action } = req.body as z.infer<typeof verifySecretShopSchema>;

    const request = await prisma.secretShopRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });
    if (!request || (request.agentId !== null && request.agentId !== profile.id)) {
      return res.status(404).json({ error: "Request not found" });
    }
    // Auto-assign unassigned request to this agent
    if (!request.agentId) {
      await prisma.secretShopRequest.update({ where: { id: requestId }, data: { agentId: profile.id } });
      request.agentId = profile.id;
    }

    if (action === "approve") {
      await prisma.$transaction([
        prisma.secretShopRequest.update({
          where: { id: requestId },
          data: { status: "VERIFIED" },
        }),
        prisma.secretShopProfile.upsert({
          where: { userId: request.userId },
          update: {
            isVerifiedByAgent: true,
            verifiedByAgentId: profile.id,
            shopName: request.shopName,
            phone: request.phone,
            address: request.address,
            locationLat: request.locationLat,
            locationLng: request.locationLng,
          },
          create: {
            userId: request.userId,
            isVerifiedByAgent: true,
            verifiedByAgentId: profile.id,
            shopName: request.shopName,
            phone: request.phone,
            address: request.address,
            locationLat: request.locationLat,
            locationLng: request.locationLng,
          },
        }),
      ]);
    } else {
      await prisma.secretShopRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED" },
      });
    }

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ─── Secret Orders ───────────────────────────────────────────────────────────

router.get("/secret-orders", async (req, res, next) => {
  try {
    const profile = await getAgentProfile(req.user!.id);
    const { past, all } = req.query;
    const pastOrders = past === "true";
    const allOrders = all === "true";

    const orders = await prisma.secretOrder.findMany({
      where: {
        agentId: profile.id,
        ...(allOrders ? {} : pastOrders
          ? { status: { in: ["DELIVERED", "CANCELLED"] } }
          : { status: { notIn: ["DELIVERED", "CANCELLED"] } }),
      },
      include: {
        shop: { select: { id: true, shopName: true, phone: true, address: true } },
        items: {
          include: {
            inventoryItem: {
              include: {
                item: { select: { id: true, name: true, brandName: true, imageUrl: true } },
              },
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

const updateOrderStatusSchema = z.object({
  status: z.enum(["RECEIVED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]),
});

router.put("/secret-orders/:id/status", validateBody(updateOrderStatusSchema), async (req, res, next) => {
  try {
    const profile = await getAgentProfile(req.user!.id);
    const order = await prisma.secretOrder.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!order || order.agentId !== profile.id) {
      return res.status(404).json({ error: "Order not found" });
    }
    if (req.body.status === "DELIVERED") {
      const allMarked = order.items.every((i) => i.isPacked || i.isRejected);
      if (!allMarked) {
        return res.status(400).json({ error: "Mark every item as packed or rejected before delivering" });
      }
    }
    const updated = await prisma.secretOrder.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

const itemStatusSchema = z.object({
  isPacked: z.boolean().optional(),
  isRejected: z.boolean().optional(),
});

router.patch("/secret-orders/:orderId/items/:itemId", validateBody(itemStatusSchema), async (req, res, next) => {
  try {
    const profile = await getAgentProfile(req.user!.id);
    const order = await prisma.secretOrder.findUnique({
      where: { id: req.params.orderId },
      select: { agentId: true },
    });
    if (!order || order.agentId !== profile.id) {
      return res.status(404).json({ error: "Order not found" });
    }
    const body = req.body as z.infer<typeof itemStatusSchema>;
    const updated = await prisma.secretOrderItem.update({
      where: { id: req.params.itemId },
      data: {
        ...(body.isPacked !== undefined && { isPacked: body.isPacked }),
        ...(body.isRejected !== undefined && { isRejected: body.isRejected }),
      },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// ─── COD payment collection status ──────────────────────────────────────────
router.patch("/secret-orders/:id/cod-payment", async (req, res, next) => {
  try {
    const profile = await getAgentProfile(req.user!.id);
    const { collected } = req.body as { collected: boolean };
    const order = await prisma.secretOrder.findUnique({
      where: { id: req.params.id },
      select: { agentId: true, paymentMode: true, status: true, paymentStatus: true },
    });
    if (!order || order.agentId !== profile.id) {
      return res.status(404).json({ error: "Order not found" });
    }
    // Allow COD always; allow ONLINE only if payment is still PENDING (gateway missed the webhook)
    if (order.paymentMode !== "COD" && order.paymentStatus !== "PENDING") {
      return res.status(400).json({ error: "Payment already confirmed via gateway" });
    }
    if (order.status !== "DELIVERED") {
      return res.status(400).json({ error: "Order must be delivered first" });
    }
    const updated = await prisma.secretOrder.update({
      where: { id: req.params.id },
      data: { paymentStatus: collected ? "PAID" : "PENDING" },
    });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// ─── Verified Heroes list ────────────────────────────────────────────────────
router.get("/verified-heroes", async (req, res, next) => {
  try {
    const profile = await getAgentProfile(req.user!.id);
    const heroes = await prisma.heroProfile.findMany({
      where: { verifiedByAgentId: profile.id, isActive: true },
      select: {
        id: true,
        shopName: true,
        serviceName: true,
        phone: true,
        address: true,
        categoryIds: true,
        subcategoryIds: true,
        requiresDelivery: true,
        profileImageUrl: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(heroes);
  } catch (e) {
    next(e);
  }
});

// ─── Verified Delivery Boys list ─────────────────────────────────────────────
router.get("/verified-delivery-boys", async (req, res, next) => {
  try {
    const profile = await getAgentProfile(req.user!.id);
    const boys = await prisma.deliveryBoyProfile.findMany({
      where: { verifiedByAgentId: profile.id, isActive: true },
      select: {
        id: true,
        phone: true,
        address: true,
        purpose: true,
        assignedShopIds: true,
        profileImageUrl: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(boys);
  } catch (e) {
    next(e);
  }
});

// ─── Stats ─────────────────────────────────────────────────────────────────
router.get("/stats", async (req, res, next) => {
  try {
    const profile = await getAgentProfile(req.user!.id);
    const myAreaIds = (
      await prisma.agentArea.findMany({
        where: { agentId: profile.id },
        select: { areaId: true },
      })
    ).map((a) => a.areaId);

    const [pendingRequests, verifiedHeroes, verifiedDeliveryBoys] = await Promise.all([
      prisma.verificationRequest.count({
        where: { areaId: { in: myAreaIds }, status: "PENDING" },
      }),
      prisma.heroProfile.count({ where: { verifiedByAgentId: profile.id } }),
      prisma.deliveryBoyProfile.count({ where: { verifiedByAgentId: profile.id } }),
    ]);
    res.json({
      areas: myAreaIds.length,
      pendingRequests,
      verifiedHeroes,
      verifiedDeliveryBoys,
    });
  } catch (e) {
    next(e);
  }
});

export default router;
