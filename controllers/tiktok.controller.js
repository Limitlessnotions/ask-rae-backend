import { db } from "../firebase/firebaseAdmin.js";
import {
  createConnection,
  handleCallback,
} from "../services/oauth/oauth.service.js";

/**
 * --------------------------------------------------------------------------
 * TikTok API
 * --------------------------------------------------------------------------
 */

const TIKTOK_API_BASE =
  "https://open.tiktokapis.com/v2";

/**
 * --------------------------------------------------------------------------
 * Start TikTok OAuth
 * --------------------------------------------------------------------------
 */
export async function loginWithTikTok(req, res) {
  try {
    const result = await createConnection({
      uid: req.user.uid,
      platform: "tiktok",
    });

    return res.json({
      success: true,
      authorizationUrl:
        result.authorizationUrl,
    });
  } catch (error) {
    console.error(
      "TikTok login failed:"
    );
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

/**
 * --------------------------------------------------------------------------
 * TikTok OAuth Callback
 * --------------------------------------------------------------------------
 */
export async function tiktokCallback(req, res) {
  try {
    console.log(
      "================================="
    );
    console.log(
      "TIKTOK OAUTH CALLBACK"
    );
    console.log(
      "================================="
    );
    console.log(
      "Query:",
      req.query
    );

    const result =
      await handleCallback({
        platform: "tiktok",
        query: req.query,
      });

    console.log(
      "TikTok OAuth completed successfully."
    );
    console.log(
      "Account:",
      result.account
    );

    /**
     * Build the account value safely.
     *
     * TikTok may return the name using different property names depending
     * on how the account was normalized.
     */
    const account =
      result.account?.username ??
      result.account?.displayName ??
      result.account?.display_name ??
      result.account?.name ??
      "";

    /**
     * ----------------------------------------------------------------------
     * Redirect back to the Ask Rae mobile app
     * ----------------------------------------------------------------------
     *
     * The Expo Router structure contains:
     *
     * src/app/(tabs)/social.tsx
     *
     * Therefore the actual route is:
     *
     * /social
     *
     * Query parameters use "=":
     *
     * ?status=success
     *
     * NOT:
     *
     * ?status/success
     */

    const deepLink =
      `askrae://socials` +
      `?status=success` +
      `&platform=tiktok` +
      `&account=${encodeURIComponent(
        account
      )}`;

    console.log(
      "================================="
    );
    console.log(
      "TIKTOK SUCCESS DEEP LINK"
    );
    console.log(
      "================================="
    );
    console.log(
      deepLink
    );
    console.log(
      "================================="
    );

    return res.redirect(
      deepLink
    );
  } catch (error) {
    console.error(
      "================================="
    );
    console.error(
      "TikTok callback failed:"
    );
    console.error(
      "================================="
    );
    console.error(error);

    const errorMessage =
      error?.message ||
      "TikTok connection failed.";

    /**
     * Redirect back to the Ask Rae social page with the error.
     */
    const deepLink =
      `askrae://socials` +
      `?status=error` +
      `&platform=tiktok` +
      `&message=${encodeURIComponent(
        errorMessage
      )}`;

    console.log(
      "================================="
    );
    console.log(
      "TIKTOK ERROR DEEP LINK"
    );
    console.log(
      "================================="
    );
    console.log(
      deepLink
    );
    console.log(
      "================================="
    );

    return res.redirect(
      deepLink
    );
  }
}

/**
 * --------------------------------------------------------------------------
 * Get TikTok Publish Status
 * --------------------------------------------------------------------------
 *
 * TikTok Direct Post returns a publish_id immediately after the publishing
 * request is initialized.
 *
 * The actual publishing process happens asynchronously.
 *
 * This endpoint asks TikTok for the current status of that publish_id.
 *
 * Expected statuses include:
 *
 *   PROCESSING_DOWNLOAD
 *   PUBLISH_COMPLETE
 *   FAILED
 *
 * TikTok may also return other documented processing states.
 *
 * --------------------------------------------------------------------------
 */

/**
 * --------------------------------------------------------------------------
 * Get TikTok Publish Status
 * --------------------------------------------------------------------------
 *
 * Checks the status of a TikTok Inbox Draft Upload.
 *
 * Expected statuses:
 * PROCESSING_DOWNLOAD
 * PROCESSING_UPLOAD
 * SEND_TO_USER_INBOX
 * FAILED
 * --------------------------------------------------------------------------
 */

function getTikTokStatusMessage(status, failReason) {
  if (status === "SEND_TO_USER_INBOX") {
    return {
      success: true,
      completed: true,
      message:
        "Your content was successfully sent to TikTok. Check your TikTok inbox to continue editing and publishing. Notifications may take a little while to arrive.",
    };
  }

  if (
    status === "PROCESSING_DOWNLOAD" ||
    status === "PROCESSING_UPLOAD" ||
    status === "PROCESSING"
  ) {
    return {
      success: true,
      completed: false,
      message:
        "Your content is being processed by TikTok. We'll update you when the status is available.",
    };
  }

  if (status === "FAILED") {
    const reasonMessages = {
      photo_pull_failed:
        "TikTok couldn't retrieve your photo. Please try uploading it again.",

      picture_size_check_failed:
        "TikTok rejected the photo because it didn't meet its image requirements. Try another image.",

      video_pull_failed:
        "TikTok couldn't retrieve your video. Please try uploading it again.",

      invalid_file:
        "TikTok couldn't process this file. Please try another photo or video.",

      internal:
        "TikTok encountered an internal processing error. Please try again later.",

      spam_risk_too_many_pending_share:
        "TikTok has temporarily limited pending uploads for this account. Please try again later.",
    };

    return {
      success: false,
      completed: true,
      message:
        reasonMessages[failReason] ||
        `TikTok couldn't process your upload. ${failReason ? `Reason: ${failReason}` : "Please try again."}`,
    };
  }

  return {
    success: true,
    completed: false,
    message:
      "TikTok is still processing your upload. Please check again shortly.",
  };
}

export async function getTikTokPublishStatus(req, res) {
  try {
    const { uid } = req.user;

    const publishId =
      req.body?.publishId ??
      req.body?.publish_id;

    if (
      !publishId ||
      typeof publishId !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "publishId is required.",
      });
    }

    const socialRef = db
      .collection("users")
      .doc(uid)
      .collection("socialAccounts")
      .doc("tiktok");

    const socialSnapshot = await socialRef.get();

    if (!socialSnapshot.exists) {
      return res.status(404).json({
        success: false,
        message: "TikTok account not connected.",
      });
    }

    const social = socialSnapshot.data();
    const accessToken = social.accessToken;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message:
          "TikTok access token is missing. Please reconnect TikTok.",
      });
    }

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
      console.error("TikTok status HTTP error:", {
        status: response.status,
        code: data?.error?.code,
        logId: data?.error?.log_id,
      });

      return res.status(response.status).json({
        success: false,
        message:
          data?.error?.message ||
          "Unable to retrieve TikTok upload status. Please try again.",
        code: data?.error?.code ?? null,
        logId: data?.error?.log_id ?? null,
      });
    }

    if (
      data?.error?.code &&
      data.error.code !== "ok"
    ) {
      return res.status(400).json({
        success: false,
        message:
          data.error.message ||
          "TikTok returned an error while checking your upload.",
        code: data.error.code,
        logId: data.error.log_id ?? null,
      });
    }

    const status = data?.data?.status ?? null;
    const failReason = data?.data?.fail_reason ?? null;

    const statusResult = getTikTokStatusMessage(
      status,
      failReason
    );

    console.log("TikTok upload status:", {
      publishId,
      status,
      failReason,
    });

    return res.status(200).json({
      success: statusResult.success,

      data: {
        publishId,
        status,
        failReason,
        completed: statusResult.completed,
        message: statusResult.message,

        publiclyAvailablePostIds:
          data?.data?.publicaly_available_post_id ?? [],

        downloadedBytes:
          data?.data?.downloaded_bytes ?? null,
      },
    });

  } catch (error) {
    console.error("TikTok status check failed:", error);

    return res.status(500).json({
      success: false,
      message:
        "We couldn't check your TikTok upload status. Please try again shortly.",
    });
  }
}
    