
import { db } from "../firebase/firebaseAdmin.js";

const ALLOWED_EVENTS = new Set([
  "schedule_success",
  "schedule_failure",
  "permission_denied",
  "notification_observed",
  "notification_tapped",
]);

const ALLOWED_PLATFORMS = new Set([
  "ios",
  "android",
  "unknown",
]);

function validDate(value) {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}

/**
 * POST /api/affirmation/monitoring/events
 *
 * Records a monitoring event for the authenticated user.
 * Never accepts a UID from the client.
 * Does not store affirmation text.
 */
export async function recordAffirmationMonitoringEvent(req, res) {
  try {
    const uid = req.user?.uid;

    if (!uid) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    const {
      event,
      date,
      platform = "unknown",
      notificationId,
      timezone,
      errorCode,
    } = req.body ?? {};

    if (!ALLOWED_EVENTS.has(event)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported monitoring event.",
      });
    }

    if (!validDate(date)) {
      return res.status(400).json({
        success: false,
        message: "A valid YYYY-MM-DD date is required.",
      });
    }

    if (!ALLOWED_PLATFORMS.has(platform)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported platform.",
      });
    }

    const safeTimezone =
      typeof timezone === "string" && timezone.length <= 100
        ? timezone
        : null;

    const safeNotificationId =
      typeof notificationId === "string" &&
      notificationId.length <= 200
        ? notificationId
        : null;

    const safeErrorCode =
      typeof errorCode === "string"
        ? errorCode.slice(0, 100)
        : null;

    const doc = await db
      .collection("affirmationMonitoringEvents")
      .add({
        uid,
        event,
        date,
        platform,
        timezone: safeTimezone,
        notificationId: safeNotificationId,
        errorCode: safeErrorCode,
        createdAt: new Date(),
      });

    console.info("Affirmation monitoring event recorded", {
      event,
      date,
      platform,
      eventId: doc.id,
    });

    return res.status(201).json({
      success: true,
      eventId: doc.id,
    });
  } catch (error) {
    console.error("Failed to record affirmation monitoring event:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to record monitoring event.",
    });
  }
}
