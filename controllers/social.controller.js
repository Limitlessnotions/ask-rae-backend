
import { db } from "../firebase/firebaseAdmin.js";
import { getUserPages } from "../services/facebook.service.js";
import { publishContent } from "../services/social.service.js";

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

// Poll every 2 seconds, for a maximum of approximately 12 seconds.
const TIKTOK_STATUS_POLL_ATTEMPTS = 7;
const TIKTOK_STATUS_POLL_INTERVAL_MS = 2000;

const wait = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Query TikTok's actual publishing status.
 */
async function fetchTikTokPublishStatus(
  accessToken,
  publishId
) {
  const response = await fetch(
    `${TIKTOK_API_BASE}/post/publish/status/fetch/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        publish_id: publishId,
      }),
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
      data?.message ||
      `TikTok status request failed with HTTP ${response.status}.`
    );
  }

  if (
    data?.error?.code &&
    data.error.code !== "ok"
  ) {
    throw new Error(
      data.error.message ||
      `TikTok status error: ${data.error.code}`
    );
  }

  if (!data?.data?.status) {
    throw new Error(
      "TikTok returned no publishing status."
    );
  }

  return data;
}

/**
 * Poll TikTok until the inbox upload is confirmed,
 * failed, or the polling window expires.
 */
async function verifyTikTokInboxUpload({
  accessToken,
  publishId,
}) {
  if (!accessToken) {
    throw new Error(
      "TikTok access token is missing for status verification."
    );
  }

  if (!publishId) {
    throw new Error(
      "TikTok publish ID is missing for status verification."
    );
  }

  let latestResponse = null;

  for (
    let attempt = 1;
    attempt <= TIKTOK_STATUS_POLL_ATTEMPTS;
    attempt++
  ) {
    if (attempt > 1) {
      await wait(TIKTOK_STATUS_POLL_INTERVAL_MS);
    }

    latestResponse = await fetchTikTokPublishStatus(
      accessToken,
      publishId
    );

    const status = latestResponse.data.status;

    console.log("TikTok status verification:", {
      publishId,
      attempt,
      status,
    });

    // TikTok has confirmed delivery to the creator's inbox.
    if (status === "SEND_TO_USER_INBOX") {
      return {
        status,
        completed: true,
        userActionRequired: true,
        message:
          "Your content was successfully sent to TikTok. Check your TikTok inbox to continue editing and publishing. Notifications may take a little while to arrive.",
        publishId,
        failReason:
          latestResponse.data.fail_reason ?? null,
        publicalyAvailablePostId:
          latestResponse.data.publicaly_available_post_id ?? [],
        raw: latestResponse,
      };
    }

    // TikTok explicitly reports that the upload failed.
    if (status === "FAILED") {
      return {
        status,
        completed: true,
        userActionRequired: false,
        message:
          latestResponse.data.fail_reason ||
          "TikTok could not process your content.",
        publishId,
        failReason:
          latestResponse.data.fail_reason ?? null,
        raw: latestResponse,
      };
    }

    // Any other status remains pending.
  }

  return {
    status:
      latestResponse?.data?.status || "PROCESSING",
    completed: false,
    userActionRequired: false,
    message:
      "TikTok is still processing your upload. Ask Rae has not yet received confirmation that the content reached your TikTok inbox. Please check the status again shortly.",
    publishId,
    failReason:
      latestResponse?.data?.fail_reason ?? null,
    raw: latestResponse,
  };
}

/**
 * Get all connected social accounts.
 */
export const getAccounts = async (req, res) => {
  try {
    const { uid } = req.user;

    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("socialAccounts")
      .get();

    const accounts = {
      facebook: null,
      instagram: null,
      tiktok: null,
      x: null,
    };

    snapshot.forEach((doc) => {
      const platform = doc.id;
      const data = doc.data();

      if (platform === "facebook") {
        const pages = Array.isArray(data.pages)
          ? data.pages
          : [];

        let defaultPage = null;

        if (data.defaultTargetId) {
          defaultPage =
            pages.find(
              (page) =>
                page.id === data.defaultTargetId
            ) ?? null;
        }

        if (!defaultPage && pages.length > 0) {
          defaultPage = pages[0];
        }

        accounts.facebook = {
          ...data,

          displayName:
            defaultPage?.name ||
            data.defaultTargetName ||
            "Facebook",

          name:
            defaultPage?.name ||
            data.defaultTargetName ||
            "Facebook",

          avatar:
            defaultPage?.picture ||
            data.avatar ||
            null,

          defaultTargetId:
            defaultPage?.id ||
            data.defaultTargetId ||
            null,

          defaultTargetName:
            defaultPage?.name ||
            data.defaultTargetName ||
            null,
        };

        return;
      }

      accounts[platform] = data;
    });

    console.log(
      "=========================================="
    );
    console.log("GET CONNECTED SOCIAL ACCOUNTS");
    console.log(
      "=========================================="
    );

    console.dir(accounts, {
      depth: null,
    });

    console.log(
      "=========================================="
    );

    return res.status(200).json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    console.error(
      "Get Connected Social Accounts Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.response?.data?.error?.message ||
        error.message ||
        "Unable to load connected social accounts.",
    });
  }
};

/**
 * Get all Facebook Pages connected to the current user.
 */
export const getFacebookPages = async (req, res) => {
  try {
    const { uid } = req.user;

    const socialDoc = await db
      .collection("users")
      .doc(uid)
      .collection("socialAccounts")
      .doc("facebook")
      .get();

    if (!socialDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Facebook account not connected.",
      });
    }

    const social = socialDoc.data();

    const pages = await getUserPages(
      social.accessToken
    );

    const normalizedPages = pages.map((page) => ({
      id: page.id,
      name: page.name,
      category: page.category ?? null,
      accessToken: page.access_token,
      picture:
        page.picture?.data?.url ?? null,
      tasks: page.tasks ?? [],
    }));

    await socialDoc.ref.update({
      pages: normalizedPages,

      defaultTargetId:
        social.defaultTargetId ??
        normalizedPages[0]?.id ??
        null,

      defaultTargetName:
        social.defaultTargetName ??
        normalizedPages[0]?.name ??
        null,

      lastSynced: new Date(),
    });

    return res.status(200).json({
      success: true,
      pages: normalizedPages,
    });
  } catch (error) {
    console.error(
      "Get Facebook Pages Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error.response?.data?.error?.message ||
        error.message,
    });
  }
};

/**
 * Universal Social Publisher.
 *
 * TikTok:
 * 1. Initializes inbox upload.
 * 2. Gets publish_id.
 * 3. Verifies status directly with TikTok.
 * 4. Returns only the verified status result.
 *
 * Other platforms retain their existing publishing flow.
 */
export const publishSocialContent = async (
  req,
  res
) => {
  const { uid } = req.user;

  let platform = req.body.platform;
  let targetId = req.body.targetId;
  const { content } = req.body;

  try {
    if (!platform) {
      return res.status(400).json({
        success: false,
        message: "platform is required.",
      });
    }

    if (!content) {
      return res.status(400).json({
        success: false,
        message: "content is required.",
      });
    }

    platform = platform.toLowerCase();

    const socialRef = db
      .collection("users")
      .doc(uid)
      .collection("socialAccounts")
      .doc(platform);

    const socialSnapshot =
      await socialRef.get();

    if (!socialSnapshot.exists) {
      return res.status(404).json({
        success: false,
        message:
          `${platform} account not connected.`,
      });
    }

    const social = socialSnapshot.data();

    /*
    |--------------------------------------------------------------------------
    | Resolve Publishing Target
    |--------------------------------------------------------------------------
    */

    targetId =
      targetId ||
      social.defaultTargetId ||
      social.platformUserId;

    if (!targetId) {
      return res.status(400).json({
        success: false,
        message:
          "No publishing target configured.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Resolve Access Token
    |--------------------------------------------------------------------------
    */

    let accessToken = social.accessToken;

    /*
    |--------------------------------------------------------------------------
    | Resolve Target Name
    |--------------------------------------------------------------------------
    */

    let targetName =
      social.defaultTargetName ??
      social.name ??
      social.displayName ??
      social.username ??
      null;

    if (platform === "facebook") {
      const page = social.pages?.find(
        (p) => p.id === targetId
      );

      if (!page) {
        return res.status(404).json({
          success: false,
          message: "Facebook Page not found.",
        });
      }

      accessToken = page.accessToken;

      targetName =
        page.name ??
        targetName ??
        "Facebook";
    }

    targetName =
      targetName ??
      platform;

    /*
    |--------------------------------------------------------------------------
    | Initialize Publishing
    |--------------------------------------------------------------------------
    */

    const result = await publishContent({
      platform,
      accessToken,
      targetId,
      content,
    });

    /*
    |--------------------------------------------------------------------------
    | TikTok: Verify Actual Inbox Delivery
    |--------------------------------------------------------------------------
    */

    if (platform === "tiktok") {
      console.log(
        "TikTok upload initialized. Verifying inbox delivery..."
      );

      const publishId = result?.publishId;

      if (!publishId) {
        throw new Error(
          "TikTok upload returned no publish ID. Inbox delivery cannot be verified."
        );
      }

      const verification =
        await verifyTikTokInboxUpload({
          accessToken,
          publishId,
        });

      let historyStatus = "processing";

      if (
        verification.status === "SEND_TO_USER_INBOX"
      ) {
        historyStatus = "sent_to_inbox";
      } else if (
        verification.status === "FAILED"
      ) {
        historyStatus = "failed";
      }

      await db
        .collection("users")
        .doc(uid)
        .collection("publishedContent")
        .add({
          platform,
          targetId,
          targetName,
          type: content.type ?? null,
          content,
          status: historyStatus,

          publishId,
          tiktokStatus: verification.status,
          userActionRequired:
            verification.userActionRequired,

          result: verification,
          publishedAt: new Date(),
        });

      console.log(
        "TikTok verified publishing result:",
        {
          publishId,
          status: verification.status,
          historyStatus,
        }
      );

      /*
       * Do not return the generic success:true response here.
       * The frontend receives TikTok's verified status instead.
       */

      const httpStatus =
        verification.status === "FAILED"
          ? 422
          : verification.completed
            ? 200
            : 202;

      return res.status(httpStatus).json({
        platform: "tiktok",
        ...verification,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Other Platforms: Existing Behavior
    |--------------------------------------------------------------------------
    */

    const historyStatus =
      result?.status || "success";

    await db
      .collection("users")
      .doc(uid)
      .collection("publishedContent")
      .add({
        platform,
        targetId,
        targetName,
        type: content.type ?? null,
        content,
        status: historyStatus,
        result,
        publishedAt: new Date(),
      });

    return res.status(200).json({
      success: true,
      message:
        historyStatus === "processing"
          ? "Content publishing has been initialized."
          : "Content published successfully.",
      result,
    });
  } catch (error) {
    console.error(
      "Publish Content Error:",
      error
    );

    try {
      await db
        .collection("users")
        .doc(uid)
        .collection("publishedContent")
        .add({
          platform: platform ?? null,
          targetId: targetId ?? null,

          targetName:
            platform === "tiktok"
              ? "TikTok"
              : null,

          type:
            content?.type ??
            null,

          content:
            content ?? null,

          status: "failed",
          error: error.message,
          createdAt: new Date(),
        });
    } catch (logError) {
      console.error(
        "Failed to log publish error:",
        logError
      );
    }

    /*
     * TikTok verification errors must not be represented
     * as successful uploads.
     */
    if (platform === "tiktok") {
      return res.status(502).json({
        platform: "tiktok",
        status: "STATUS_CHECK_FAILED",
        completed: false,
        message:
          "Ask Rae could not verify the TikTok inbox delivery. The upload may still be processing. Please check again before retrying to avoid duplicate uploads.",
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        error.response?.data?.error?.message ||
        error.message,
    });
  }
};
