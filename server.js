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
import subscriptionRoutes from "./routes/subscription.routes.js";
import revenueCatRoutes from "./routes/revenuecat.routes.js";
import affirmationRoutes from "./routes/affirmation.routes.js";
import reminderRoutes from "./routes/reminder.routes.js";
import calendarRoutes from "./routes/calendar.routes.js";
import wellnessRoutes from "./routes/wellness.routes.js";
import accountabilityRoutes from "./routes/accountability.routes.js";
import accountRoutes from "./routes/account.routes.js";

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

/**
 * AI Chat
 */
app.use(
  "/api/chat",
  chatRoutes
);

/**
 * Social Authentication
 */
app.use(
  "/auth",
  facebookRoutes
);

app.use(
  "/auth",
  instagramRoutes
);

app.use(
  "/auth",
  tiktokRoutes
);

app.use(
  "/auth",
  xRoutes
);

/**
 * Affirmations
 */
app.use(
  "/api/affirmation",
  affirmationRoutes
);

/**
 * Reminders
 */
app.use(
  "/api/reminders",
  reminderRoutes
);

/**
 * Social APIs
 */
app.use(
  "/api",
  pagesRoutes
);

app.use(
  "/api/social",
  socialRoutes
);

/**
 * Media
 */
app.use(
  "/api/media",
  mediaRoutes
);

/**
 * Subscriptions
 */
app.use(
  "/api",
  subscriptionRoutes
);

/**
 * RevenueCat
 */
app.use(
  "/api/revenuecat",
  revenueCatRoutes
);

/**
 * Calendar
 */
app.use(
  "/api/calendar",
  calendarRoutes
);

/**
 * Wellness
 */
app.use(
  "/api/wellness",
  wellnessRoutes
);

/**
 * Accountability
 *
 * GET    /api/accountability
 * GET    /api/accountability/active
 * POST   /api/accountability
 * PATCH  /api/accountability/:goalId
 * DELETE /api/accountability/:goalId
 */
app.use(
  "/api/accountability",
  accountabilityRoutes
);

/**
 * Account
 *
 * DELETE /api/account
 *
 * Permanently deletes the authenticated
 * user's Ask Rae account and associated data.
 */
app.use(
  "/api/account",
  accountRoutes
);

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT}`
  );
});