import { auth, db } from "../firebase/firebaseAdmin.js";

const PLATFORMS = ["facebook", "instagram", "tiktok", "x"];

function serialize(value) {
  if (value?.toDate instanceof Function) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serialize);
  }

  if (value && typeof value === "object") {
    const out = {};

    for (const [key, val] of Object.entries(value)) {
      out[key] = serialize(val);
    }

    return out;
  }

  return value;
}

/**
 * Removes authentication credentials and other sensitive
 * provider data before returning social account information
 * through the admin API.
 */
function sanitizeSocial(data = {}) {
  const out = { ...data };

  // Never expose authentication credentials through the admin API.
  for (const key of [
    "accessToken",
    "refreshToken",
    "token",
    "clientSecret",
    "secret",
    "raw",
  ]) {
    delete out[key];
  }

  // Sanitize Facebook page objects as well.
  if (Array.isArray(out.pages)) {
    out.pages = out.pages.map((page) => {
      const copy = { ...page };

      delete copy.access_token;
      delete copy.accessToken;
      delete copy.refresh_token;
      delete copy.refreshToken;
      delete copy.token;
      delete copy.secret;

      return copy;
    });
  }

  return out;
}

export async function getDashboard() {
  const usersCountSnap = await db.collection("users").count().get();

  const usersCount = usersCountSnap.data().count;

  const usersSnap = await db
    .collection("users")
    .limit(1000)
    .get();

  const subscriptionRefs = usersSnap.docs.map((doc) =>
    doc.ref.collection("subscription").doc("current")
  );

  const socialRefs = usersSnap.docs.flatMap((doc) =>
    PLATFORMS.map((platform) =>
      doc.ref
        .collection("socialAccounts")
        .doc(platform)
    )
  );

  const [
    subscriptionSnaps,
    socialSnaps,
    founding,
  ] = await Promise.all([
    Promise.all(
      subscriptionRefs.map((ref) => ref.get())
    ),

    Promise.all(
      socialRefs.map((ref) => ref.get())
    ),

    getFoundingStatus(),
  ]);

  const subscriptions = subscriptionSnaps
    .filter((snap) => snap.exists)
    .map((snap) => snap.data());

  const socialCounts = Object.fromEntries(
    PLATFORMS.map((platform) => [
      platform,
      0,
    ])
  );

  socialSnaps.forEach((snap) => {
    if (
      snap.exists &&
      socialCounts[snap.id] !== undefined
    ) {
      socialCounts[snap.id] += 1;
    }
  });

  let activeSubscriptions = 0;
  let trialUsers = 0;

  for (const subscription of subscriptions) {
    if (subscription.status === "active") {
      activeSubscriptions += 1;
    }

    if (
      subscription.status === "trial" ||
      subscription.isTrial === true
    ) {
      trialUsers += 1;
    }
  }

  const publishedCounts = await Promise.all(
    usersSnap.docs.map(async (user) => {
      const snap = await user.ref
        .collection("publishedContent")
        .get();

      return snap.docs.reduce(
        (acc, doc) => {
          const status =
            doc.data()?.status || "unknown";

          acc.total += 1;
          acc[status] =
            (acc[status] || 0) + 1;

          return acc;
        },
        { total: 0 }
      );
    })
  );

  const publishing = publishedCounts.reduce(
    (acc, current) => {
      acc.total += current.total;
      acc.published +=
        current.success || 0;
      acc.processing +=
        current.processing || 0;
      acc.failed +=
        current.failed || 0;

      return acc;
    },
    {
      total: 0,
      published: 0,
      processing: 0,
      failed: 0,
    }
  );

  return serialize({
    users: {
      total: usersCount,
    },

    subscriptions: {
      active: activeSubscriptions,
      trial: trialUsers,
      founding,
    },

    social: socialCounts,

    publishing,

    generatedAt: new Date(),

    limitation:
      usersCount > 1000
        ? "Dashboard subscription/social/publishing aggregates currently sample the first 1,000 users; total user count is exact."
        : null,
  });
}

export async function getFoundingStatus() {
  const snap = await db
    .collection("config")
    .doc("founding_members")
    .get();

  const data = snap.exists
    ? snap.data()
    : {};

  const count = Number.isFinite(data.count)
    ? data.count
    : 0;

  const limit = Number.isFinite(data.limit)
    ? data.limit
    : 100;

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

export async function listUsers({
  limit = 50,
  pageToken,
} = {}) {
  const result = await auth.listUsers(
    Math.min(
      Number(limit) || 50,
      100
    ),
    pageToken || undefined
  );

  const firestoreDocs = await Promise.all(
    result.users.map((user) =>
      db
        .collection("users")
        .doc(user.uid)
        .get()
    )
  );

  const users = await Promise.all(
    result.users.map(
      async (user, index) => {
        const profile =
          firestoreDocs[index].exists
            ? firestoreDocs[index].data()
            : {};

        const subscriptionSnap =
          await db
            .collection("users")
            .doc(user.uid)
            .collection("subscription")
            .doc("current")
            .get();

        return serialize({
          uid: user.uid,

          email:
            user.email || null,

          name:
            user.displayName ||
            profile.fullName ||
            null,

          photoURL:
            user.photoURL || null,

          disabled:
            user.disabled,

          createdAt:
            user.metadata
              .creationTime ||
            null,

          lastSignInAt:
            user.metadata
              .lastSignInTime ||
            null,

          emailVerified:
            user.emailVerified,

          subscription:
            subscriptionSnap.exists
              ? subscriptionSnap.data()
              : null,
        });
      }
    )
  );

  return {
    users,
    nextPageToken:
      result.pageToken || null,
  };
}

export async function getUserDetails(uid) {
  console.log(
    `[ADMIN USER] Starting user lookup: ${uid}`
  );

  console.log(
    `[ADMIN USER] 1. Getting Firebase Auth user...`
  );

  const user = await auth.getUser(uid);

  console.log(
    `[ADMIN USER] 1. Auth user loaded: ${
      user.email || uid
    }`
  );

  const ref = db
    .collection("users")
    .doc(uid);

  console.log(
    `[ADMIN USER] 2. Getting profile...`
  );

  const profileSnap = await ref.get();

  console.log(
    `[ADMIN USER] 2. Profile loaded: ${
      profileSnap.exists
    }`
  );

  console.log(
    `[ADMIN USER] 3. Getting subscription...`
  );

  const subscriptionSnap =
    await ref
      .collection("subscription")
      .doc("current")
      .get();

  console.log(
    `[ADMIN USER] 3. Subscription loaded: ${
      subscriptionSnap.exists
    }`
  );

  console.log(
    `[ADMIN USER] 4. Getting social accounts...`
  );

  const socialSnap =
    await ref
      .collection("socialAccounts")
      .get();

  console.log(
    `[ADMIN USER] 4. Social accounts loaded: ${
      socialSnap.size
    }`
  );

  console.log(
    `[ADMIN USER] 5. Getting published content...`
  );

  const publishedSnap =
    await ref
      .collection("publishedContent")
      .limit(50)
      .get();

  console.log(
    `[ADMIN USER] 5. Published content loaded: ${
      publishedSnap.size
    }`
  );

  console.log(
    `[ADMIN USER] 6. Getting accountability goals...`
  );

  const goalsSnap =
    await ref
      .collection("accountabilityGoals")
      .limit(20)
      .get();

  console.log(
    `[ADMIN USER] 6. Accountability goals loaded: ${
      goalsSnap.size
    }`
  );

  console.log(
    `[ADMIN USER] 7. Building response...`
  );

  const result = {
    uid: user.uid,

    email:
      user.email || null,

    name:
      user.displayName ||
      profileSnap.data()?.fullName ||
      null,

    photoURL:
      user.photoURL || null,

    disabled:
      user.disabled,

    emailVerified:
      user.emailVerified,

    createdAt:
      user.metadata.creationTime ||
      null,

    lastSignInAt:
      user.metadata.lastSignInTime ||
      null,

    profile:
      profileSnap.exists
        ? profileSnap.data()
        : null,

    subscription:
      subscriptionSnap.exists
        ? subscriptionSnap.data()
        : null,

    /*
     * IMPORTANT:
     * sanitizeSocial() removes raw provider
     * credentials before they leave the backend.
     */
    socialAccounts:
      Object.fromEntries(
        socialSnap.docs.map((doc) => [
          doc.id,
          sanitizeSocial(
            doc.data()
          ),
        ])
      ),

    recentPublications:
  publishedSnap.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .sort((a, b) => {
      const dateA = new Date(
        a.publishedAt ||
          a.createdAt ||
          0
      ).getTime();

      const dateB = new Date(
        b.publishedAt ||
          b.createdAt ||
          0
      ).getTime();

      return dateB - dateA;
    })
    .slice(0, 20),

    accountability:
      goalsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })),
  };

  console.log(
    `[ADMIN USER] 8. Serializing response...`
  );

  const serialized =
    serialize(result);

  console.log(
    `[ADMIN USER] COMPLETE: ${uid}`
  );

  return serialized;
}

export async function listPublications({
  limit = 50,
} = {}) {
  const users =
    await auth.listUsers(1000);

  const rows = [];

  for (const user of users.users) {
    const snap =
      await db
        .collection("users")
        .doc(user.uid)
        .collection("publishedContent")
        .orderBy(
          "publishedAt",
          "desc"
        )
        .limit(
          Number(limit) || 50
        )
        .get();

    snap.docs.forEach((doc) => {
      rows.push(
        serialize({
          id: doc.id,
          userId: user.uid,
          userEmail:
            user.email || null,
          ...doc.data(),
        })
      );
    });
  }

  rows.sort((a, b) =>
    String(
      b.publishedAt || ""
    ).localeCompare(
      String(
        a.publishedAt || ""
      )
    )
  );

  return rows.slice(
    0,
    Number(limit) || 50
  );
}

export async function listSubscriptions({
  limit = 100,
} = {}) {
  const result =
    await auth.listUsers(
      Math.min(
        Number(limit) || 100,
        1000
      )
    );

  const rows = [];

  for (const user of result.users) {
    const snap =
      await db
        .collection("users")
        .doc(user.uid)
        .collection("subscription")
        .doc("current")
        .get();

    if (!snap.exists) {
      continue;
    }

    rows.push(
      serialize({
        uid: user.uid,

        email:
          user.email || null,

        name:
          user.displayName || null,

        ...snap.data(),
      })
    );
  }

  return rows;
}

export async function listAuditLogs({
  limit = 100,
} = {}) {
  const snap =
    await db
      .collection("admin_audit_logs")
      .orderBy(
        "createdAt",
        "desc"
      )
      .limit(
        Math.min(
          Number(limit) || 100,
          200
        )
      )
      .get();

  return snap.docs.map((doc) =>
    serialize({
      id: doc.id,
      ...doc.data(),
    })
  );
}

export async function getSystemHealth() {
  const checks = {};

  try {
    await db
      .collection("config")
      .doc("health")
      .get();

    checks.firestore =
      "healthy";
  } catch {
    checks.firestore =
      "unhealthy";
  }

  checks.backend =
    "healthy";

  checks.openai =
    process.env.OPENAI_API_KEY
      ? "configured"
      : "missing";

  checks.cloudinary =
    process.env.CLOUDINARY_CLOUD_NAME
      ? "configured"
      : "missing";

  checks.revenueCat =
    process.env.REVENUECAT_WEBHOOK_AUTH
      ? "configured"
      : "missing";

  checks.meta =
    process.env.FACEBOOK_APP_ID
      ? "configured"
      : "missing";

  checks.tiktok =
    process.env.TIKTOK_CLIENT_KEY
      ? "configured"
      : "missing";

  checks.x =
    process.env.X_CLIENT_ID
      ? "configured"
      : "missing";

  return {
    checks,
    checkedAt:
      new Date().toISOString(),
  };
}

export async function writeAuditLog({
  actor,
  action,
  targetType,
  targetId,
  result = "success",
  metadata = {},
}) {
  await db
    .collection("admin_audit_logs")
    .add({
      actorUid:
        actor.uid,

      actorEmail:
        actor.email || null,

      actorRole:
        actor.role,

      action,

      targetType,

      targetId:
        targetId || null,

      result,

      metadata,

      createdAt:
        new Date(),
    });
}