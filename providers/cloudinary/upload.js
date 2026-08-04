import cloudinary from "../../config/cloudinary.config.js";

/**
 * Upload image or video to Cloudinary
 */
export async function uploadFile(
  filePath,
  options = {}
) {
  const result = await cloudinary.uploader.upload(
    filePath,
    {
      folder: "ask-rae",
      resource_type: "auto",
      overwrite: false,
      ...options,
    }
  );

  return {
    publicId: result.public_id,
    url: result.secure_url,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    format: result.format,
    resourceType: result.resource_type,
    duration: result.duration ?? null,
  };
}