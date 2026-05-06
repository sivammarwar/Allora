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
