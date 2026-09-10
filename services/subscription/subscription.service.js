import { db } from "../../firebase/firebaseAdmin.js";

/**
 * Founding Member configuration.
 *
 * The first 100 Ask Rae users globally
 * can receive the Founding Member price.
 *
 * This counter is shared across iOS and Android.
 */
const FOUNDING_MEMBER_LIMIT = 100;

const FOUNDING_MEMBER_PRODUCT_ID =
  "askrae_premium_founding_members";

const STANDARD_MEMBER_PRODUCT_ID =
  "askrae_premium_monthly";

const FOUNDING_PACKAGE_IDENTIFIER =
  "founding";

const STANDARD_PACKAGE_IDENTIFIER =
  "$rc_monthly";

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
      foundingMember: false,
      foundingSlot: null,
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
 * This is used when the subscription status
 * is updated after purchase verification or
 * RevenueCat webhook processing.
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
export async function hasActiveSubscription(uid) {
  const subscription =
    await getSubscription(uid);

  if (subscription.status !== "active") {
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

/**
 * Get the global founding-member counter
 * inside a Firestore transaction.
 */
async function getFoundingMemberConfig(
  transaction
) {
  const ref = db
    .collection("config")
    .doc("founding_members");

  const snapshot =
    await transaction.get(ref);

  if (!snapshot.exists) {
    return {
      ref,
      count: 0,
      limit: FOUNDING_MEMBER_LIMIT,
    };
  }

  const data = snapshot.data();

  return {
    ref,
    count:
      typeof data.count === "number"
        ? data.count
        : 0,
    limit:
      typeof data.limit === "number"
        ? data.limit
        : FOUNDING_MEMBER_LIMIT,
  };
}

/**
 * Get the subscription offer for a user.
 *
 * The user's founding/standard classification
 * is permanent once assigned.
 *
 * If the user has already received a founding
 * slot, they continue to receive the founding
 * product.
 *
 * If no classification exists yet and founding
 * slots remain, a Firestore transaction
 * atomically assigns the next slot.
 *
 * If all 100 slots are taken, the user is
 * permanently classified as standard.
 */
export async function getSubscriptionOffer(uid) {
  const userSubscriptionRef = db
    .collection("users")
    .doc(uid)
    .collection("subscription")
    .doc("current");

  let result = null;

  await db.runTransaction(async (transaction) => {
    const subscriptionSnapshot =
      await transaction.get(
        userSubscriptionRef
      );

    /**
     * User already has a subscription
     * classification.
     */
    if (subscriptionSnapshot.exists) {
      const subscription =
        subscriptionSnapshot.data();

      /**
       * Existing founding member.
       */
      if (
        subscription.foundingMember === true
      ) {
        result = {
          foundingMember: true,
          foundingSlot:
            subscription.foundingSlot ?? null,
          productId:
            FOUNDING_MEMBER_PRODUCT_ID,
          packageIdentifier:
            FOUNDING_PACKAGE_IDENTIFIER,
        };

        return;
      }

      /**
       * Existing standard member.
       */
      if (
        subscription.foundingMember === false
      ) {
        result = {
          foundingMember: false,
          foundingSlot: null,
          productId:
            STANDARD_MEMBER_PRODUCT_ID,
          packageIdentifier:
            STANDARD_PACKAGE_IDENTIFIER,
        };

        return;
      }
    }

    /**
     * No membership classification exists yet.
     *
     * Read the global counter inside the
     * same transaction so multiple users
     * cannot receive the same slot.
     */
    const config =
      await getFoundingMemberConfig(
        transaction
      );

    /**
     * Founding slots are still available.
     */
    if (config.count < config.limit) {
      const foundingSlot =
        config.count + 1;

      transaction.set(
        userSubscriptionRef,
        {
          foundingMember: true,
          foundingSlot,
          plan: "founding",
          foundingProductId:
            FOUNDING_MEMBER_PRODUCT_ID,
          updatedAt: new Date(),
        },
        {
          merge: true,
        }
      );

      transaction.set(
        config.ref,
        {
          count: foundingSlot,
          limit: config.limit,
          updatedAt: new Date(),
        },
        {
          merge: true,
        }
      );

      result = {
        foundingMember: true,
        foundingSlot,
        productId:
          FOUNDING_MEMBER_PRODUCT_ID,
        packageIdentifier:
          FOUNDING_PACKAGE_IDENTIFIER,
      };

      return;
    }

    /**
     * All founding slots have been assigned.
     *
     * This user receives the standard
     * subscription permanently.
     */
    transaction.set(
      userSubscriptionRef,
      {
        foundingMember: false,
        foundingSlot: null,
        plan: "standard",
        standardProductId:
          STANDARD_MEMBER_PRODUCT_ID,
        updatedAt: new Date(),
      },
      {
        merge: true,
      }
    );

    result = {
      foundingMember: false,
      foundingSlot: null,
      productId:
        STANDARD_MEMBER_PRODUCT_ID,
      packageIdentifier:
        STANDARD_PACKAGE_IDENTIFIER,
    };
  });

  return result;
}

/**
 * Return the current founding-member
 * availability.
 *
 * Useful for admin/debugging purposes.
 */
export async function getFoundingMemberStatus() {
  const ref = db
    .collection("config")
    .doc("founding_members");

  const snapshot = await ref.get();

  if (!snapshot.exists) {
    return {
      count: 0,
      limit: FOUNDING_MEMBER_LIMIT,
      remaining: FOUNDING_MEMBER_LIMIT,
      soldOut: false,
    };
  }

  const data = snapshot.data();

  const count =
    typeof data.count === "number"
      ? data.count
      : 0;

  const limit =
    typeof data.limit === "number"
      ? data.limit
      : FOUNDING_MEMBER_LIMIT;

  return {
    count,
    limit,
    remaining: Math.max(
      limit - count,
      0
    ),
    soldOut: count >= limit,
  };
}