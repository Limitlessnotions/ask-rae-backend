import axios from "axios";
import { getInstagramConfig } from "../config/instagram.config.js";

const GRAPH_URL = "https://graph.facebook.com/v23.0";

/**
 * Build Instagram OAuth Login URL
 *
 * Instagram Business authentication uses Facebook Login
 * but redirects back to the Instagram callback.
 */
export function getInstagramLoginUrl(state) {
  const INSTAGRAM_CONFIG = getInstagramConfig();

  const params = new URLSearchParams({
    client_id: INSTAGRAM_CONFIG.appId,
    redirect_uri: INSTAGRAM_CONFIG.redirectUri,
    scope: [
      "public_profile",
      "email",
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
    ].join(","),
    response_type: "code",
    state,
  });

  const url = `https://www.facebook.com/v23.0/dialog/oauth?${params.toString()}`;

  console.log("=================================");
  console.log("Instagram OAuth Configuration");
  console.log("=================================");
  console.log("APP ID:", INSTAGRAM_CONFIG.appId);
  console.log("REDIRECT URI:", INSTAGRAM_CONFIG.redirectUri);
  console.log("STATE:", state);
  console.log("=================================");
  console.log(url);
  console.log("=================================");

  return url;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken(code) {
  const INSTAGRAM_CONFIG = getInstagramConfig();

  const response = await axios.get(
    `${GRAPH_URL}/oauth/access_token`,
    {
      params: {
        client_id: INSTAGRAM_CONFIG.appId,
        client_secret: INSTAGRAM_CONFIG.appSecret,
        redirect_uri: INSTAGRAM_CONFIG.redirectUri,
        code,
      },
    }
  );

  return response.data;
}

/**
 * Generic Graph API GET helper
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
 * Get all Facebook Pages managed by the user.
 */
export async function getUserPages(accessToken) {
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
 * Get the Instagram Business account attached to a Facebook Page.
 */
export async function getInstagramBusinessAccount(
  pageId,
  accessToken
) {
  return await graphGet(
    `/${pageId}`,
    accessToken,
    {
      fields: "id,name,instagram_business_account",
    }
  );
}

/**
 * Get Instagram Business Profile
 */
export async function getInstagramProfile(
  instagramBusinessId,
  accessToken
) {
  return await graphGet(
    `/${instagramBusinessId}`,
    accessToken,
    {
      fields: [
        "id",
        "username",
        "profile_picture_url",
        "followers_count",
        "media_count",
      ].join(","),
    }
  );
}