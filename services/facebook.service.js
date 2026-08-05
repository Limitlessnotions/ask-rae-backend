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
 * Build Facebook OAuth login URL
 */
export function getFacebookLoginUrl(state) {
  const FACEBOOK_CONFIG = getFacebookConfig();

  console.log("=================================");
  console.log("Facebook OAuth Configuration");
  console.log("=================================");
  console.log("FACEBOOK_APP_ID:", FACEBOOK_CONFIG.appId);
  console.log(
    "FACEBOOK_APP_SECRET:",
    FACEBOOK_CONFIG.appSecret ? "Loaded ✅" : "Missing ❌"
  );
  console.log(
    "FACEBOOK_REDIRECT_URI:",
    FACEBOOK_CONFIG.redirectUri
  );
  console.log("FACEBOOK_SCOPES:", FACEBOOK_CONFIG.scopes);
  console.log("STATE:", state);

  const params = new URLSearchParams({
    client_id: FACEBOOK_CONFIG.appId,
    redirect_uri: FACEBOOK_CONFIG.redirectUri,
    scope: FACEBOOK_CONFIG.scopes,
    response_type: "code",
    state,
  });

  const url = `https://www.facebook.com/v23.0/dialog/oauth?${params.toString()}`;

  console.log("=================================");
  console.log("Generated Facebook OAuth URL");
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
        client_id: FACEBOOK_CONFIG.appId,
        client_secret: FACEBOOK_CONFIG.appSecret,
        redirect_uri: FACEBOOK_CONFIG.redirectUri,
        code,
      },
    }
  );

  return response.data;
}

/**
 * Generic GET helper for the Graph API
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
        access_token: accessToken,
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
 * Get all Facebook Pages managed by the authenticated user
 */
export async function getUserPages(
  accessToken
) {
  const data = await graphGet(
    "/me/accounts",
    accessToken,
    {
      fields:
        "id,name,access_token,category,tasks,picture{url}",
    }
  );

  return data.data;
}

/**
 * Publish a text post to a Facebook Page
 */
export async function publishPagePost(
  pageAccessToken,
  pageId,
  message
) {
  const response = await axios.post(
    `${GRAPH_URL}/${pageId}/feed`,
    null,
    {
      params: {
        message,
        access_token: pageAccessToken,
      },
    }
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
  const response = await axios.post(
    `${GRAPH_URL}/${pageId}/photos`,
    null,
    {
      params: {
        url: imageUrl,
        caption,
        access_token: pageAccessToken,
      },
    }
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
  const response = await axios.post(
    `${GRAPH_URL}/${pageId}/videos`,
    null,
    {
      params: {
        file_url: videoUrl,
        description,
        access_token: pageAccessToken,
      },
    }
  );

  return response.data;
}
/**
 * Universal Facebook Publisher
 */
export async function publishFacebookContent({
  accessToken,
  pageId,
  content,
}) {
  switch (content.type) {
    case "text": {
      const message =
        content.text ??
        content.message ??
        "";

      if (!message.trim()) {
        throw new Error(
          "Facebook text content is empty."
        );
      }

      return await publishPagePost(
        accessToken,
        pageId,
        message
      );
    }

    case "photo":
      return await publishPhoto(
        accessToken,
        pageId,
        content.imageUrl,
        content.caption ?? content.text ?? ""
      );

    case "video":
      return await publishVideo(
        accessToken,
        pageId,
        content.videoUrl,
        content.description ?? content.text ?? ""
      );

    default:
      throw new Error(
        `Unsupported Facebook content type: ${content.type}`
      );
  }
}