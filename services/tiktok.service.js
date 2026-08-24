import axios from "axios";
import { getTikTokConfig } from "../config/tiktok.config.js";

/*
|--------------------------------------------------------------------------
| TikTok API
|--------------------------------------------------------------------------
*/

const BASE_URL = "https://open.tiktokapis.com/v2";

/**
 * Build TikTok OAuth URL
 */
export function getTikTokAuthorizationUrl({
  state,
  codeChallenge,
  codeChallengeMethod,
}) {
  const config = getTikTokConfig();

  const params = new URLSearchParams({
    client_key: config.clientKey,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: config.scopes.join(","),
    state,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
  });

  const url = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

  console.log("=================================");
  console.log("TikTok OAuth Configuration");
  console.log("=================================");
  console.log("CLIENT KEY:", config.clientKey);
  console.log("REDIRECT URI:", config.redirectUri);
  console.log("STATE:", state);
  console.log("=================================");
  console.log(url);
  console.log("=================================");

  return url;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeCodeForToken({
  code,
  codeVerifier,
}) {
  const config = getTikTokConfig();

  const body = new URLSearchParams({
    client_key: config.clientKey,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await axios.post(
    `${BASE_URL}/oauth/token/`,
    body.toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data;
}

/**
 * Generic TikTok GET helper
 */
export async function tiktokGet(
  endpoint,
  accessToken
) {
  const response = await axios.get(
    `${BASE_URL}${endpoint}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
}

/**
 * Get TikTok Profile
 *
 * TikTok API v2:
 * GET /v2/user/info/
 *
 * The fields are passed as a comma-separated query parameter.
 */
export async function getTikTokProfile(accessToken) {
  const response = await axios.get(
    `${BASE_URL}/user/info/`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        fields: [
          "open_id",
          "display_name",
          "avatar_url",
          "profile_deep_link",
          "username",
        ].join(","),
      },
    }
  );

  return response.data.data.user;
}