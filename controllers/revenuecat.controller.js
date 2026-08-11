import {
  updateSubscription,
} from "../services/subscription/subscription.service.js";

import { db } from "../firebase/firebaseAdmin.js";

export async function handleRevenueCatWebhook(
  req,
  res
) {
  try {
    const authorization =
      req.headers.authorization;

    const expectedAuthorization =
      process.env.REVENUECAT_WEBHOOK_AUTH;

    if (
      !expectedAuthorization ||
      authorization !== expectedAuthorization
    ) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized.",
      });
    }

    const event = req.body?.event;

    if (!event) {
      return res.status(400).json({
        success: false,
        message:
          "RevenueCat event missing.",
      });
    }

    const {
      id: eventId,
      type,
      app_user_id,
      product_id,
      expiration_at_ms,
      store,
      entitlement_ids,
      environment,
      transaction_id,
      original_transaction_id,
    } = event;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message:
          "RevenueCat event ID missing.",
      });
    }

    if (!app_user_id) {
      return res.status(400).json({
        success: false,
        message:
          "RevenueCat app_user_id missing.",
      });
    }

    /*
     * Prevent duplicate processing.
     */
    const eventRef = db
      .collection("revenuecat_events")
      .doc(eventId);

    const existingEvent =
      await eventRef.get();

    if (existingEvent.exists) {
      console.log(
        "RevenueCat event already processed:",
        eventId
      );

      return res.status(200).json({
        success: true,
        duplicate: true,
      });
    }

    console.log(
      "RevenueCat webhook:",
      type,
      app_user_id
    );

    const platform =
      store === "APP_STORE"
        ? "ios"
        : store === "PLAY_STORE"
        ? "android"
        : null;

    const expiresAt =
      expiration_at_ms
        ? new Date(expiration_at_ms)
        : null;

    const activeEvents = [
      "INITIAL_PURCHASE",
      "RENEWAL",
      "UNCANCELLATION",
      "NON_RENEWING_PURCHASE",
      "SUBSCRIPTION_EXTENDED",
    ];

    const inactiveEvents = [
      "EXPIRATION",
    ];

    if (activeEvents.includes(type)) {
      await updateSubscription(
        app_user_id,
        {
          status: "active",

          plan:
            entitlement_ids?.[0] ??
            product_id ??
            null,

          platform,

          productId:
            product_id ?? null,

          expiresAt,

          environment:
            environment ?? null,

          transactionId:
            transaction_id ?? null,

          originalTransactionId:
            original_transaction_id ??
            null,
        }
      );
    }

    if (inactiveEvents.includes(type)) {
      await updateSubscription(
        app_user_id,
        {
          status: "inactive",

          productId:
            product_id ?? null,

          platform,

          expiresAt,

          environment:
            environment ?? null,

          transactionId:
            transaction_id ?? null,

          originalTransactionId:
            original_transaction_id ??
            null,
        }
      );
    }

    /*
     * Mark the event as processed only
     * after subscription processing succeeds.
     */
    await eventRef.set({
      eventId,
      type,
      appUserId: app_user_id,
      processedAt: new Date(),
    });

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.error(
      "RevenueCat webhook error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to process RevenueCat webhook.",
    });
  }
}