import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import facebookRoutes from "./routes/facebook.routes.js";
import instagramRoutes from "./routes/instagram.routes.js";
import pagesRoutes from "./routes/pages.routes.js";
import socialRoutes from "./routes/social.routes.js";
import tiktokRoutes from "./routes/tiktok.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import xRoutes from "./routes/x.routes.js";
import mediaRoutes from "./routes/media.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Ask Rae Backend is running 🚀",
  });
});

app.use("/api/chat", chatRoutes);
app.use("/auth", facebookRoutes);
app.use("/auth", instagramRoutes);
app.use("/api", pagesRoutes);
app.use("/api/social", socialRoutes);
app.use("/auth", tiktokRoutes);
app.use("/auth", xRoutes);
app.use("/api/media", mediaRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
