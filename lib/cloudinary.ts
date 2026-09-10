import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.API_SECRET,
});

export const cloudinaryFolder = process.env.CLOUDINARY_FOLDER || "graficas_caracas";

export { cloudinary };

export async function deleteCloudinaryImage(publicId: string | null | undefined) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (e) {
    console.error("[deleteCloudinaryImage]", publicId, e);
  }
}
