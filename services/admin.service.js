import { auth, db } from "../firebase/firebaseAdmin.js";

const PLATFORMS = [
  "facebook",
  "instagram",
  "tiktok",
  "x",
];

const SENSITIVE_KEYS = new Set([
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "idToken",
  "id_token",
  "token",
  "clientSecret",
  "client_secret",
  "secret",
  "password",
  "authorization",
  "cookie",
  "sessionToken",
  "session_token",
  "raw",
]);

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
 * Recursively removes credentials and other sensitive values.
 *
 * This is used both for API responses and audit metadata.
 */
function sanitizeSensitive(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeSensitive);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const out = {};

  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key)) {
      continue;
    }

    out[key] = sanitizeSensitive(val);
  }

  return out;
}

function sanitizeSocial(data = {}) {
  return sanitizeSensitive(data);
}

function sanitizeForResponse(value) {
  return sanitizeSensitive(serialize(value));
}

/**
 * Safely checks whether an environment variable exists.
 */
function isConfigured(value) {
  return Boolean(
    typeof value === "string" && value.trim()
  );
}

/**
 * Create a consistent health-check result.
 */
function healthResult({
  status,
  message,
  latencyMs,
}) {
  return {
    status,
    message,
    ...(typeof latencyMs === "number"
      ? { latencyMs }
      : {}),
  };
}

/**
 * Measure an async health check.
 */
async function measureCheck(check) {
  const startedAt = Date.now();

  try {
    const result = await check();

    return {
      ...result,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    return healthResult({
      status: "unhealthy",
      message:
        error?.message ||
        "Health check failed.",
      latencyMs: Date.now() - startedAt,
    });
  }
}

/**
 * Actual OpenAI connectivity check.
 *
 * This calls the models endpoint rather than merely
 * checking whether OPENAI_API_KEY exists.
 */
async function checkOpenAI() {
  if (!isConfigured(process.env.OPENAI_API_KEY)) {
    return healthResult({
      status: "not_configured",
      message: "OPENAI_API_KEY is not configured.",
    });
  }

  const response = await fetch(
    "https://api.openai.com/v1/models",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!response.ok) {
    let detail = "";

    try {
      const body = await response.json();

      detail =
        body?.error?.message ||
        body?.message ||
        "";
    } catch {
      // Ignore response parsing errors.
    }

    throw new Error(
      `OpenAI returned HTTP ${response.status}${
        detail ? `: ${detail}` : "."
      }`
    );
  }

  return healthResult({
    status: "healthy",
    message: "OpenAI API connection successful.",
  });
}

/**
 * Firestore connectivity check.
 */
async function checkFirestore() {
  const snapshot = await db
    .collection("config")
    .doc("health")
    .get();

  return healthResult({
    status: "healthy",
    message: snapshot.exists
      ? "Firestore connection successful."
      : "Firestore connection successful; health document does not exist.",
  });
}

/**
 * Backend is healthy when this function executes.
 */
async function checkBackend() {
  return healthResult({
    status: "healthy",
    message: "Admin backend is responding.",
  });
}

/**
 * Cloudinary currently reports configuration state.
 *
 * We intentionally do not manufacture a provider API
 * request because the current backend file does not
 * establish which Cloudinary credential/authentication
 * variables are used for API authentication.
 */
async function checkCloudinary() {
  if (
    isConfigured(
      process.env.CLOUDINARY_CLOUD_NAME
    )
  ) {
    return healthResult({
      status: "degraded",
      message:
        "Cloudinary is configured. Provider connectivity is not actively verified by the admin health check.",
    });
  }

  return healthResult({
    status: "not_configured",
    message:
      "CLOUDINARY_CLOUD_NAME is not configured.",
  });
}

/**
 * RevenueCat currently reports configuration state.
 *
 * The existing backend health implementation only
 * establishes REVENUECAT_WEBHOOK_AUTH as a configured
 * variable, so we preserve that contract rather than
 * guessing a RevenueCat API credential.
 */
async function checkRevenueCat() {
  if (
    isConfigured(
      process.env.REVENUECAT_WEBHOOK_AUTH
    )
  ) {
    return healthResult({
      status: "degraded",
      message:
        "RevenueCat configuration is present. Provider connectivity is not actively verified by the admin health check.",
    });
  }

  return healthResult({
    status: "not_configured",
    message:
      "REVENUECAT_WEBHOOK_AUTH is not configured.",
  });
}

/**
 * Meta currently reports configuration state.
 *
 * The existing backend uses FACEBOOK_APP_ID as the
 * known configuration signal.
 */
async function checkMeta() {
  if (
    isConfigured(
      process.env.FACEBOOK_APP_ID
    )
  ) {
    return healthResult({
      status: "degraded",
      message:
        "Meta configuration is present. Graph API connectivity is not actively verified by the admin health check.",
    });
  }

  return healthResult({
    status: "not_configured",
    message:
      "FACEBOOK_APP_ID is not configured.",
  });
}

/**
 * TikTok currently reports configuration state.
 */
async function checkTikTok() {
  if (
    isConfigured(
      process.env.TIKTOK_CLIENT_KEY
    )
  ) {
    return healthResult({
      status: "degraded",
      message:
        "TikTok configuration is present. Provider connectivity is not actively verified by the admin health check.",
    });
  }

  return healthResult({
    status: "not_configured",
    message:
      "TIKTOK_CLIENT_KEY is not configured.",
  });
}

/**
 * X currently reports configuration state.
 */
async function checkX() {
  if (
    isConfigured(
      process.env.X_CLIENT_ID
    )
  ) {
    return healthResult({
      status: "degraded",
      message:
        "X configuration is present. Provider connectivity is not actively verified by the admin health check.",
    });
  }

  return healthResult({
    status: "not_configured",
    message:
      "X_CLIENT_ID is not configured.",
    });
}

/**
 * Calculate an overall health state.
 */
function calculateOverallStatus(checks) {
  const statuses = Object.values(checks).map(
    (check) => check.status
  );

  if (
    statuses.some(
      (status) => status === "unhealthy"
    )
  ) {
    return "unhealthy";
  }

  if (
    statuses.some(
      (status) => status === "degraded"
    )
  ) {
    return "degraded";
  }

  if (
    statuses.every(
      (status) => status === "healthy"
    )
  ) {
    return "healthy";
  }

  if (
    statuses.every(
      (status) => status === "not_configured"
    )
  ) {
    return "degraded";
  }

  return "degraded";
}

export async function getDashboard() {
  const usersCountSnap = await db
    .collection("users")
    .count()
    .get();

  const usersCount =
    usersCountSnap.data().count;

  const usersSnap = await db
    .collection("users")
    .limit(1000)
    .get();

  const subscriptionRefs =
    usersSnap.docs.map((doc) =>
      doc.ref
        .collection("subscription")
        .doc("current")
    );

  const socialRefs = usersSnap.docs.flatMap(
    (doc) =>
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
      subscriptionRefs.map((ref) =>
        ref.get()
      )
    ),

    Promise.all(
      socialRefs.map((ref) =>
        ref.get()
      )
    ),

    getFoundingStatus(),
  ]);

  const subscriptions =
    subscriptionSnaps
      .filter((snap) => snap.exists)
      .map((snap) => snap.data());

  const socialCounts =
    Object.fromEntries(
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
    if (
      subscription.status === "active"
    ) {
      activeSubscriptions += 1;
    }

    if (
      subscription.status === "trial" ||
      subscription.isTrial === true
    ) {
      trialUsers += 1;
    }
  }

  const publishedCounts =
    await Promise.all(
      usersSnap.docs.map(async (user) => {
        const snap = await user.ref
          .collection("publishedContent")
          .get();

        return snap.docs.reduce(
          (acc, doc) => {
            const status =
              doc.data()?.status ||
              "unknown";

            acc.total += 1;
            acc[status] =
              (acc[status] || 0) + 1;

            return acc;
          },
          { total: 0 }
        );
      })
    );

  const publishing =
    publishedCounts.reduce(
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

  return sanitizeForResponse({
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

  const count = Number.isFinite(
    data.count
  )
    ? data.count
    : 0;

  const limit = Number.isFinite(
    data.limit
  )
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

  const firestoreDocs =
    await Promise.all(
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

        return sanitizeForResponse({
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
            user.metadata.creationTime ||
            null,

          lastSignInAt:
            user.metadata.lastSignInTime ||
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
    sanitizeForResponse(result);

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
        sanitizeForResponse({
          id: doc.id,

          userId: user.uid,

          userEmail:
            user.email || null,

          ...doc.data(),
        })
      );
    });
  }

  rows.sort((a, b) => {
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

    return (
      (Number.isNaN(dateB)
        ? 0
        : dateB) -
      (Number.isNaN(dateA)
        ? 0
        : dateA)
    );
  });

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
      sanitizeForResponse({
        uid: user.uid,

        email:
          user.email || null,

        name:
          user.displayName || null,

        ...snap.data(),
      })
    );
  }

  rows.sort((a, b) => {
    const nameA = String(
      a.name ||
        a.email ||
        a.uid ||
        ""
    ).trim();

    const nameB = String(
      b.name ||
        b.email ||
        b.uid ||
        ""
    ).trim();

    const comparison =
      nameA.localeCompare(
        nameB,
        undefined,
        {
          sensitivity: "base",
        }
      );

    if (comparison !== 0) {
      return comparison;
    }

    return String(a.uid).localeCompare(
      String(b.uid)
    );
  });

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
    sanitizeForResponse({
      id: doc.id,
      ...doc.data(),
    })
  );
}

export async function getSystemHealth() {
  const checks = {};

  checks.backend =
    await measureCheck(
      checkBackend
    );

  checks.firestore =
    await measureCheck(
      checkFirestore
    );

  checks.openai =
    await measureCheck(
      checkOpenAI
    );

  checks.cloudinary =
    await measureCheck(
      checkCloudinary
    );

  checks.revenueCat =
    await measureCheck(
      checkRevenueCat
    );

  checks.meta =
    await measureCheck(
      checkMeta
    );

  checks.tiktok =
    await measureCheck(
      checkTikTok
    );

  checks.x =
    await measureCheck(
      checkX
    );

  return {
    status:
      calculateOverallStatus(checks),

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
  const safeMetadata =
    sanitizeSensitive(metadata);

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

      metadata:
        safeMetadata,

      createdAt:
        new Date(),
    });
}