import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { validatePolygon } from "../lib/geo";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roleGuard";
import { validateBody } from "../middleware/validate";

const router = Router();

// All admin routes require ADMIN role
router.use(requireAuth, requireRole("ADMIN"));

// ─── Stats ─────────────────────────────────────────────────────────────────
router.get("/stats", async (_req, res, next) => {
  try {
    const [areas, agents, pendingRequests, heroes, deliveryBoys] =
      await Promise.all([
        prisma.area.count(),
        prisma.agentProfile.count(),
        prisma.verificationRequest.count({ where: { status: "PENDING" } }),
        prisma.heroProfile.count({ where: { isVerifiedByAgent: true } }),
        prisma.deliveryBoyProfile.count({ where: { isVerifiedByAgent: true } }),
      ]);
    res.json({ areas, agents, pendingRequests, heroes, deliveryBoys });
  } catch (e) {
    next(e);
  }
});

// ─── Areas ─────────────────────────────────────────────────────────────────
router.get("/areas", async (req, res, next) => {
  try {
    const compact = (req.query as any).fields === "options";
    const rows = await prisma.area.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { agentAreas: true, primaryForAgents: true } },
      },
    });
    if (compact) {
      return res.json(
        rows.map((a) => ({ id: a.id, name: a.name, code: a.code }))
      );
    }
    res.json(
      rows.map((a) => ({
        id: a.id,
        name: a.name,
        code: a.code,
        polygon: a.polygon,
        agentCount: a._count.agentAreas,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      }))
    );
  } catch (e) {
    next(e);
  }
});

const upsertAreaSchema = z.object({
  name: z.string().trim().min(2).max(100),
  code: z
    .string()
    .regex(/^[A-Za-z0-9]{20}$/, "code must be exactly 20 alphanumeric characters"),
  polygon: z.any(),
});

router.post(
  "/areas",
  validateBody(upsertAreaSchema),
  async (req, res, next) => {
    try {
      const { name, code, polygon } = req.body as z.infer<typeof upsertAreaSchema>;
      const validated = validatePolygon(polygon);
      const created = await prisma.area.create({
        data: { name, code: code.toUpperCase(), polygon: validated as any },
      });
      res.status(201).json(created);
    } catch (e: any) {
      if (e?.code === "P2002") {
        return res.status(409).json({ error: "Area code already exists" });
      }
      next(e);
    }
  }
);

router.put(
  "/areas/:id",
  validateBody(upsertAreaSchema),
  async (req, res, next) => {
    try {
      const { name, code, polygon } = req.body as z.infer<typeof upsertAreaSchema>;
      const validated = validatePolygon(polygon);
      const updated = await prisma.area.update({
        where: { id: req.params.id },
        data: { name, code: code.toUpperCase(), polygon: validated as any },
      });
      res.json(updated);
    } catch (e: any) {
      if (e?.code === "P2002") {
        return res.status(409).json({ error: "Area code already exists" });
      }
      if (e?.code === "P2025") {
        return res.status(404).json({ error: "Area not found" });
      }
      next(e);
    }
  }
);

router.delete("/areas/:id", async (req, res, next) => {
  try {
    await prisma.area.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") {
      return res.status(404).json({ error: "Area not found" });
    }
    if (e?.code === "P2003") {
      return res
        .status(409)
        .json({ error: "Area is referenced by agents and cannot be deleted" });
    }
    next(e);
  }
});

// ─── Agents ────────────────────────────────────────────────────────────────
router.get("/agents", async (_req, res, next) => {
  try {
    const rows = await prisma.agentProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, email: true, name: true } },
        primaryArea: { select: { id: true, name: true, code: true } },
        agentAreas: {
          include: { area: { select: { id: true, name: true, code: true } } },
        },
      },
    });
    res.json(
      rows.map((a) => ({
        id: a.id,
        user: a.user,
        primaryArea: a.primaryArea,
        agentAreas: a.agentAreas.map((aa) => aa.area),
        isVerifiedByAdmin: a.isVerifiedByAdmin,
        addedAt: a.createdAt,
      }))
    );
  } catch (e) {
    next(e);
  }
});

const createAgentSchema = z.object({
  email: z.string().email().transform((s) => s.toLowerCase()),
  name: z.string().trim().min(1).max(120).optional(),
  areaIds: z.array(z.string().min(1)).min(1, "Assign at least one area"),
});

router.post(
  "/agents",
  validateBody(createAgentSchema),
  async (req, res, next) => {
    try {
      const { email, name, areaIds } = req.body as z.infer<typeof createAgentSchema>;

      // Verify all areas exist
      const areas = await prisma.area.findMany({
        where: { id: { in: areaIds } },
        select: { id: true },
      });
      if (areas.length !== areaIds.length) {
        return res.status(400).json({ error: "One or more areaIds are invalid" });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Upsert user with role=AGENT (refuse if existing user has different role)
        const existing = await tx.user.findUnique({ where: { email } });
        if (existing && existing.role !== "AGENT") {
          throw Object.assign(
            new Error(
              `Email already registered as ${existing.role}. Use a different email.`
            ),
            { status: 409 }
          );
        }
        const user =
          existing ??
          (await tx.user.create({
            data: { email, name: name ?? null, role: "AGENT", isActive: true },
          }));

        const profile = await tx.agentProfile.upsert({
          where: { userId: user.id },
          update: {
            isVerifiedByAdmin: true,
            addedByAdminAt: new Date(),
            primaryAreaId: areaIds[0],
          },
          create: {
            userId: user.id,
            isVerifiedByAdmin: true,
            addedByAdminAt: new Date(),
            primaryAreaId: areaIds[0],
          },
        });

        // Replace AgentArea links
        await tx.agentArea.deleteMany({ where: { agentId: profile.id } });
        await tx.agentArea.createMany({
          data: areaIds.map((areaId) => ({ agentId: profile.id, areaId })),
          skipDuplicates: true,
        });

        return profile;
      });

      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  }
);

router.delete("/agents/:id", async (req, res, next) => {
  try {
    // Cascade-delete the AgentProfile + AgentArea, leave the User but
    // demote them to USER role for safety.
    await prisma.$transaction(async (tx) => {
      const profile = await tx.agentProfile.findUnique({
        where: { id: req.params.id },
        select: { userId: true },
      });
      if (!profile) {
        throw Object.assign(new Error("Agent not found"), { status: 404 });
      }
      await tx.agentProfile.delete({ where: { id: req.params.id } });
      await tx.user.update({
        where: { id: profile.userId },
        data: { role: "USER" },
      });
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get("/agents/:id/verified-providers", async (req, res, next) => {
  try {
    const [heroes, deliveryBoys] = await Promise.all([
      prisma.heroProfile.findMany({
        where: { verifiedByAgentId: req.params.id },
        select: {
          id: true,
          serviceName: true,
          shopName: true,
          phone: true,
          locationLat: true,
          locationLng: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
      prisma.deliveryBoyProfile.findMany({
        where: { verifiedByAgentId: req.params.id },
        select: {
          id: true,
          phone: true,
          locationLat: true,
          locationLng: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
        },
      }),
    ]);
    res.json({ heroes, deliveryBoys });
  } catch (e) {
    next(e);
  }
});

// ─── Settings ──────────────────────────────────────────────────────────────
router.get("/settings", async (_req, res, next) => {
  try {
    const s = await prisma.globalSetting.upsert({
      where: { id: "global" },
      update: {},
      create: { id: "global", userVisibilityRadiusKm: 5 },
    });
    res.json({ userVisibilityRadiusKm: s.userVisibilityRadiusKm });
  } catch (e) {
    next(e);
  }
});

const settingsSchema = z.object({
  userVisibilityRadiusKm: z.number().int().min(1).max(10),
});

router.put(
  "/settings",
  validateBody(settingsSchema),
  async (req, res, next) => {
    try {
      const { userVisibilityRadiusKm } = req.body as z.infer<typeof settingsSchema>;
      const s = await prisma.globalSetting.upsert({
        where: { id: "global" },
        update: { userVisibilityRadiusKm },
        create: { id: "global", userVisibilityRadiusKm },
      });
      res.json({ userVisibilityRadiusKm: s.userVisibilityRadiusKm });
    } catch (e) {
      next(e);
    }
  }
);

export default router;
