import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { sendMail } from "../lib/mailer";
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

    sendMail({
      to: "admin@bharat333.com",
      subject: `New contact message from ${data.name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
          <h2 style="color:#8B4A4A;">New Contact Form Submission</h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px;font-weight:bold;width:120px;">Name</td><td style="padding:8px;">${data.name}</td></tr>
            <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;">Phone</td><td style="padding:8px;">${data.phone}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Email</td><td style="padding:8px;"><a href="mailto:${data.email}">${data.email}</a></td></tr>
            <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;">Address</td><td style="padding:8px;">${data.address ?? "—"}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Source</td><td style="padding:8px;">${data.source}</td></tr>
            <tr style="background:#f9f9f9;"><td style="padding:8px;font-weight:bold;vertical-align:top;">Message</td><td style="padding:8px;white-space:pre-wrap;">${data.message}</td></tr>
          </table>
          <p style="margin-top:16px;color:#888;font-size:12px;">Submitted via Bharat Services contact form · ID: ${submission.id}</p>
        </div>`,
      text: `Name: ${data.name}\nPhone: ${data.phone}\nEmail: ${data.email}\nAddress: ${data.address ?? "—"}\nMessage: ${data.message}`,
    }).catch(() => {});

    res.status(201).json({ ok: true, id: submission.id });
  } catch (e) {
    next(e);
  }
});

export default router;
