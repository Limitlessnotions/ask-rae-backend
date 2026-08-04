import crypto from "crypto";
import { uploadMedia } from "../services/media/upload.js";
import { db } from "../firebase/firebaseAdmin.js";

/**
 * Upload media
 */
export async function upload(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded.",
      });
    }

    const uploaded = await uploadMedia(req.file);

    const mediaId = crypto.randomUUID();

    const media = {
      id: mediaId,

      owner: req.user.uid,

      publicId: uploaded.publicId,

      url: uploaded.url,

      width: uploaded.width,

      height: uploaded.height,

      bytes: uploaded.bytes,

      format: uploaded.format,

      resourceType: uploaded.resourceType,

      duration: uploaded.duration,

      originalName: req.file.originalname,

      mimeType: req.file.mimetype,

      provider: "cloudinary",

      createdAt: new Date(),
    };

    await db
      .collection("users")
      .doc(req.user.uid)
      .collection("media")
      .doc(mediaId)
      .set(media);

    return res.status(200).json({
      success: true,
      media,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}