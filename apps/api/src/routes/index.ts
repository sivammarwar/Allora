import { Router } from "express";
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

const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

router.use("/auth", authRouter);
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

export default router;
