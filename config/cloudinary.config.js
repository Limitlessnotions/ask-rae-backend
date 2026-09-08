import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error("❌ Cloudinary configuration is incomplete.");

  if (!cloudName) {
    console.error("❌ Missing: CLOUDINARY_CLOUD_NAME");
  }

  if (!apiKey) {
    console.error("❌ Missing: CLOUDINARY_API_KEY");
  }

  if (!apiSecret) {
    console.error("❌ Missing: CLOUDINARY_API_SECRET");

  }

  throw new Error(
    "Cloudinary configuration is incomplete. Check CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
  );
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

console.log("✅ Cloudinary configured successfully.");

export default cloudinary;