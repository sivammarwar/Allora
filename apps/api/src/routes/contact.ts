import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { validateBody } from "../middleware/validate";

const router = Router();

// ─── Public: submit contact form ─────────────────────────────────────────────
const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(20),
  email: z.string().email().max(120),
  address: z.string().trim().max(500).optional(),
  message: z.string().trim().min(5).max(2000),
  source: z.enum(["web", "mobile"]).default("web"),
});

router.post("/", validateBody(contactSchema), async (req, res, next) => {
  try {
    const data = req.body as z.infer<typeof contactSchema>;
    const submission = await prisma.contactSubmission.create({ data });
    res.status(201).json({ ok: true, id: submission.id });
  } catch (e) {
    next(e);
  }
});

export default router;
