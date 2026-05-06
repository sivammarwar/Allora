import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roleGuard";
import { validateBody, validateQuery } from "../middleware/validate";

const router = Router();
router.use(requireAuth, requireRole("PAYMENT_MANAGER"));

// ─── Daily records ─────────────────────────────────────────────────────────
const recordsQuery = z.object({
  date: z.string().optional(), // YYYY-MM-DD
  heroId: z.string().optional(),
  deliveryBoyId: z.string().optional(),
  settled: z.enum(["true", "false", "all"]).optional(),
  paymentMethod: z.enum(["ONLINE", "COD", "all"]).optional(),
});

router.get("/records", validateQuery(recordsQuery), async (req, res, next) => {
  try {
    const q = req.query as unknown as z.infer<typeof recordsQuery>;
    const where: any = {};

    if (q.date) {
      const d = new Date(q.date);
      d.setHours(0, 0, 0, 0);
      where.date = d;
    } else {
      // default: today
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      where.date = d;
    }
    if (q.heroId) where.heroId = q.heroId;
    if (q.deliveryBoyId) where.deliveryBoyId = q.deliveryBoyId;
    if (q.settled === "true") where.isSettled = true;
    if (q.settled === "false") where.isSettled = false;

    const records = await prisma.paymentRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            id: true,
            paymentMethod: true,
            paymentStatus: true,
            status: true,
            totalAmount: true,
            user: { select: { id: true, name: true, email: true } },
            items: {
              select: {
                quantity: true,
                product: { select: { name: true } },
                subcategory: { select: { name: true } },
              },
            },
          },
        },
        hero: {
          select: {
            id: true,
            shopName: true,
            serviceName: true,
            user: { select: { name: true, email: true } },
          },
        },
        deliveryBoy: {
          select: {
            id: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    // Optional payment method filter (post-fetch for simplicity)
    const filtered =
      q.paymentMethod && q.paymentMethod !== "all"
        ? records.filter((r) => r.order.paymentMethod === q.paymentMethod)
        : records;

    // Totals
    const totals = filtered.reduce(
      (acc, r) => {
        acc.amountToHero += Number(r.amountToHero);
        acc.amountToDeliveryBoy += Number(r.amountToDeliveryBoy);
        acc.platformFee += Number(r.platformFee);
        acc.unsettled += r.isSettled ? 0 : Number(r.amountToHero) + Number(r.amountToDeliveryBoy);
        return acc;
      },
      { amountToHero: 0, amountToDeliveryBoy: 0, platformFee: 0, unsettled: 0 }
    );

    res.json({ records: filtered, totals });
  } catch (e) {
    next(e);
  }
});

router.put("/records/:id/settle", async (req, res, next) => {
  try {
    const updated = await prisma.paymentRecord.update({
      where: { id: req.params.id },
      data: {
        isSettled: true,
        settledAt: new Date(),
        settledByPaymentManagerId: req.user!.id,
      },
    });
    res.json(updated);
  } catch (e: any) {
    if (e?.code === "P2025")
      return res.status(404).json({ error: "Record not found" });
    next(e);
  }
});

const bulkSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(500),
});

router.put(
  "/records/bulk-settle",
  validateBody(bulkSchema),
  async (req, res, next) => {
    try {
      const { ids } = req.body as z.infer<typeof bulkSchema>;
      const result = await prisma.paymentRecord.updateMany({
        where: { id: { in: ids }, isSettled: false },
        data: {
          isSettled: true,
          settledAt: new Date(),
          settledByPaymentManagerId: req.user!.id,
        },
      });
      res.json({ ok: true, count: result.count });
    } catch (e) {
      next(e);
    }
  }
);

// ─── Earnings views ────────────────────────────────────────────────────────
router.get("/hero/:id/earnings", async (req, res, next) => {
  try {
    const days = Math.min(
      120,
      Math.max(7, Number(req.query.days) || 30)
    );
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const rows = await prisma.paymentRecord.findMany({
      where: { heroId: req.params.id, date: { gte: since } },
      orderBy: { date: "desc" },
      include: { order: { select: { id: true, paymentMethod: true, paymentStatus: true } } },
    });

    const byDate = new Map<string, {
      date: string;
      orders: number;
      earned: number;
      settled: number;
      pending: number;
    }>();
    for (const r of rows) {
      const k = r.date.toISOString().slice(0, 10);
      const cur = byDate.get(k) ?? { date: k, orders: 0, earned: 0, settled: 0, pending: 0 };
      cur.orders += 1;
      cur.earned += Number(r.amountToHero);
      if (r.isSettled) cur.settled += Number(r.amountToHero);
      else cur.pending += Number(r.amountToHero);
      byDate.set(k, cur);
    }
    const hero = await prisma.heroProfile.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        shopName: true,
        serviceName: true,
        user: { select: { name: true, email: true } },
      },
    });
    if (!hero) return res.status(404).json({ error: "Hero not found" });

    res.json({
      hero,
      days: Array.from(byDate.values()).sort((a, b) =>
        b.date.localeCompare(a.date)
      ),
    });
  } catch (e) {
    next(e);
  }
});

router.get("/delivery/:id/earnings", async (req, res, next) => {
  try {
    const days = Math.min(
      120,
      Math.max(7, Number(req.query.days) || 30)
    );
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const rows = await prisma.paymentRecord.findMany({
      where: { deliveryBoyId: req.params.id, date: { gte: since } },
      orderBy: { date: "desc" },
    });

    const byDate = new Map<string, {
      date: string;
      orders: number;
      earned: number;
      settled: number;
      pending: number;
    }>();
    for (const r of rows) {
      const k = r.date.toISOString().slice(0, 10);
      const cur = byDate.get(k) ?? { date: k, orders: 0, earned: 0, settled: 0, pending: 0 };
      cur.orders += 1;
      cur.earned += Number(r.amountToDeliveryBoy);
      if (r.isSettled) cur.settled += Number(r.amountToDeliveryBoy);
      else cur.pending += Number(r.amountToDeliveryBoy);
      byDate.set(k, cur);
    }
    const dboy = await prisma.deliveryBoyProfile.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        phone: true,
        user: { select: { name: true, email: true } },
      },
    });
    if (!dboy) return res.status(404).json({ error: "Delivery boy not found" });

    res.json({
      deliveryBoy: dboy,
      days: Array.from(byDate.values()).sort((a, b) =>
        b.date.localeCompare(a.date)
      ),
    });
  } catch (e) {
    next(e);
  }
});

// Lookups for filters
router.get("/heroes", async (_req, res, next) => {
  try {
    const rows = await prisma.heroProfile.findMany({
      where: { isActive: true },
      select: {
        id: true,
        shopName: true,
        serviceName: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.get("/delivery-boys", async (_req, res, next) => {
  try {
    const rows = await prisma.deliveryBoyProfile.findMany({
      where: { isActive: true },
      select: {
        id: true,
        phone: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// Stats
router.get("/stats", async (_req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [todayRecs, unsettled] = await Promise.all([
      prisma.paymentRecord.findMany({
        where: { date: today },
        select: { amountToHero: true, amountToDeliveryBoy: true, platformFee: true, isSettled: true },
      }),
      prisma.paymentRecord.aggregate({
        where: { isSettled: false },
        _sum: { amountToHero: true, amountToDeliveryBoy: true },
        _count: true,
      }),
    ]);

    const todaySum = todayRecs.reduce(
      (acc, r) => {
        acc.amountToHero += Number(r.amountToHero);
        acc.amountToDeliveryBoy += Number(r.amountToDeliveryBoy);
        acc.platformFee += Number(r.platformFee);
        return acc;
      },
      { amountToHero: 0, amountToDeliveryBoy: 0, platformFee: 0 }
    );

    res.json({
      today: { records: todayRecs.length, ...todaySum },
      unsettled: {
        records: unsettled._count,
        amountToHero: Number(unsettled._sum.amountToHero ?? 0),
        amountToDeliveryBoy: Number(unsettled._sum.amountToDeliveryBoy ?? 0),
      },
    });
  } catch (e) {
    next(e);
  }
});

export default router;
