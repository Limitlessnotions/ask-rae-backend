import MediaProvider from "./provider.js";
import { validateMedia } from "./validate.js";

/**
 * Upload media
 */
export async function uploadMedia(
  file
) {
  validateMedia(file);

  return MediaProvider.upload.uploadFile(
    file.path
  );
}