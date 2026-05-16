import { v2 as cloudinary } from "cloudinary";
import { env } from "../env";

let configured = false;

export function getCloudinary() {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    return null;
  }
  if (!configured) {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
  return cloudinary;
}

export async function uploadBuffer(
  buffer: Buffer,
  folder: string,
  resourceType: "image" | "raw" = "image"
): Promise<{ url: string; publicId: string }> {
  const c = getCloudinary();
  if (!c) throw new Error("Cloudinary not configured");
  return new Promise((resolve, reject) => {
    const stream = c.uploader.upload_stream(
      { 
        folder: `bharat333/${folder}`, 
        resource_type: resourceType,
        timeout: 60000, // 60 second timeout
      },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error("Upload failed"));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
    
    // Add a timeout for the entire upload operation
    setTimeout(() => {
      if (!stream.destroyed) {
        stream.destroy();
        reject(new Error("Upload timeout - operation took too long"));
      }
    }, 60000); // 60 seconds
  });
}
