import { Router } from "express";
import { z } from "zod";
import * as turf from "@turf/turf";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/roleGuard";
import { validateBody } from "../middleware/validate";
import { getRazorpay } from "../lib/razorpay";
import { emitToUser, emitService } from "../socket";

const router = Router();

// Public categories endpoint (accessible to all authenticated users including heroes)
router.get("/categories", requireAuth, async (_req, res, next) => {
  try {
    const rows = await prisma.category.findMany({
      where: { isActive: true },
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

// Public subcategories endpoint (accessible to all authenticated users including heroes)
router.get("/subcategories", requireAuth, async (req, res, next) => {
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

// Public endpoint to find agents matching user's location.
// Tier 1: agents whose assigned polygon CONTAINS the user's point (officially assigned).
// Tier 2: agents within `radius` km (default 40) measured to nearest area edge.
// Both tiers are returned together; tier-1 first, then tier-2 by ascending distance.
router.get("/agents-nearby", requireAuth, async (req, res, next) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radiusKm = parseFloat(req.query.radius as string) || 40;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: "Invalid lat/lng" });
    }

    const userPoint = turf.point([lng, lat]);

    const agents = await prisma.agentProfile.findMany({
      where: { isVerifiedByAdmin: true },
      include: {
        user: { select: { id: true, name: true, email: true } },
        primaryArea: { select: { id: true, name: true } },
        agentAreas: {
          include: {
            area: { select: { id: true, name: true, polygon: true } },
          },
        },
      },
    });

    const matched = agents
      .map((agent) => {
        const areas = agent.agentAreas
          .map((aa) => aa.area)
          .filter((a) => !!a?.polygon);

        if (areas.length === 0) return null;

        let bestDistanceKm = Infinity;
        let isAssigned = false;
        let matchedAreaName: string | null = null;
        let agentPoint: [number, number] | null = null;

        for (const area of areas) {
          let poly;
          try {
            poly = turf.polygon((area.polygon as any).coordinates as number[][][]);
          } catch {
            continue;
          }

          // Tier 1 — point-in-polygon (officially assigned)
          if (turf.booleanPointInPolygon(userPoint, poly)) {
            isAssigned = true;
            bestDistanceKm = 0;
            matchedAreaName = area.name;
            const c = turf.centroid(poly).geometry.coordinates as [number, number];
            agentPoint = c;
            break;
          }

          // Tier 2 — distance from user to nearest polygon vertex (cheap edge proxy)
          const coords = (area.polygon as any).coordinates[0] as number[][];
          for (const [pLng, pLat] of coords) {
            const d = turf.distance(userPoint, turf.point([pLng, pLat]), {
              units: "kilometers",
            });
            if (d < bestDistanceKm) {
              bestDistanceKm = d;
              matchedAreaName = area.name;
              const c = turf.centroid(poly).geometry.coordinates as [number, number];
              agentPoint = c;
            }
          }
        }

        if (bestDistanceKm > radiusKm && !isAssigned) return null;
        if (!agentPoint) return null;

        return {
          id: agent.id,
          userId: agent.user.id,
          name: agent.user.name,
          email: agent.user.email,
          distanceKm: Math.round(bestDistanceKm * 10) / 10,
          isAssigned,
          matchedAreaName,
          primaryArea: agent.primaryArea,
          areas: agent.agentAreas.map((aa) => ({
            id: aa.area.id,
            name: aa.area.name,
          })),
          location: { lat: agentPoint[1], lng: agentPoint[0] },
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Assigned (point-in-polygon) agents first
        if (a!.isAssigned && !b!.isAssigned) return -1;
        if (!a!.isAssigned && b!.isAssigned) return 1;
        return a!.distanceKm - b!.distanceKm;
      });

    res.json(matched);
  } catch (e) {
    next(e);
  }
});

router.use(requireAuth, requireRole("USER"));

/**
 * Returns the verified, active heroes visible to the user at (lat, lng).
 * Visibility is determined by area: find which Area polygons contain the user,
 * then return heroes verified by agents assigned to those areas.
 */
async function heroesInUserArea(lat: number, lng: number) {
  const areas = await prisma.area.findMany();
  const userPoint = turf.point([lng, lat]);

  const matchingAreaIds: string[] = [];
  for (const area of areas) {
    try {
      const geojson = area.polygon as any;
      let poly: any;
      if (geojson.type === "FeatureCollection") {
        poly = geojson.features?.[0];
      } else if (geojson.type === "Feature") {
        poly = geojson;
      } else if (geojson.type === "Polygon" || geojson.type === "MultiPolygon") {
        poly = { type: "Feature", geometry: geojson, properties: {} };
      }
      if (poly && turf.booleanPointInPolygon(userPoint, poly)) {
        matchingAreaIds.push(area.id);
      }
    } catch { /* skip invalid polygon */ }
  }

  if (matchingAreaIds.length === 0) return [];

  const agentAreas = await prisma.agentArea.findMany({
    where: { areaId: { in: matchingAreaIds } },
    select: { agentId: true },
  });
  const agentIds = [...new Set(agentAreas.map((a) => a.agentId))];
  if (agentIds.length === 0) return [];

  return prisma.heroProfile.findMany({
    where: {
      isVerifiedByAgent: true,
      isActive: true,
      verifiedByAgentId: { in: agentIds },
    },
    include: {
      pricing: true,
      heroProducts: { where: { isAvailable: true } },
    },
  });
}

/** Pick the closest hero from a list, given the user point. */
function pickClosestHero<T extends { locationLat: number; locationLng: number }>(
  heroes: T[],
  lat: number,
  lng: number
): T | null {
  if (heroes.length === 0) return null;
  const userPoint = turf.point([lng, lat]);
  return heroes
    .map((h) => ({
      h,
      d: turf.distance(userPoint, turf.point([h.locationLng, h.locationLat]), {
        units: "kilometers",
      }),
    }))
    .sort((a, b) => a.d - b.d)[0].h;
}

const locationQuery = z.object({
  lat: z.coerce.number().gte(-90).lte(90),
  lng: z.coerce.number().gte(-180).lte(180),
});

// ─── Resolve agent for user's location ──────────────────────────────────────
router.get("/my-agent", requireAuth, requireRole("USER"), async (req, res, next) => {
  try {
    const parsed = locationQuery.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "lat & lng required" });
    const { lat, lng } = parsed.data;

    const areas = await prisma.area.findMany();
    const userPoint = turf.point([lng, lat]);
    const matchingAreaIds: string[] = [];
    for (const area of areas) {
      try {
        const g = area.polygon as any;
        let poly: any;
        if (g.type === "FeatureCollection") poly = g.features?.[0];
        else if (g.type === "Feature") poly = g;
        else if (g.type === "Polygon" || g.type === "MultiPolygon") poly = { type: "Feature", geometry: g, properties: {} };
        if (poly && turf.booleanPointInPolygon(userPoint, poly)) matchingAreaIds.push(area.id);
      } catch { /* skip */ }
    }
    if (matchingAreaIds.length === 0) return res.json({ agentId: null });

    const agentAreas = await prisma.agentArea.findMany({
      where: { areaId: { in: matchingAreaIds } },
      select: { agentId: true },
    });
    const agentId = agentAreas[0]?.agentId ?? null;

    if (!agentId) return res.json({ agentId: null });

    // Return slot config too
    const slotCfg = await prisma.agentSlotConfig.findUnique({ where: { agentId } });
    res.json({ agentId, slotStartHour: slotCfg?.slotStartHour ?? 6, slotEndHour: slotCfg?.slotEndHour ?? 20 });
  } catch (e) { next(e); }
});

// ─── Categories visible to this user ───────────────────────────────────────
router.get("/categories", async (req, res, next) => {
  try {
    const parsed = locationQuery.safeParse(req.query);
    if (!parsed.success)
      return res.status(400).json({ error: "lat & lng required" });

    const heroes = await heroesInUserArea(parsed.data.lat, parsed.data.lng);
    const categoryIds = Array.from(
      new Set(heroes.flatMap((h) => h.categoryIds))
    );

    const cats = await prisma.category.findMany({
      where: { id: { in: categoryIds }, isActive: true },
      orderBy: { name: "asc" },
    });
    res.json({
      products: cats.filter((c) => c.type === "PRODUCT"),
      services: cats.filter((c) => c.type === "SERVICE"),
    });
  } catch (e) {
    next(e);
  }
});

// ─── Single category detail ─────────────────────────────────────────────────
router.get("/categories/:id", async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        type: true,
        imageUrl: true,
        isActive: true,
      },
    });
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json(category);
  } catch (e) {
    next(e);
  }
});

// ─── Subcategories under a category ────────────────────────────────────────
router.get("/categories/:id/subcategories", async (req, res, next) => {
  try {
    const parsed = locationQuery.safeParse(req.query);
    if (!parsed.success)
      return res.status(400).json({ error: "lat & lng required" });

    const heroes = await heroesInUserArea(parsed.data.lat, parsed.data.lng);
    const myHeroes = heroes.filter((h) => h.categoryIds.includes(req.params.id));
    const subcategoryIds = Array.from(
      new Set(myHeroes.flatMap((h) => h.subcategoryIds))
    );

    const subs = await prisma.subcategory.findMany({
      where: { id: { in: subcategoryIds }, isActive: true, categoryId: req.params.id },
      orderBy: { name: "asc" },
      include: { category: { select: { id: true, name: true, type: true } } },
    });

    // If agentId provided, attach agent pricing for SERVICE subcategories
    const agentId = req.query.agentId as string | undefined;
    if (agentId) {
      const pricings = await (prisma as any).agentSubcategoryPricing.findMany({
        where: { agentId, subcategoryId: { in: subcategoryIds } },
      });
      const pricingMap = new Map<string, any>(pricings.map((p: any) => [p.subcategoryId, p]));
      const subsWithPricing = subs.map((s: any) => ({ ...s, agentPricing: pricingMap.get(s.id) ?? null }));
      return res.json(subsWithPricing);
    }

    res.json(subs);
  } catch (e) {
    next(e);
  }
});

// ─── Products under a PRODUCT category ──────────────────────────────────────
router.get("/categories/:id/products", async (req, res, next) => {
  try {
    const parsed = locationQuery.safeParse(req.query);
    if (!parsed.success)
      return res.status(400).json({ error: "lat & lng required" });

    const heroes = await heroesInUserArea(parsed.data.lat, parsed.data.lng);
    const myHeroes = heroes.filter((h) => h.categoryIds.includes(req.params.id));

    const heroProducts = await prisma.heroProduct.findMany({
      where: {
        heroId: { in: myHeroes.map((h) => h.id) },
        isAvailable: true,
      },
      include: {
        hero: {
          select: {
            id: true,
            shopName: true,
            serviceName: true,
            user: { select: { name: true } },
          },
        },
        product: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            subcategory: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter to only products in the requested category
    const products = heroProducts.filter(
      (hp) => hp.product.categoryId === req.params.id
    );

    res.json(products);
  } catch (e) {
    next(e);
  }
});

// ─── Subcategory detail (service page OR product list) ─────────────────────
router.get("/subcategories/:id", async (req, res, next) => {
  try {
    const parsed = locationQuery.safeParse(req.query);
    if (!parsed.success)
      return res.status(400).json({ error: "lat & lng required" });

    const sub = await prisma.subcategory.findUnique({
      where: { id: req.params.id },
      include: { category: true },
    });
    if (!sub) return res.status(404).json({ error: "Subcategory not found" });

    const heroes = await heroesInUserArea(parsed.data.lat, parsed.data.lng);
    const matching = heroes.filter(
      (h) =>
        h.categoryIds.includes(sub.categoryId) &&
        h.subcategoryIds.includes(sub.id)
    );

    if (matching.length === 0) {
      return res.json({ subcategory: sub, hero: null, heroes: [], products: [], pricing: null });
    }

    // Build per-hero option with pricing + distance, then sort by service charge ascending,
    // tiebreaking by distance. This ensures that when a user is covered by multiple heroes
    // offering the same service, the cheapest is shown first (then nearest among ties).
    const userPt = turf.point([parsed.data.lng, parsed.data.lat]);
    type MatchingHero = (typeof matching)[number];
    type PricingRow = MatchingHero["pricing"][number];
    type HeroOption = {
      id: string;
      serviceName: string;
      shopName: string | null;
      requiresDelivery: boolean;
      locationLat: number;
      locationLng: number;
      profileImageUrl: string | null;
      distanceKm: number;
      pricing: PricingRow;
    };

    // Load agent price-control entries for this subcategory, keyed by agentId
    const agentIds = [...new Set(
      (matching as MatchingHero[]).map((h) => h.verifiedByAgentId).filter(Boolean) as string[]
    )];
    const agentPriceControls: any[] = agentIds.length
      ? await (prisma as any).agentSubcategoryPricing.findMany({
          where: { agentId: { in: agentIds }, subcategoryId: sub.id },
        })
      : [];
    const agentPriceMap = new Map<string, any>(agentPriceControls.map((a: any) => [a.agentId, a]));

    const heroOptions: HeroOption[] = [];
    for (const h of matching as MatchingHero[]) {
      const distanceKm = +turf.distance(
        userPt,
        turf.point([h.locationLng, h.locationLat]),
        { units: "kilometers" }
      ).toFixed(2);

      const agentPrice = h.verifiedByAgentId ? agentPriceMap.get(h.verifiedByAgentId) : null;

      let pricing: PricingRow | null;
      if (agentPrice) {
        // Agent has overridden pricing for this subcategory — synthesize a pricing row
        const perKm = Number(agentPrice.transportChargePerKm);
        pricing = {
          id: agentPrice.id,
          heroId: h.id,
          subcategoryId: sub.id,
          serviceCharge: agentPrice.baseServiceCharge,
          deliveryCharge2km: String((perKm * 2).toFixed(2)),
          deliveryCharge5km: String((perKm * 5).toFixed(2)),
          deliveryCharge7km: String((perKm * 7).toFixed(2)),
          deliveryCharge10km: String((perKm * 10).toFixed(2)),
          createdAt: agentPrice.createdAt,
          updatedAt: agentPrice.updatedAt,
          subcategory: { id: sub.id, name: sub.name, category: { name: sub.category.name, type: sub.category.type as "PRODUCT" | "SERVICE" } },
        } as unknown as PricingRow;
      } else {
        pricing = h.pricing.find((p: PricingRow) => p.subcategoryId === sub.id) ?? null;
      }

      // Heroes with neither agent pricing nor their own pricing are not bookable
      if (!pricing) continue;

      heroOptions.push({
        id: h.id,
        serviceName: h.serviceName ?? "",
        shopName: h.shopName,
        requiresDelivery: h.requiresDelivery,
        locationLat: h.locationLat,
        locationLng: h.locationLng,
        profileImageUrl: h.profileImageUrl,
        distanceKm,
        pricing,
      });
    }
    // Sort by service charge ascending, tiebreaking by distance. This ensures
    // that when a user is covered by multiple heroes offering the same service,
    // the cheapest is shown first (then the nearest among ties).
    heroOptions.sort((a: HeroOption, b: HeroOption) => {
      const pa = Number(a.pricing.serviceCharge);
      const pb = Number(b.pricing.serviceCharge);
      if (pa !== pb) return pa - pb;
      return a.distanceKm - b.distanceKm;
    });

    if (sub.category.type === "SERVICE") {
      const top = heroOptions[0] ?? null;
      // Fetch the top hero's store page content if available
      let heroStorePageContent = null;
      if (top) {
        const heroProfile = await prisma.heroProfile.findUnique({
          where: { id: top.id },
          select: { storePageContent: true },
        });
        heroStorePageContent = heroProfile?.storePageContent;
      }
      return res.json({
        subcategory: sub,
        // Backward-compat fields (first = cheapest).
        hero: top
          ? {
              id: top.id,
              serviceName: top.serviceName,
              shopName: top.shopName,
              requiresDelivery: top.requiresDelivery,
              locationLat: top.locationLat,
              locationLng: top.locationLng,
              profileImageUrl: top.profileImageUrl,
              storePageContent: heroStorePageContent,
            }
          : null,
        pricing: top?.pricing ?? null,
        // Full sorted list of available providers for this service in the user's area.
        heroes: heroOptions,
      });
    }

    // PRODUCT type — continue with the closest hero for product listings.
    const hero = pickClosestHero<MatchingHero>(
      matching,
      parsed.data.lat,
      parsed.data.lng
    )!;
    const pricing =
      hero.pricing.find((p: PricingRow) => p.subcategoryId === sub.id) ?? null;

    // PRODUCT type — list this hero's available products in this subcategory
    const products = await prisma.product.findMany({
      where: { subcategoryId: sub.id, isActive: true },
    });
    const heroProducts = await prisma.heroProduct.findMany({
      where: { heroId: hero.id, isAvailable: true, productId: { in: products.map((p) => p.id) } },
    });
    const visible = products
      .filter((p) => heroProducts.some((hp) => hp.productId === p.id))
      .map((p) => {
        const hp = heroProducts.find((x) => x.productId === p.id)!;
        const price = (hp as typeof hp & { customPrice?: unknown }).customPrice ?? p.basePrice;
        return { ...p, displayPrice: price };
      });

    res.json({
      subcategory: sub,
      hero: {
        id: hero.id,
        serviceName: hero.serviceName,
        shopName: hero.shopName,
        requiresDelivery: hero.requiresDelivery,
        locationLat: hero.locationLat,
        locationLng: hero.locationLng,
        profileImageUrl: hero.profileImageUrl,
      },
      products: visible,
      pricing,
    });
  } catch (e) {
    next(e);
  }
});

// ─── Cart checkout ─────────────────────────────────────────────────────────
const checkoutItemSchema = z.object({
  heroId: z.string().min(1),
  productId: z.string().nullable().optional(),
  subcategoryId: z.string().nullable().optional(),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.number().nonnegative(),
  deliveryCharge: z.number().nonnegative().default(0),
});

const checkoutSchema = z.object({
  items: z.array(checkoutItemSchema).min(1),
  deliveryAddress: z.string().min(3).max(300),
  deliveryLat: z.number().gte(-90).lte(90),
  deliveryLng: z.number().gte(-180).lte(180),
  paymentMethod: z.enum(["ONLINE", "COD"]),
  notes: z.string().max(500).optional(),
});

router.post("/checkout", validateBody(checkoutSchema), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const body = req.body as z.infer<typeof checkoutSchema>;

    // Validate heroes/products/subcategories
    const heroIds = Array.from(new Set(body.items.map((i) => i.heroId)));
    const heroes = await prisma.heroProfile.findMany({
      where: { id: { in: heroIds }, isVerifiedByAgent: true, isActive: true },
    });
    if (heroes.length !== heroIds.length) {
      return res.status(400).json({ error: "Invalid heroes in cart" });
    }

    // Compute totals server-side from item prices (trust but verify)
    let total = 0;
    let totalDelivery = 0;
    for (const item of body.items) {
      total += Number(item.unitPrice) * item.quantity;
      totalDelivery += Number(item.deliveryCharge);
    }
    const grandTotal = total + totalDelivery;

    // Create the order + sub-orders + payment records atomically
    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          userId,
          status: "PENDING",
          paymentMethod: body.paymentMethod,
          paymentStatus: "PENDING",
          totalAmount: grandTotal,
          deliveryCharge: totalDelivery,
          deliveryAddress: body.deliveryAddress,
          deliveryLat: body.deliveryLat,
          deliveryLng: body.deliveryLng,
          notes: body.notes ?? null,
        },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (const item of body.items) {
        const hero = heroes.find((h) => h.id === item.heroId)!;
        const isService = Boolean(item.subcategoryId && !item.productId);

        const oi = await tx.orderItem.create({
          data: {
            orderId: o.id,
            heroId: item.heroId,
            productId: !isService ? item.productId ?? null : null,
            subcategoryId: isService ? item.subcategoryId ?? null : null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            deliveryCharge: item.deliveryCharge,
            subOrderStatus: "PENDING",
          },
        });

        if (isService && item.subcategoryId) {
          await tx.serviceBooking.create({
            data: {
              orderId: o.id,
              heroId: item.heroId,
              subcategoryId: item.subcategoryId,
              charge: item.unitPrice,
              transportCharge: item.deliveryCharge,
              status: "PENDING",
            },
          });
        }

        // Pre-compute split (90% hero, 10% platform; delivery charge → delivery boy if requires delivery)
        const itemSubtotal = Number(item.unitPrice) * item.quantity;
        const platformFee = +(itemSubtotal * 0.1).toFixed(2);
        const amountToHero = +(itemSubtotal - platformFee).toFixed(2);
        const amountToDeliveryBoy = +Number(item.deliveryCharge).toFixed(2);

        await tx.paymentRecord.create({
          data: {
            orderId: o.id,
            date: today,
            heroId: item.heroId,
            amountToHero,
            amountToDeliveryBoy,
            platformFee,
            isSettled: false,
          },
        });
      }

      return o;
    });

    // For ONLINE: create a Razorpay order if configured
    let razorpay: { orderId: string; amount: number; keyId: string } | null = null;
    if (body.paymentMethod === "ONLINE") {
      const rp = getRazorpay();
      if (rp) {
        const rpOrder = await rp.orders.create({
          amount: Math.round(grandTotal * 100),
          currency: "INR",
          receipt: order.id,
          notes: { orderId: order.id, userId },
        });
        await prisma.order.update({
          where: { id: order.id },
          data: { razorpayOrderId: rpOrder.id },
        });
        razorpay = {
          orderId: rpOrder.id,
          amount: rpOrder.amount as number,
          keyId: process.env.RAZORPAY_KEY_ID ?? "",
        };
      } else {
        // Razorpay not configured — for dev convenience, mark as paid immediately.
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: "PAID" },
        });
        notifyHeroesOfNewOrder(order.id);
      }
    } else {
      // COD — dispatch immediately
      notifyHeroesOfNewOrder(order.id);
    }

    res.status(201).json({
      orderId: order.id,
      total: grandTotal,
      paymentMethod: body.paymentMethod,
      razorpay,
    });
  } catch (e) {
    next(e);
  }
});

async function notifyHeroesOfNewOrder(orderId: string) {
  const items = await prisma.orderItem.findMany({
    where: { orderId },
    select: { heroId: true, hero: { select: { userId: true } } },
  });
  const seen = new Set<string>();
  for (const i of items) {
    if (seen.has(i.hero.userId)) continue;
    seen.add(i.hero.userId);
    emitToUser(i.hero.userId, "order:new", { orderId });
  }
}

// ─── User orders ───────────────────────────────────────────────────────────
router.get("/orders", async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        items: {
          include: {
            hero: { select: { id: true, serviceName: true, shopName: true } },
            product: { select: { id: true, name: true, imageUrl: true } },
            subcategory: { select: { id: true, name: true } },
          },
        },
      },
    });
    res.json(orders);
  } catch (e) {
    next(e);
  }
});

router.get("/orders/:id", async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: {
        items: {
          include: {
            hero: {
              select: { id: true, serviceName: true, shopName: true, locationLat: true, locationLng: true },
            },
            product: { select: { id: true, name: true, imageUrl: true } },
            subcategory: { select: { id: true, name: true } },
            assignedDeliveryBoy: {
              select: {
                id: true,
                phone: true,
                upiVpa: true,
                upiName: true,
                user: { select: { name: true } },
              },
            },
          },
        },
      },
    });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (e) {
    next(e);
  }
});

// ─── Reviews ───────────────────────────────────────────────────────────────
const reviewSchema = z.object({
  orderItemId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().max(1000).optional(),
});

router.post("/reviews", validateBody(reviewSchema), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const body = req.body as z.infer<typeof reviewSchema>;

    const item = await prisma.orderItem.findFirst({
      where: { id: body.orderItemId, order: { userId } },
      select: {
        id: true,
        heroId: true,
        productId: true,
        subcategoryId: true,
        subOrderStatus: true,
      },
    });
    if (!item) return res.status(404).json({ error: "Order item not found" });
    if (item.subOrderStatus !== "DELIVERED") {
      return res
        .status(400)
        .json({ error: "Can only review delivered items" });
    }

    // One review per (user, orderItem) — enforce by upserting on a synthetic key.
    const existing = await prisma.review.findFirst({
      where: {
        userId,
        heroId: item.heroId,
        productId: item.productId,
        subcategoryId: item.subcategoryId,
      },
      select: { id: true },
    });

    const review = existing
      ? await prisma.review.update({
          where: { id: existing.id },
          data: { rating: body.rating, reviewText: body.reviewText ?? null },
        })
      : await prisma.review.create({
          data: {
            userId,
            heroId: item.heroId,
            productId: item.productId,
            subcategoryId: item.subcategoryId,
            rating: body.rating,
            reviewText: body.reviewText ?? null,
          },
        });

    res.json(review);
  } catch (e) {
    next(e);
  }
});

router.get("/reviews/me/:orderItemId", async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const item = await prisma.orderItem.findFirst({
      where: { id: req.params.orderItemId, order: { userId } },
      select: { heroId: true, productId: true, subcategoryId: true },
    });
    if (!item) return res.json(null);
    const r = await prisma.review.findFirst({
      where: {
        userId,
        heroId: item.heroId,
        productId: item.productId,
        subcategoryId: item.subcategoryId,
      },
    });
    res.json(r);
  } catch (e) {
    next(e);
  }
});

router.get("/subcategories/:id/reviews", async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { subcategoryId: req.params.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        user: { select: { name: true } },
        hero: { select: { id: true, shopName: true, serviceName: true } },
      },
    });
    const agg = await prisma.review.aggregate({
      where: { subcategoryId: req.params.id },
      _avg: { rating: true },
      _count: true,
    });
    res.json({
      reviews,
      summary: {
        average: Number(agg._avg.rating ?? 0),
        count: agg._count,
      },
    });
  } catch (e) {
    next(e);
  }
});

// ─── Viral / Pinned subcategories for homepage ──────────────────────────────
router.get("/viral-subcategories", async (req, res, next) => {
  try {
    const pinned = await prisma.subcategory.findMany({
      where: { isPinned: true, isActive: true },
      orderBy: { viralPosition: "asc" },
      include: {
        category: { select: { id: true, name: true, type: true, imageUrl: true } },
        _count: { select: { products: true } },
      },
    });
    res.json(
      pinned.map((s) => ({
        id: s.id,
        name: s.name,
        imageUrl: s.imageUrl,
        viralImageUrl: s.viralImageUrl,
        viralPosition: s.viralPosition,
        category: s.category,
        productCount: s._count.products,
      }))
    );
  } catch (e) {
    next(e);
  }
});

// ─── Browse all categories with nested subcategories and products ─────────────
router.get("/browse", async (req, res, next) => {
  try {
    const parsed = locationQuery.safeParse(req.query);
    if (!parsed.success)
      return res.status(400).json({ error: "lat & lng required" });

    // Get heroes in the user's area
    const heroes = await heroesInUserArea(parsed.data.lat, parsed.data.lng);

    // Get all active categories
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });

    // For each category, get subcategories and products available from covering heroes
    const result = await Promise.all(
      categories.map(async (cat) => {
        const catHeroes = heroes.filter((h) => h.categoryIds.includes(cat.id));
        
        if (cat.type === "PRODUCT") {
          // For PRODUCT categories, get hero products directly
          const heroProducts = await prisma.heroProduct.findMany({
            where: {
              heroId: { in: catHeroes.map((h) => h.id) },
              isAvailable: true,
            },
            include: {
              product: {
                include: {
                  category: true,
                  subcategory: true,
                },
              },
            },
          });
          
          // Filter to products in this category
          const categoryHeroProducts = heroProducts.filter(
            (hp) => hp.product.categoryId === cat.id
          );
          
          return {
            ...cat,
            subcategories: [],
            hasProducts: categoryHeroProducts.length > 0,
          };
        } else {
          // For SERVICE categories, get subcategories
          const subcategoryIds = Array.from(
            new Set(catHeroes.flatMap((h) => h.subcategoryIds))
          );

          const subcategories = await prisma.subcategory.findMany({
            where: { id: { in: subcategoryIds }, isActive: true, categoryId: cat.id },
            orderBy: { name: "asc" },
          });

          return {
            ...cat,
            subcategories,
            hasProducts: false,
          };
        }
      })
    );

    // Split into services and products
    const services = result
      .filter((c) => c.type === "SERVICE" && c.subcategories.length > 0)
      .map(({ hasProducts, ...c }) => c);
    const products = result
      .filter((c) => c.type === "PRODUCT" && c.hasProducts)
      .map(({ hasProducts, ...c }) => c);

    res.json({ services, products });
  } catch (e) {
    next(e);
  }
});

// ─── Available slots for a subcategory ──────────────────────────────────────
// GET /api/user/subcategories/:id/slots?agentId=xxx&from=YYYY-MM-DD&days=7
router.get("/subcategories/:id/slots", requireAuth, requireRole("USER"), async (req, res, next) => {
  try {
    const { id: subcategoryId } = req.params;
    const agentId = req.query.agentId as string;
    const daysAhead = Math.min(Number(req.query.days) || 7, 14);
    const fromStr = (req.query.from as string) || new Date().toISOString().split("T")[0];
    const fromDate = new Date(fromStr);

    if (!agentId) return res.status(400).json({ error: "agentId required" });

    // Get slot config for this agent
    let slotStartHour = 6, slotEndHour = 20;
    const cfg = await prisma.agentSlotConfig.findUnique({ where: { agentId } });
    if (cfg) { slotStartHour = cfg.slotStartHour; slotEndHour = cfg.slotEndHour; }

    // Get all heroes for this agent+subcategory
    const heroes = await prisma.heroProfile.findMany({
      where: {
        verifiedByAgentId: agentId,
        isVerifiedByAgent: true,
        isAvailable: true,
        subcategoryIds: { has: subcategoryId },
      },
      select: { id: true },
    });
    const heroIds = heroes.map((h) => h.id);
    if (heroIds.length === 0) return res.json({ slots: [], slotStartHour, slotEndHour });

    // Build date range
    const dates: string[] = [];
    for (let d = 0; d < daysAhead; d++) {
      const dt = new Date(fromDate);
      dt.setDate(dt.getDate() + d);
      dates.push(dt.toISOString().split("T")[0]);
    }

    // Get blocked slots (booked or busy) for all heroes in range
    const toDate = new Date(fromDate);
    toDate.setDate(toDate.getDate() + daysAhead);
    const blockedSlots = await prisma.heroSlot.findMany({
      where: {
        heroId: { in: heroIds },
        date: { gte: fromDate, lt: toDate },
        OR: [{ isBooked: true }, { isBusyByHero: true }],
      },
      select: { heroId: true, date: true, hour: true },
    });

    // For each date+hour, a slot is available if at least one hero is NOT blocked
    const result: Record<string, { hour: number; available: boolean }[]> = {};
    for (const dateStr of dates) {
      result[dateStr] = [];
      for (let h = slotStartHour; h < slotEndHour; h++) {
        const blockedHeroIds = new Set(
          blockedSlots
            .filter((s) => s.date.toISOString().split("T")[0] === dateStr && s.hour === h)
            .map((s) => s.heroId)
        );
        const available = heroIds.some((id) => !blockedHeroIds.has(id));
        result[dateStr].push({ hour: h, available });
      }
    }
    res.json({ slots: result, slotStartHour, slotEndHour });
  } catch (e) { next(e); }
});

// ─── Service Requests (User side) ────────────────────────────────────────────
const createServiceRequestSchema = z.object({
  subcategoryId: z.string().min(1),
  agentId: z.string().min(1),
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  scheduledHour: z.number().int().min(0).max(23),
  userName: z.string().min(1),
  userPhone: z.string().min(7),
  userGender: z.string().optional(),
  userAddress: z.string().min(3),
  userLat: z.number().optional(),
  userLng: z.number().optional(),
});

router.post("/service-requests", requireAuth, requireRole("USER"), validateBody(createServiceRequestSchema), async (req, res, next) => {
  try {
    const body = req.body as z.infer<typeof createServiceRequestSchema>;

    // Verify subcategory and agent
    const subcategory = await prisma.subcategory.findUnique({
      where: { id: body.subcategoryId },
      include: { category: true },
    });
    if (!subcategory || !subcategory.isActive)
      return res.status(404).json({ error: "Subcategory not found" });
    if (subcategory.category.type !== "SERVICE")
      return res.status(400).json({ error: "Only service subcategories can be booked" });

    // Get agent pricing
    const pricing = await prisma.agentSubcategoryPricing.findUnique({
      where: { agentId_subcategoryId: { agentId: body.agentId, subcategoryId: body.subcategoryId } },
    });
    if (!pricing)
      return res.status(400).json({ error: "No pricing set by agent for this subcategory" });

    const request = await prisma.serviceRequest.create({
      data: {
        userId: req.user!.id,
        subcategoryId: body.subcategoryId,
        agentId: body.agentId,
        scheduledDate: new Date(body.scheduledDate),
        scheduledHour: body.scheduledHour,
        charge: pricing.baseServiceCharge,
        discountPercent: pricing.discountPercent,
        transportCharge: pricing.transportChargePerKm,
        userName: body.userName,
        userPhone: body.userPhone,
        userGender: body.userGender,
        userAddress: body.userAddress,
        userLat: body.userLat,
        userLng: body.userLng,
      },
      include: {
        subcategory: { select: { name: true, category: { select: { name: true } } } },
      },
    });

    // Broadcast to all eligible heroes
    const heroes = await prisma.heroProfile.findMany({
      where: {
        verifiedByAgentId: body.agentId,
        isVerifiedByAgent: true,
        isAvailable: true,
        subcategoryIds: { has: body.subcategoryId },
      },
      select: { userId: true },
    });
    for (const h of heroes) {
      emitService(`user:${h.userId}`, "service_request:new", request);
    }

    res.status(201).json(request);
  } catch (e) { next(e); }
});

// GET /api/user/service-requests — booking history
router.get("/service-requests", requireAuth, requireRole("USER"), async (req, res, next) => {
  try {
    const requests = await prisma.serviceRequest.findMany({
      where: { userId: req.user!.id },
      include: {
        subcategory: { select: { id: true, name: true, category: { select: { name: true } } } },
        hero: {
          select: {
            id: true, serviceName: true, shopName: true, phone: true, gender: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(requests);
  } catch (e) { next(e); }
});

// DELETE /api/user/service-requests/:id — cancel
router.delete("/service-requests/:id", requireAuth, requireRole("USER"), async (req, res, next) => {
  try {
    const request = await prisma.serviceRequest.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (!request) return res.status(404).json({ error: "Not found" });
    if (!["PENDING", "ACCEPTED"].includes(request.status))
      return res.status(400).json({ error: "Cannot cancel a completed request" });

    await prisma.serviceRequest.update({
      where: { id: request.id },
      data: { status: "CANCELLED" },
    });

    // Free the slot if it was accepted
    if (request.slotId) {
      await prisma.heroSlot.update({
        where: { id: request.slotId },
        data: { isBooked: false },
      });
    }

    // Notify hero if accepted
    if (request.heroId) {
      emitService(`user:${request.heroId}`, "service_request:cancelled", { requestId: request.id });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
