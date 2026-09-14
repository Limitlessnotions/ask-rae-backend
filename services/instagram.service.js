import axios from "axios";
import { getInstagramConfig } from "../config/instagram.config.js";

const INSTAGRAM_GRAPH_URL = "https://graph.instagram.com";

const INSTAGRAM_OAUTH_URL = "https://www.instagram.com/oauth/authorize";

const INSTAGRAM_TOKEN_URL = "https://api.instagram.com/oauth/access_token";

/**
 * Build Instagram Login authorization URL.
 *
 * This uses Instagram Login directly.
 *
 * It does NOT use:
 * https://www.facebook.com/dialog/oauth
 *
 * It also does NOT use Facebook Page discovery.
 */
export function getInstagramLoginUrl(state) {
  const INSTAGRAM_CONFIG = getInstagramConfig();

  const scopes = [
    "instagram_business_basic",
    "instagram_business_content_publish",
  ];

  const params = new URLSearchParams({
    client_id: INSTAGRAM_CONFIG.appId,
    redirect_uri: INSTAGRAM_CONFIG.redirectUri,
    response_type: "code",
    scope: scopes.join(","),
    state,
  });

  const url =
    `${INSTAGRAM_OAUTH_URL}?${params.toString()}`;

  console.log("=================================");
  console.log("Instagram Login Configuration");
  console.log("=================================");

  console.log(
    "INSTAGRAM APP ID:",
    INSTAGRAM_CONFIG.appId
  );

  console.log(
    "REDIRECT URI:",
    INSTAGRAM_CONFIG.redirectUri
  );

  console.log(
    "STATE:",
    state
  );

  console.log(
    "SCOPES:",
    scopes.join(",")
  );

  console.log("OAUTH URL:");
  console.log(url);

  console.log("=================================");

  return url;
}

/**
 * Exchange Instagram authorization code
 * for an Instagram access token.
 *
 * Instagram Login uses:
 *
 * POST https://api.instagram.com/oauth/access_token
 */
export async function exchangeCodeForToken(code) {
  const INSTAGRAM_CONFIG = getInstagramConfig();

  const formData = new URLSearchParams();

  formData.append(
    "client_id",
    INSTAGRAM_CONFIG.appId
  );

  formData.append(
    "client_secret",
    INSTAGRAM_CONFIG.appSecret
  );

  formData.append(
    "grant_type",
    "authorization_code"
  );

  formData.append(
    "redirect_uri",
    INSTAGRAM_CONFIG.redirectUri
  );

  formData.append(
    "code",
    code
  );

  const response = await axios.post(
    INSTAGRAM_TOKEN_URL,
    formData.toString(),
    {
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data;
}

/**
 * Exchange the short-lived Instagram token
 * for a long-lived Instagram token.
 */
export async function exchangeForLongLivedToken(
  accessToken
) {
  const INSTAGRAM_CONFIG = getInstagramConfig();

  const response = await axios.get(
    `${INSTAGRAM_GRAPH_URL}/access_token`,
    {
      params: {
        grant_type: "ig_exchange_token",

        client_secret:
          INSTAGRAM_CONFIG.appSecret,

        access_token:
          accessToken,
      },
    }
  );

  return response.data;
}

/**
 * Generic Instagram Graph API GET helper.
 */
export async function graphGet(
  endpoint,
  accessToken,
  params = {}
) {
  const response = await axios.get(
    `${INSTAGRAM_GRAPH_URL}${endpoint}`,
    {
      params: {
        ...params,

        access_token:
          accessToken,
      },
    }
  );

  return response.data;
}

/**
 * Get the authenticated Instagram account.
 */
export async function getInstagramProfile(
  accessToken
) {
  return await graphGet(
    "/me",
    accessToken,
    {
      fields: [
        "id",
        "username",
        "name",
        "profile_picture_url",
        "followers_count",
        "media_count",
      ].join(","),
    }
  );
}