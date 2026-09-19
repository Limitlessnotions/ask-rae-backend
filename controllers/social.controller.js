import { db } from "../firebase/firebaseAdmin.js";
import { getUserPages } from "../services/facebook.service.js";
import { publishContent } from "../services/social.service.js";

/**
 * Get all connected social accounts
 *
 * For Facebook, the connected identity displayed to the user
 * is the Facebook Page rather than the Meta System User.
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

      /*
      |--------------------------------------------------------------------------
      | Facebook
      |--------------------------------------------------------------------------
      */

      if (platform === "facebook") {
        const pages = Array.isArray(data.pages)
          ? data.pages
          : [];

        let defaultPage = null;

        // First try the explicitly configured publishing target.
        if (data.defaultTargetId) {
          defaultPage =
            pages.find(
              (page) =>
                page.id === data.defaultTargetId
            ) ?? null;
        }

        // Fall back to the first available Page.
        if (!defaultPage && pages.length > 0) {
          defaultPage = pages[0];
        }

        /*
        |--------------------------------------------------------------------------
        | Use the Facebook Page identity
        |--------------------------------------------------------------------------
        |
        | Facebook Login for Business may return the Meta System User
        | as the connected profile. The Page returned by /me/accounts
        | is the actual publishing destination.
        |
        */

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

      /*
      |--------------------------------------------------------------------------
      | Other platforms
      |--------------------------------------------------------------------------
      */

      accounts[platform] = data;
    });

    /*
    |--------------------------------------------------------------------------
    | FINAL RESPONSE DEBUG
    |--------------------------------------------------------------------------
    */

    console.log(
      "=========================================="
    );
    console.log(
      "GET CONNECTED SOCIAL ACCOUNTS"
    );
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
 * Get all Facebook Pages connected to the current user
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
 * Universal Social Publisher
 */
export const publishSocialContent = async (
  req,
  res
) => {
  const { uid } = req.user;

  try {
    let {
      platform,
      targetId,
      content,
    } = req.body;

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

    const social =
      socialSnapshot.data();

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

    let accessToken =
      social.accessToken;

    /*
    |--------------------------------------------------------------------------
    | Resolve Target Name
    |--------------------------------------------------------------------------
    |
    | Facebook uses the selected Page name.
    |
    | TikTok does not currently store defaultTargetName in its
    | socialAccounts document. Its connected account document
    | contains `name`, which is the appropriate display identity.
    |
    | Other platforms use the available account name fields.
    |
    */

    let targetName =
      social.defaultTargetName ??
      social.name ??
      social.displayName ??
      social.username ??
      null;

    if (platform === "facebook") {
      const page =
        social.pages?.find(
          (p) => p.id === targetId
        );

      if (!page) {
        return res.status(404).json({
          success: false,
          message:
            "Facebook Page not found.",
        });
      }

      accessToken =
        page.accessToken;

      targetName =
        page.name ??
        targetName ??
        "Facebook";
    }

    /*
    |--------------------------------------------------------------------------
    | Final Firestore-safe fallback
    |--------------------------------------------------------------------------
    |
    | Never write undefined into Firestore.
    |
    */

    targetName =
      targetName ??
      platform;

    /*
    |--------------------------------------------------------------------------
    | Publish Content
    |--------------------------------------------------------------------------
    */

    const result =
      await publishContent({
        platform,
        accessToken,
        targetId,
        content,
      });

    /*
    |--------------------------------------------------------------------------
    | Determine Publishing History Status
    |--------------------------------------------------------------------------
    |
    | TikTok Direct Post returns a publish_id and then processes
    | the post asynchronously. Therefore a TikTok result with
    | status "processing" must not immediately be recorded as
    | "success".
    |
    | Other publishers can continue to use "success" unless
    | their result explicitly reports another status.
    |
    */

    const historyStatus =
      platform === "tiktok" &&
      result?.status === "processing"
        ? "processing"
        : result?.status || "success";

    /*
    |--------------------------------------------------------------------------
    | Save Publishing History
    |--------------------------------------------------------------------------
    */

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
          platform:
            req.body.platform ?? null,

          targetId:
            req.body.targetId ?? null,

          targetName:
            req.body.platform === "tiktok"
              ? "TikTok"
              : null,

          type:
            req.body.content?.type ??
            null,

          content:
            req.body.content ?? null,

          status: "failed",

          error:
            error.message,

          createdAt:
            new Date(),
        });
    } catch (logError) {
      console.error(
        "Failed to log publish error:",
        logError
      );
    }

    return res.status(500).json({
      success: false,
      message:
        error.response?.data?.error?.message ||
        error.message,
    });
  }
};