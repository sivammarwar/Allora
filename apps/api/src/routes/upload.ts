import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { imageUpload } from "../middleware/upload";
import { uploadBuffer, getCloudinary } from "../lib/cloudinary";

const router = Router();

router.use(requireAuth);

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
