import { db } from "../../firebase/firebaseAdmin.js";

/**
 * Get the current subscription for a user.
 */
export async function getSubscription(uid) {
  const ref = db
    .collection("users")
    .doc(uid)
    .collection("subscription")
    .doc("current");

  const snapshot = await ref.get();

  if (!snapshot.exists) {
    return {
      status: "inactive",
      plan: null,
      platform: null,
      productId: null,
      expiresAt: null,
    };
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

/**
 * Update the current subscription for a user.
 *
 * This will eventually be called after
 * Apple/Google purchase verification.
 */
export async function updateSubscription(
  uid,
  subscription
) {
  const ref = db
    .collection("users")
    .doc(uid)
    .collection("subscription")
    .doc("current");

  await ref.set(
    {
      ...subscription,
      updatedAt: new Date(),
    },
    {
      merge: true,
    }
  );

  return getSubscription(uid);
}

/**
 * Check whether a user currently has
 * an active subscription.
 */
export async function hasActiveSubscription(
  uid
) {
  const subscription =
    await getSubscription(uid);

  if (
    subscription.status !== "active"
  ) {
    return false;
  }

  if (!subscription.expiresAt) {
    return true;
  }

  const expiresAt =
    subscription.expiresAt.toDate
      ? subscription.expiresAt.toDate()
      : new Date(subscription.expiresAt);

  return expiresAt > new Date();
}