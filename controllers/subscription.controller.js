import {
  getSubscription,
  hasActiveSubscription,
} from "../services/subscription/subscription.service.js";

/**
 * Get the current user's subscription.
 */
export async function getMySubscription(
  req,
  res
) {
  try {
    const uid = req.user.uid;

    const subscription =
      await getSubscription(uid);

    return res.json({
      success: true,
      subscription,
    });
  } catch (error) {
    console.error(
      "Get subscription error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve subscription.",
    });
  }
}

/**
 * Check whether the current user
 * has an active subscription.
 */
export async function checkSubscription(
  req,
  res
) {
  try {
    const uid = req.user.uid;

    const active =
      await hasActiveSubscription(uid);

    return res.json({
      success: true,
      active,
    });
  } catch (error) {
    console.error(
      "Check subscription error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to check subscription.",
    });
  }
}