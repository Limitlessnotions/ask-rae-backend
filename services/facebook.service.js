import axios from "axios";
import crypto from "crypto";
import { getFacebookConfig } from "../config/facebook.config.js";

const GRAPH_URL = "https://graph.facebook.com/v23.0";

/**
 * Generate a secure OAuth state token
 */
export function generateStateToken() {
  return crypto.randomUUID();
}

/**
 * Build Facebook Login for Business OAuth URL
 */
export function getFacebookLoginUrl(state) {
  const FACEBOOK_CONFIG = getFacebookConfig();

  console.log("=================================");
  console.log("Facebook OAuth Configuration");
  console.log("=================================");

  console.log(
    "FACEBOOK_APP_ID:",
    FACEBOOK_CONFIG.appId
  );

  console.log(
    "FACEBOOK_APP_SECRET:",
    FACEBOOK_CONFIG.appSecret
      ? "Loaded ✅"
      : "Missing ❌"
  );

  console.log(
    "FACEBOOK_REDIRECT_URI:",
    FACEBOOK_CONFIG.redirectUri
  );

  console.log(
    "FACEBOOK_CONFIG_ID:",
    FACEBOOK_CONFIG.configId
  );

  console.log("STATE:", state);

  /*
  |--------------------------------------------------------------------------
  | Facebook Login for Business
  |--------------------------------------------------------------------------
  |
  | Permissions are configured inside the Meta Business Login
  | configuration.
  |
  */

  const params = new URLSearchParams({
    client_id: FACEBOOK_CONFIG.appId,
    redirect_uri: FACEBOOK_CONFIG.redirectUri,
    config_id: FACEBOOK_CONFIG.configId,
    response_type: "code",
    state,
  });

  const url =
    `https://www.facebook.com/v23.0/dialog/oauth?${params.toString()}`;

  console.log("=================================");
  console.log("Generated Facebook OAuth URL");
  console.log("=================================");
  console.log(url);
  console.log("=================================");

  return url;
}

/**
 * Exchange authorization code for a user access token
 */
export async function exchangeCodeForToken(code) {
  const FACEBOOK_CONFIG = getFacebookConfig();

  const response = await axios.get(
    `${GRAPH_URL}/oauth/access_token`,
    {
      params: {
        client_id:
          FACEBOOK_CONFIG.appId,

        client_secret:
          FACEBOOK_CONFIG.appSecret,

        redirect_uri:
          FACEBOOK_CONFIG.redirectUri,

        code,
      },
    }
  );

  return response.data;
}

/**
 * Generic GET helper for the Facebook Graph API
 */
export async function graphGet(
  endpoint,
  accessToken,
  params = {}
) {
  const response = await axios.get(
    `${GRAPH_URL}${endpoint}`,
    {
      params: {
        access_token:
          accessToken,

        ...params,
      },
    }
  );

  return response.data;
}

/**
 * Get the authenticated Facebook user's profile
 */
export async function getFacebookProfile(
  accessToken
) {
  return await graphGet(
    "/me",
    accessToken,
    {
      fields: [
        "id",
        "name",
        "email",
        "picture.width(400).height(400)",
      ].join(","),
    }
  );
}

/**
 * Get all Facebook Pages managed by the
 * authenticated user.
 */
export async function getUserPages(
  accessToken
) {
  const data =
    await graphGet(
      "/me/accounts",
      accessToken,
      {
        fields:
          "id,name,access_token,category,tasks,picture{url}",
      }
    );

  return data.data ?? [];
}

/**
 * Validate a media URL.
 */
function validateMediaUrl(
  url,
  mediaType
) {
  if (!url) {
    throw new Error(
      `Facebook ${mediaType} publishing requires a media URL.`
    );
  }

  if (
    typeof url !== "string" ||
    !/^https?:\/\//i.test(url)
  ) {
    throw new Error(
      `Facebook ${mediaType} URL must be a valid HTTP/HTTPS URL.`
    );
  }

  return url;
}

/**
 * Publish a text post to a Facebook Page
 */
export async function publishPagePost(
  pageAccessToken,
  pageId,
  message
) {
  if (!message || !message.trim()) {
    throw new Error(
      "Facebook text content is empty."
    );
  }

  console.log(
    "Publishing Facebook text post..."
  );

  const response =
    await axios.post(
      `${GRAPH_URL}/${pageId}/feed`,
      null,
      {
        params: {
          message:
            message.trim(),

          access_token:
            pageAccessToken,
        },
      }
    );

  console.log(
    "✅ Facebook text post published:",
    response.data
  );

  return response.data;
}

/**
 * Publish a photo to a Facebook Page
 */
export async function publishPhoto(
  pageAccessToken,
  pageId,
  imageUrl,
  caption = ""
) {
  const validatedImageUrl =
    validateMediaUrl(
      imageUrl,
      "photo"
    );

  console.log(
    "Publishing Facebook photo..."
  );

  const response =
    await axios.post(
      `${GRAPH_URL}/${pageId}/photos`,
      null,
      {
        params: {
          url:
            validatedImageUrl,

          caption:
            caption ?? "",

          access_token:
            pageAccessToken,
        },
      }
    );

  console.log(
    "✅ Facebook photo published:",
    response.data
  );

  return response.data;
}

/**
 * Publish a video to a Facebook Page
 */
export async function publishVideo(
  pageAccessToken,
  pageId,
  videoUrl,
  description = ""
) {
  const validatedVideoUrl =
    validateMediaUrl(
      videoUrl,
      "video"
    );

  console.log(
    "Publishing Facebook video..."
  );

  const response =
    await axios.post(
      `${GRAPH_URL}/${pageId}/videos`,
      null,
      {
        params: {
          file_url:
            validatedVideoUrl,

          description:
            description ?? "",

          access_token:
            pageAccessToken,
        },
      }
    );

  console.log(
    "✅ Facebook video published:",
    response.data
  );

  return response.data;
}

/**
 * Universal Facebook Publisher
 *
 * Supported content types:
 *
 *   text
 *   photo
 *   video
 */
export async function publishFacebookContent({
  accessToken,
  pageId,
  content,
}) {
  /*
  |--------------------------------------------------------------------------
  | Validate common inputs
  |--------------------------------------------------------------------------
  */

  if (!accessToken) {
    throw new Error(
      "Facebook access token is missing."
    );
  }

  if (!pageId) {
    throw new Error(
      "Facebook Page ID is missing."
    );
  }

  if (!content) {
    throw new Error(
      "Facebook content payload is missing."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Normalize content type
  |--------------------------------------------------------------------------
  */

  const contentType =
    String(
      content.type ??
        content.mediaType ??
        content.media_type ??
        "text"
    ).toLowerCase();

  console.log("=================================");
  console.log("FACEBOOK CONTENT PUBLISHER");
  console.log("=================================");
  console.log(
    "Page ID:",
    pageId
  );
  console.log(
    "Content type:",
    contentType
  );
  console.log("=================================");

  /*
  |--------------------------------------------------------------------------
  | TEXT
  |--------------------------------------------------------------------------
  */

  if (
    contentType === "text"
  ) {
    const message =
      content.text ??
      content.message ??
      content.caption ??
      "";

    return await publishPagePost(
      accessToken,
      pageId,
      message
    );
  }

  /*
  |--------------------------------------------------------------------------
  | PHOTO / IMAGE
  |--------------------------------------------------------------------------
  */

  if (
    contentType === "photo" ||
    contentType === "image"
  ) {
    const imageUrl =
      content.imageUrl ??
      content.image_url ??
      content.mediaUrl ??
      content.media_url ??
      content.url ??
      null;

    const caption =
      content.caption ??
      content.text ??
      content.message ??
      "";

    return await publishPhoto(
      accessToken,
      pageId,
      imageUrl,
      caption
    );
  }

  /*
  |--------------------------------------------------------------------------
  | VIDEO
  |--------------------------------------------------------------------------
  */

  if (
    contentType === "video" ||
    contentType === "reel"
  ) {
    const videoUrl =
      content.videoUrl ??
      content.video_url ??
      content.mediaUrl ??
      content.media_url ??
      content.url ??
      null;

    const description =
      content.description ??
      content.caption ??
      content.text ??
      content.message ??
      "";

    return await publishVideo(
      accessToken,
      pageId,
      videoUrl,
      description
    );
  }

  /*
  |--------------------------------------------------------------------------
  | UNSUPPORTED
  |--------------------------------------------------------------------------
  */

  throw new Error(
    `Unsupported Facebook content type: ${content.type}`
  );
}