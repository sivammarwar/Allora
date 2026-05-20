import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { imageUpload } from "../middleware/upload";
import { uploadBuffer, getCloudinary } from "../lib/cloudinary";
import { env } from "../env";

const router = Router();

router.use(requireAuth);

/**
 * GET /api/upload/cloudinary-signature?folder=heroes
 * Returns a short-lived signed payload so the mobile client can POST the
 * image directly to Cloudinary — bypassing our ALB/WAF which blocks
 * multipart uploads from non-browser User-Agents.
 * Deployed: 2026-05-20
 */
router.get("/cloudinary-signature", (req, res) => {
  const c = getCloudinary();
  if (!c || !env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    return res.status(503).json({ error: "Image hosting is not configured" });
  }
  const rawFolder = typeof req.query.folder === "string" ? req.query.folder : "uploads";
  const folder = /^[a-z0-9-]{1,40}$/i.test(rawFolder) ? `bharat333/${rawFolder}` : "bharat333/uploads";
  const timestamp = Math.round(Date.now() / 1000);
  const signature = c.utils.api_sign_request({ folder, timestamp }, env.CLOUDINARY_API_SECRET);
  res.json({
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    folder,
    timestamp,
    signature,
  });
});

/**
 * POST /api/upload/image
 * Multipart form: field name `file`. Returns { url, publicId }.
 * Optional ?folder=heroes|products|categories|profiles|service-pages
 */
router.post("/image", imageUpload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }
    if (!getCloudinary()) {
      return res.status(503).json({ error: "Image hosting is not configured" });
    }
    const folder =
      typeof req.query.folder === "string" && /^[a-z0-9-]{1,40}$/i.test(req.query.folder)
        ? req.query.folder
        : "uploads";
    const result = await uploadBuffer(req.file.buffer, folder);
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
});

export default router;
