import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roleGuard";
import { validateBody } from "../middleware/validate";

const router = Router();
router.use(requireAuth, requireRole("ITEM_CATALOG"));

// ─── Categories ──────────────────────────────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  imageUrl: z.string().url().optional().nullable(),
});

router.get("/categories", async (req, res, next) => {
  try {
    const cats = await prisma.agentCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    res.json(cats);
  } catch (e) { next(e); }
});

router.post("/categories", validateBody(categorySchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof categorySchema>;
    const cat = await prisma.agentCategory.create({ data: body });
    res.json(cat);
  } catch (e) { next(e); }
});

router.put("/categories/:id", validateBody(categorySchema.partial()), async (req, res, next) => {
  try {
    const cat = await prisma.agentCategory.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(cat);
  } catch (e) { next(e); }
});

router.delete("/categories/:id", async (req, res, next) => {
  try {
    await prisma.agentCategory.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ─── Items ────────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  name: z.string().min(1).max(200),
  brandName: z.string().max(100).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  categoryId: z.string().optional().nullable(),
});

router.get("/items", async (req, res, next) => {
  try {
    const { search, categoryId } = req.query;
    const items = await prisma.agentItem.findMany({
      where: {
        isActive: true,
        ...(categoryId ? { categoryId: String(categoryId) } : {}),
        ...(search ? {
          OR: [
            { name: { contains: String(search), mode: "insensitive" } },
            { brandName: { contains: String(search), mode: "insensitive" } },
          ],
        } : {}),
      },
      include: { category: { select: { id: true, name: true, imageUrl: true } } },
      orderBy: { name: "asc" },
    });
    res.json(items);
  } catch (e) { next(e); }
});

router.post("/items", validateBody(itemSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof itemSchema>;
    const item = await prisma.agentItem.create({
      data: {
        name: body.name,
        brandName: body.brandName ?? null,
        imageUrl: body.imageUrl ?? null,
        categoryId: body.categoryId ?? null,
      },
      include: { category: { select: { id: true, name: true, imageUrl: true } } },
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.put("/items/:id", validateBody(itemSchema.partial()), async (req, res, next) => {
  try {
    const item = await prisma.agentItem.update({
      where: { id: req.params.id },
      data: req.body,
      include: { category: { select: { id: true, name: true, imageUrl: true } } },
    });
    res.json(item);
  } catch (e) { next(e); }
});

router.delete("/items/:id", async (req, res, next) => {
  try {
    await prisma.agentItem.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
