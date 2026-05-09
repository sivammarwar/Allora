import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roleGuard";
import { validateBody } from "../middleware/validate";
import { multiImageUpload } from "../middleware/upload";
import { uploadBuffer, getCloudinary } from "../lib/cloudinary";

const router = Router();
router.use(requireAuth, requireRole("PRODUCT_MANAGER", "ADMIN"));

// ─── Categories ────────────────────────────────────────────────────────────
router.get("/categories", async (_req, res, next) => {
  try {
    const rows = await prisma.category.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { subcategories: true } } },
    });
    res.json(
      rows.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        imageUrl: c.imageUrl,
        isActive: c.isActive,
        subcategoryCount: c._count.subcategories,
        createdAt: c.createdAt,
      }))
    );
  } catch (e) {
    next(e);
  }
});

const upsertCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(["PRODUCT", "SERVICE"]),
  // Stores an image URL (e.g. Cloudinary URL).
  imageUrl: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

router.post(
  "/categories",
  validateBody(upsertCategorySchema),
  async (req, res, next) => {
    try {
      const data = req.body as z.infer<typeof upsertCategorySchema>;
      const created = await prisma.category.create({
        data: { ...data, addedByProductManagerId: req.user!.id },
      });
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  }
);

router.put(
  "/categories/:id",
  validateBody(upsertCategorySchema.partial()),
  async (req, res, next) => {
    try {
      const updated = await prisma.category.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json(updated);
    } catch (e: any) {
      if (e?.code === "P2025") return res.status(404).json({ error: "Category not found" });
      next(e);
    }
  }
);

router.delete("/categories/:id", async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    
    // First check if category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        subcategories: { select: { id: true } },
      },
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Check if heroes are attached (categoryIds[] contains this category)
    const heroCount = await prisma.heroProfile.count({
      where: { categoryIds: { has: categoryId } },
    });
    if (heroCount > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${heroCount} hero(es) are assigned to this category`,
      });
    }
    
    // Cascade delete: first delete all subcategories
    if (category.subcategories.length > 0) {
      await prisma.subcategory.deleteMany({
        where: { categoryId }
      });
    }
    
    // Now delete the category
    await prisma.category.delete({ where: { id: categoryId } });
    res.json({ ok: true, deletedSubcategories: category.subcategories.length });
  } catch (e) {
    next(e);
  }
});

// ─── Subcategories ─────────────────────────────────────────────────────────
router.get("/subcategories", async (req, res, next) => {
  try {
    const categoryId =
      typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
    const rows = await prisma.subcategory.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true, type: true } },
        _count: { select: { products: true } },
      },
    });
    res.json(
      rows.map((s) => ({
        id: s.id,
        categoryId: s.categoryId,
        categoryName: s.category.name,
        categoryType: s.category.type,
        name: s.name,
        // Icon name from Lucide set (e.g. "Pizza", "Sparkles")
        imageUrl: s.imageUrl,
        pageContent: s.pageContent,
        isActive: s.isActive,
        isPinned: s.isPinned,
        viralPosition: s.viralPosition,
        productCount: s._count.products,
        createdAt: s.createdAt,
      }))
    );
  } catch (e) {
    next(e);
  }
});

const upsertSubcategorySchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  // Stores an image URL (e.g. Cloudinary URL).
  imageUrl: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  viralPosition: z.number().int().min(1).max(21).optional().nullable(),
});

router.post(
  "/subcategories",
  validateBody(upsertSubcategorySchema),
  async (req, res, next) => {
    try {
      const created = await prisma.subcategory.create({ data: req.body });
      res.status(201).json(created);
    } catch (e: any) {
      if (e?.code === "P2003")
        return res.status(400).json({ error: "Invalid categoryId" });
      next(e);
    }
  }
);

router.put(
  "/subcategories/:id",
  validateBody(upsertSubcategorySchema.partial()),
  async (req, res, next) => {
    try {
      const updated = await prisma.subcategory.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json(updated);
    } catch (e: any) {
      if (e?.code === "P2025") return res.status(404).json({ error: "Subcategory not found" });
      next(e);
    }
  }
);

router.delete("/subcategories/:id", async (req, res, next) => {
  try {
    await prisma.subcategory.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") return res.status(404).json({ error: "Subcategory not found" });
    if (e?.code === "P2003")
      return res.status(409).json({ error: "Subcategory has products or pricing attached" });
    next(e);
  }
});

/**
 * Service page builder:
 *  - HTML content as multipart field `html` (plain text)
 *  - Optional asset images as multipart field `assets[]`
 *  - Stored on Subcategory.pageContent as { html, assets: [{ name, url }] }
 */
router.post(
  "/subcategories/:id/upload-page",
  multiImageUpload.array("assets", 20),
  async (req, res, next) => {
    try {
      if (!getCloudinary() && (req.files as Express.Multer.File[])?.length) {
        return res.status(503).json({ error: "Image hosting is not configured" });
      }
      const html =
        typeof req.body.html === "string" ? req.body.html : "";
      if (html.length === 0) {
        return res.status(400).json({ error: "html content is required" });
      }
      // Basic size guard
      if (html.length > 200_000) {
        return res.status(400).json({ error: "html content exceeds 200KB" });
      }

      const files = (req.files as Express.Multer.File[]) ?? [];
      const assets = await Promise.all(
        files.map(async (f) => {
          const r = await uploadBuffer(f.buffer, "service-pages");
          return { name: f.originalname, url: r.url };
        })
      );

      const updated = await prisma.subcategory.update({
        where: { id: req.params.id },
        data: { pageContent: { html, assets } as any },
        select: { id: true, pageContent: true },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  }
);

// ─── Products ──────────────────────────────────────────────────────────────
router.get("/products", async (req, res, next) => {
  try {
    const subcategoryId =
      typeof req.query.subcategoryId === "string" ? req.query.subcategoryId : undefined;
    const categoryId =
      typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : "";

    const rows = await prisma.product.findMany({
      where: {
        ...(subcategoryId && { subcategoryId }),
        ...(categoryId && { categoryId }),
        ...(search && {
          name: { contains: search, mode: "insensitive" },
        }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        category: {
          select: { id: true, name: true },
        },
        subcategory: {
          select: { id: true, name: true },
        },
      },
      take: 200,
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

const upsertProductSchema = z.object({
  categoryId: z.string().min(1),
  subcategoryId: z.string().min(1).optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().max(2000).optional().nullable(),
  imageUrl: z.string().url().nullable().optional(),
  basePrice: z.number().nonnegative(),
  isReplaceable: z.boolean().optional(),
  isRefundable: z.boolean().optional(),
  isReturnable: z.boolean().optional(),
  returnWindowDays: z.number().int().min(0).max(90).optional(),
  isActive: z.boolean().optional(),
});

router.post(
  "/products",
  validateBody(upsertProductSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof upsertProductSchema>;
      const created = await prisma.product.create({
        data: {
          ...body,
          addedByProductManagerId: req.user!.id,
        },
      });
      res.status(201).json(created);
    } catch (e: any) {
      if (e?.code === "P2003")
        return res.status(400).json({ error: "Invalid category or subcategory" });
      next(e);
    }
  }
);

router.put(
  "/products/:id",
  validateBody(upsertProductSchema.partial()),
  async (req, res, next) => {
    try {
      const updated = await prisma.product.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json(updated);
    } catch (e: any) {
      if (e?.code === "P2025") return res.status(404).json({ error: "Product not found" });
      next(e);
    }
  }
);

router.delete("/products/:id", async (req, res, next) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e: any) {
    if (e?.code === "P2025") return res.status(404).json({ error: "Product not found" });
    if (e?.code === "P2003")
      return res.status(409).json({ error: "Product is referenced by orders or heroes" });
    next(e);
  }
});

// Stats for PM dashboard
router.get("/stats", async (_req, res, next) => {
  try {
    const [categories, subcategories, products, services] = await Promise.all([
      prisma.category.count(),
      prisma.subcategory.count(),
      prisma.product.count(),
      prisma.subcategory.count({ where: { category: { type: "SERVICE" } } }),
    ]);
    res.json({ categories, subcategories, products, services });
  } catch (e) {
    next(e);
  }
});

export default router;
