import multer from "multer";

const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

/** In-memory single image upload — buffer streamed to Cloudinary downstream. */
export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: MAX_IMAGE_SIZE, 
    files: 1,
    fieldSize: 10 * 1024 * 1024, // 10MB for form fields
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});

/** Multi-image upload (e.g. service page assets). */
export const multiImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: MAX_IMAGE_SIZE, 
    files: 20,
    fieldSize: 10 * 1024 * 1024, // 10MB for form fields
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});
