import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();
const ALLOWED_EMAIL = "govindkkp+maininventory@gmail.com";

router.use(requireAuth);
router.use((req, res, next) => {
  if (req.user!.role === "ADMIN" || req.user!.email === ALLOWED_EMAIL) return next();
  return res.status(403).json({ error: "Access denied" });
});

router.get("/", async (_req, res, next) => {
  try {
    const agents = await prisma.agentProfile.findMany({
      where: { isVerifiedByAdmin: true },
      include: {
        user: { select: { name: true, email: true } },
        agentAreas: { take: 1, include: { area: { select: { name: true } } } },
        inventoryItems: {
          where: { isActive: true },
          include: {
            item: {
              select: {
                name: true,
                brandName: true,
                category: { select: { name: true } },
              },
            },
          },
          orderBy: { item: { name: "asc" } },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const result = agents.map((a) => ({
      agentId: a.id,
      agentName: a.user.name ?? a.user.email,
      areaName: a.agentAreas[0]?.area?.name ?? "—",
      items: a.inventoryItems.map((inv) => ({
        id: inv.id,
        name: inv.item.name,
        brand: inv.item.brandName ?? "—",
        category: inv.item.category?.name ?? "—",
        price: Number(inv.price),
        mrp: inv.mrp ? Number(inv.mrp) : null,
        quantity: inv.quantity,
      })),
    }));

    res.json(result);
  } catch (e) {
    next(e);
  }
});

export default router;
