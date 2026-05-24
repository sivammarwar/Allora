import { Router } from "express";
import { prisma } from "../lib/prisma";
import authRouter from "./auth";
import adminRouter from "./admin";
import pmRouter from "./pm";
import uploadRouter from "./upload";
import heroRouter from "./hero";
import deliveryRouter from "./delivery";
import agentRouter from "./agent";
import userRouter from "./user";
import paymentsRouter from "./payments";
import payRouter from "./pay";
import secretShopRouter from "./secret-shop";
import itemCatalogRouter from "./item-catalog";
import mainInventoryRouter from "./main-inventory";
import contactRouter from "./contact";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString(), v: "df478df" });
});

// ONE-TIME migration — remove after use
router.post("/migrate-emails-bharat333", async (req, res) => {
  if (req.headers["x-migrate-secret"] !== "bharat333-migrate-2026") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const results = await Promise.all([
    prisma.user.updateMany({ where: { email: "gys738421@gmail.com" },                          data: { email: "admin@bharat333.com" } }),
    prisma.user.updateMany({ where: { email: "gotmyloka@gmail.com" },                           data: { email: "pm@bharat333.com" } }),
    prisma.user.updateMany({ where: { email: "shivamkumarsingh8544@gmail.com", role: "PAYMENT_MANAGER" }, data: { email: "payments@bharat333.com" } }),
    prisma.user.updateMany({ where: { email: "govindkkp@gmail.com",            role: "ITEM_CATALOG" },   data: { email: "catalog@bharat333.com" } }),
  ]);
  res.json({ ok: true, results });
});

router.use("/auth", authRouter);
router.use("/contact", contactRouter);
router.use("/admin", adminRouter);
router.use("/pm", pmRouter);
router.use("/upload", uploadRouter);
router.use("/hero", heroRouter);
router.use("/delivery", deliveryRouter);
router.use("/agent", agentRouter);
router.use("/user", userRouter);
router.use("/payments", paymentsRouter);
router.use("/pay", payRouter);
router.use("/secret-shop", secretShopRouter);
router.use("/item-catalog", itemCatalogRouter);
router.use("/main-inventory", mainInventoryRouter);

export default router;
