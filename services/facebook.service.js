
import axios from "axios";
import crypto from "crypto";
import { getFacebookConfig } from "../config/facebook.config.js";

const GRAPH_URL = "https://graph.facebook.com/v23.0";

/**
 * Centralized Facebook Graph API error logger.
 * Never logs access tokens or application secrets.
 */
function logFacebookGraphError(error, context = {}) {
  const responseData = error?.response?.data;
  const graphError = responseData?.error;

  console.error("\n=================================");
  console.error("FACEBOOK GRAPH API ERROR");
  console.error("=================================");

  console.error("Operation:", context.operation ?? "Unknown");
  console.error("Endpoint:", context.endpoint ?? "Unknown");
  console.error("Page ID:", context.pageId ?? "Unknown");
  console.error("Content type:", context.contentType ?? "Unknown");

  console.error("HTTP Status:", error?.response?.status ?? "No response");
  console.error("Axios Code:", error?.code ?? "Unknown");
  console.error("Error Message:", error?.message ?? "Unknown");

  if (graphError) {
    console.error("Meta Error Details:", {
      message: graphError.message,
      type: graphError.type,
      code: graphError.code,
      error_subcode: graphError.error_subcode,
      error_user_title: graphError.error_user_title,
      error_user_msg: graphError.error_user_msg,
      fbtrace_id: graphError.fbtrace_id,
      is_transient: graphError.is_transient,
    });
  } else if (responseData) {
    console.error("Response Data:", responseData);
  } else {
    console.error("Response Data: No response received from Meta.");
  }

  console.error("=================================\n");
}

/**
 * Execute a Facebook Graph API request with detailed error logging.
 */
async function facebookRequest(
  operation,
  endpoint,
  request,
  context = {}
) {
  try {
    return await request();
  } catch (error) {
    logFacebookGraphError(error, {
      operation,
      endpoint,
      ...context,
    });

    throw error;
  }
}

/**
 * Generate a secure OAuth state token.
 */
export function generateStateToken() {
  return crypto.randomUUID();
}

/**
 * Build Facebook Login for Business OAuth URL.
 */
export function getFacebookLoginUrl(state) {
  const FACEBOOK_CONFIG = getFacebookConfig();

  console.log("=================================");
  console.log("Facebook OAuth Configuration");
  console.log("=================================");

  console.log("FACEBOOK_APP_ID:", FACEBOOK_CONFIG.appId);
  console.log(
    "FACEBOOK_APP_SECRET:",
    FACEBOOK_CONFIG.appSecret ? "Loaded" : "Missing"
  );
  console.log("FACEBOOK_REDIRECT_URI:", FACEBOOK_CONFIG.redirectUri);
  console.log("FACEBOOK_CONFIG_ID:", FACEBOOK_CONFIG.configId);
  console.log("STATE:", state);

  const params = new URLSearchParams({
    client_id: FACEBOOK_CONFIG.appId,
    redirect_uri: FACEBOOK_CONFIG.redirectUri,
    config_id: FACEBOOK_CONFIG.configId,
    response_type: "code",
    state,
  });

  const url =
    `https://www.facebook.com/v23.0/dialog/oauth?${params.toString()}`;

  console.log("Generated Facebook OAuth URL.");

  return url;
}

/**
 * Exchange authorization code for a user access token.
 */
export async function exchangeCodeForToken(code) {
  const FACEBOOK_CONFIG = getFacebookConfig();

  return facebookRequest(
    "Exchange OAuth Code",
    "/oauth/access_token",
    async () => {
      const response = await axios.get(
        `${GRAPH_URL}/oauth/access_token`,
        {
          params: {
            client_id: FACEBOOK_CONFIG.appId,
            client_secret: FACEBOOK_CONFIG.appSecret,
            redirect_uri: FACEBOOK_CONFIG.redirectUri,
            code,
          },
        }
      );

      return response.data;
    }
  );
}

/**
 * Generic GET helper for the Facebook Graph API.
 */
export async function graphGet(endpoint, accessToken, params = {}) {
  return facebookRequest(
    "Graph API GET",
    endpoint,
    async () => {
      const response = await axios.get(
        `${GRAPH_URL}${endpoint}`,
        {
          params: {
            access_token: accessToken,
            ...params,
          },
        }
      );

      return response.data;
    }
  );
}

/**
 * Get authenticated Facebook user's profile.
 */
export async function getFacebookProfile(accessToken) {
  return await graphGet("/me", accessToken, {
    fields: [
      "id",
      "name",
      "email",
      "picture.width(400).height(400)",
    ].join(","),
  });
}

/**
 * Get all Facebook Pages managed by authenticated user.
 */
export async function getUserPages(accessToken) {
  const data = await graphGet("/me/accounts", accessToken, {
    fields: "id,name,access_token,category,tasks,picture{url}",
  });

  return data.data ?? [];
}

/**
 * Validate a media URL.
 */
function validateMediaUrl(url, mediaType) {
  if (!url) {
    throw new Error(
      `Facebook ${mediaType} publishing requires a media URL.`
    );
  }

  if (
    typeof url !== "string" ||
    !/^https?:\/\/.+/i.test(url)
  ) {
    throw new Error(
      `Facebook ${mediaType} URL must be a valid HTTP/HTTPS URL.`
    );
  }

  return url;
}

/**
 * Extract a media URL from supported payload structures.
 */
function extractMediaUrl(content) {
  if (!content) return null;

  const nestedMedia =
    content.media && typeof content.media === "object"
      ? content.media
      : null;

  const nestedImage =
    content.image && typeof content.image === "object"
      ? content.image
      : null;

  const nestedVideo =
    content.video && typeof content.video === "object"
      ? content.video
      : null;

  return (
    content.imageUrl ??
    content.image_url ??
    content.videoUrl ??
    content.video_url ??
    content.mediaUrl ??
    content.media_url ??
    content.url ??
    nestedMedia?.url ??
    nestedMedia?.uri ??
    nestedMedia?.mediaUrl ??
    nestedMedia?.media_url ??
    nestedImage?.url ??
    nestedImage?.uri ??
    nestedVideo?.url ??
    nestedVideo?.uri ??
    null
  );
}

/**
 * Determine whether media is an image or video.
 */
function detectMediaKind(content) {
  const explicitType = String(
    content?.mediaType ??
    content?.media_type ??
    content?.media?.type ??
    content?.media?.mediaType ??
    content?.media?.media_type ??
    content?.type ??
    ""
  ).toLowerCase();

  if (
    ["video", "reel", "reels", "mp4", "mov"].includes(explicitType)
  ) {
    return "video";
  }

  if (
    ["photo", "image", "jpg", "jpeg", "png", "webp"].includes(explicitType)
  ) {
    return "image";
  }

  const url = extractMediaUrl(content);

  if (url) {
    const cleanUrl = url.split("?")[0].split("#")[0].toLowerCase();

    if (/\.(mp4|mov|m4v|avi|webm)$/.test(cleanUrl)) {
      return "video";
    }

    if (/\.(jpg|jpeg|png|webp|gif)$/.test(cleanUrl)) {
      return "image";
    }
  }

  return "image";
}

/**
 * Publish a text post to a Facebook Page.
 */
export async function publishPagePost(
  pageAccessToken,
  pageId,
  message
) {
  if (!message || !message.trim()) {
    throw new Error("Facebook text content is empty.");
  }

  console.log("Publishing Facebook text post...");

  return facebookRequest(
    "Publish Text Post",
    `/${pageId}/feed`,
    async () => {
      const response = await axios.post(
        `${GRAPH_URL}/${pageId}/feed`,
        null,
        {
          params: {
            message: message.trim(),
            access_token: pageAccessToken,
          },
        }
      );

      console.log("Facebook text post published:", response.data);

      return response.data;
    },
    {
      pageId,
      contentType: "text",
    }
  );
}

/**
 * Publish a photo to a Facebook Page.
 */
export async function publishPhoto(
  pageAccessToken,
  pageId,
  imageUrl,
  caption = ""
) {
  const validatedImageUrl = validateMediaUrl(imageUrl, "photo");

  console.log("Publishing Facebook photo...");
  console.log("Facebook image URL:", validatedImageUrl);

  return facebookRequest(
    "Publish Photo",
    `/${pageId}/photos`,
    async () => {
      const response = await axios.post(
        `${GRAPH_URL}/${pageId}/photos`,
        null,
        {
          params: {
            url: validatedImageUrl,
            caption: caption ?? "",
            access_token: pageAccessToken,
          },
        }
      );

      console.log("Facebook photo published:", response.data);

      return response.data;
    },
    {
      pageId,
      contentType: "image",
    }
  );
}

/**
 * Publish a video to a Facebook Page.
 */
export async function publishVideo(
  pageAccessToken,
  pageId,
  videoUrl,
  description = ""
) {
  const validatedVideoUrl = validateMediaUrl(videoUrl, "video");

  console.log("Publishing Facebook video...");
  console.log("Facebook video URL:", validatedVideoUrl);

  return facebookRequest(
    "Publish Video",
    `/${pageId}/videos`,
    async () => {
      const response = await axios.post(
        `${GRAPH_URL}/${pageId}/videos`,
        null,
        {
          params: {
            file_url: validatedVideoUrl,
            description: description ?? "",
            access_token: pageAccessToken,
          },
        }
      );

      console.log("Facebook video published:", response.data);

      return response.data;
    },
    {
      pageId,
      contentType: "video",
    }
  );
}

/**
 * Universal Facebook Publisher.
 *
 * Supported types:
 * text, photo, image, video, reel, media.
 */
export async function publishFacebookContent({
  accessToken,
  pageId,
  content,
}) {
  if (!accessToken) {
    throw new Error("Facebook access token is missing.");
  }

  if (!pageId) {
    throw new Error("Facebook Page ID is missing.");
  }

  if (!content) {
    throw new Error("Facebook content payload is missing.");
  }

  const contentType = String(
    content.type ??
    content.mediaType ??
    content.media_type ??
    "text"
  ).toLowerCase();

  console.log("=================================");
  console.log("FACEBOOK CONTENT PUBLISHER");
  console.log("=================================");
  console.log("Page ID:", pageId);
  console.log("Content type:", contentType);

  if (
    ["media", "photo", "image", "video", "reel"].includes(contentType)
  ) {
    console.log("Detected media URL:", extractMediaUrl(content));
    console.log("Detected media kind:", detectMediaKind(content));
  }

  console.log("=================================");

  if (contentType === "text") {
    const mediaUrl = extractMediaUrl(content);

    if (mediaUrl) {
      const mediaKind = detectMediaKind(content);

      const caption =
        content.caption ??
        content.text ??
        content.message ??
        content.body ??
        "";

      console.log("Text payload contains media:", mediaKind);

      if (mediaKind === "video") {
        return await publishVideo(
          accessToken,
          pageId,
          mediaUrl,
          caption
        );
      }

      return await publishPhoto(
        accessToken,
        pageId,
        mediaUrl,
        caption
      );
    }

    const message =
      content.text ??
      content.message ??
      content.caption ??
      content.body ??
      "";

    return await publishPagePost(accessToken, pageId, message);
  }

  if (contentType === "media") {
    const mediaUrl = extractMediaUrl(content);

    if (!mediaUrl) {
      throw new Error(
        "Facebook media publishing requires a publicly accessible media URL."
      );
    }

    const mediaKind = detectMediaKind(content);

    const caption =
      content.caption ??
      content.text ??
      content.message ??
      content.description ??
      content.body ??
      "";

    console.log("Facebook media URL:", mediaUrl);
    console.log("Facebook detected media kind:", mediaKind);

    if (mediaKind === "video") {
      return await publishVideo(
        accessToken,
        pageId,
        mediaUrl,
        caption
      );
    }

    return await publishPhoto(
      accessToken,
      pageId,
      mediaUrl,
      caption
    );
  }

  if (contentType === "photo" || contentType === "image") {
    const imageUrl = extractMediaUrl(content);

    const caption =
      content.caption ??
      content.text ??
      content.message ??
      content.body ??
      "";

    return await publishPhoto(
      accessToken,
      pageId,
      imageUrl,
      caption
    );
  }

  if (
    contentType === "video" ||
    contentType === "reel" ||
    contentType === "reels"
  ) {
    const videoUrl = extractMediaUrl(content);

    const description =
      content.description ??
      content.caption ??
      content.text ??
      content.message ??
      content.body ??
      "";

    return await publishVideo(
      accessToken,
      pageId,
      videoUrl,
      description
    );
  }

  throw new Error(
    `Unsupported Facebook content type: ${content.type}`
  );
}
