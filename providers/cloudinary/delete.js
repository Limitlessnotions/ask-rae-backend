import cloudinary from "../../config/cloudinary.config.js";

/**
 * Delete media from Cloudinary
 */
export async function deleteFile(
  publicId
) {
  return cloudinary.uploader.destroy(
    publicId,
    {
      resource_type: "auto",
    }
  );
}