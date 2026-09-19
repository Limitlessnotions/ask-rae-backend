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
export async function getTikTokPublishStatus(
  req,
  res
) {
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
        message:
          "publishId is required.",
      });
    }

    console.log(
      "================================="
    );
    console.log(
      "TIKTOK PUBLISH STATUS"
    );
    console.log(
      "================================="
    );
    console.log(
      "Publish ID:",
      publishId
    );

    /**
     * ----------------------------------------------------------------------
     * Get connected TikTok account
     * ----------------------------------------------------------------------
     */

    const socialRef = db
      .collection("users")
      .doc(uid)
      .collection("socialAccounts")
      .doc("tiktok");

    const socialSnapshot =
      await socialRef.get();

    if (!socialSnapshot.exists) {
      return res.status(404).json({
        success: false,
        message:
          "TikTok account not connected.",
      });
    }

    const social =
      socialSnapshot.data();

    const accessToken =
      social.accessToken;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message:
          "TikTok access token is missing. Please reconnect TikTok.",
      });
    }

    /**
     * ----------------------------------------------------------------------
     * Ask TikTok for publish status
     * ----------------------------------------------------------------------
     */

    const response =
      await fetch(
        `${TIKTOK_API_BASE}/post/publish/status/fetch/`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            "Content-Type":
              "application/json; charset=UTF-8",
          },

          body: JSON.stringify({
            publish_id:
              publishId,
          }),
        }
      );

    let data;

    try {
      data =
        await response.json();
    } catch {
      data = null;
    }

    /**
     * ----------------------------------------------------------------------
     * TikTok API error
     * ----------------------------------------------------------------------
     */

    if (!response.ok) {
      console.error(
        "TikTok publish status request failed:",
        {
          status:
            response.status,

          code:
            data?.error?.code,

          message:
            data?.error?.message,

          logId:
            data?.error?.log_id,
        }
      );

      return res.status(
        response.status
      ).json({
        success: false,

        message:
          data?.error?.message ||
          "Unable to retrieve TikTok publish status.",

        code:
          data?.error?.code ??
          null,

        logId:
          data?.error?.log_id ??
          null,
      });
    }

    /**
     * ----------------------------------------------------------------------
     * TikTok may return HTTP 200 with a non-ok error object
     * ----------------------------------------------------------------------
     */

    if (
      data?.error?.code &&
      data.error.code !== "ok"
    ) {
      console.error(
        "TikTok publish status API error:",
        {
          code:
            data.error.code,

          message:
            data.error.message,

          logId:
            data.error.log_id,
        }
      );

      return res.status(400).json({
        success: false,

        message:
          data.error.message ||
          "TikTok returned an error while checking publish status.",

        code:
          data.error.code,

        logId:
          data.error.log_id ??
          null,
      });
    }

    /**
     * ----------------------------------------------------------------------
     * Extract status
     * ----------------------------------------------------------------------
     */

    const status =
      data?.data?.status ??
      null;

    const failReason =
      data?.data?.fail_reason ??
      null;

    const publiclyAvailablePostIds =
      Array.isArray(
        data?.data
          ?.publicaly_available_post_id
      )
        ? data.data
            .publicaly_available_post_id
        : [];

    const downloadedBytes =
      data?.data?.downloaded_bytes ??
      null;

    /**
     * ----------------------------------------------------------------------
     * Log status
     * ----------------------------------------------------------------------
     */

    console.log(
      "TikTok publish status:",
      status
    );

    if (failReason) {
      console.log(
        "TikTok failure reason:",
        failReason
      );
    }

    if (
      publiclyAvailablePostIds.length >
      0
    ) {
      console.log(
        "TikTok public post IDs:",
        publiclyAvailablePostIds
      );
    }

    console.log(
      "================================="
    );

    /**
     * ----------------------------------------------------------------------
     * Return safe response
     * ----------------------------------------------------------------------
     *
     * IMPORTANT:
     * The TikTok access token is intentionally never returned.
     */

    return res.status(200).json({
      success: true,

      data: {
        publishId,

        status,

        failReason,

        publiclyAvailablePostIds,

        downloadedBytes,

        raw: data,
      },
    });
  } catch (error) {
    console.error(
      "TikTok publish status check failed:"
    );
    console.error(error);

    return res.status(500).json({
      success: false,

      message:
        error?.message ||
        "Unable to check TikTok publish status.",
    });
  }
}