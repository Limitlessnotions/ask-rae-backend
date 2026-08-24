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

  const url =
    `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;

  console.log("=================================");
  console.log("TikTok OAuth Configuration");
  console.log("=================================");
  console.log("CLIENT KEY:", config.clientKey);
  console.log("REDIRECT URI:", config.redirectUri);
  console.log("SCOPES:", config.scopes);
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

  console.log("=================================");
  console.log("TIKTOK TOKEN EXCHANGE");
  console.log("=================================");
  console.log("Authorization code received:", !!code);
  console.log("Code verifier received:", !!codeVerifier);
  console.log("Redirect URI:", config.redirectUri);
  console.log("=================================");

  try {
    const response = await axios.post(
      `${BASE_URL}/oauth/token/`,
      body.toString(),
      {
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("=================================");
    console.log("TIKTOK TOKEN RESPONSE");
    console.log("=================================");

    console.log(
      JSON.stringify(
        {
          ...response.data,
          access_token: response.data?.access_token
            ? "[REDACTED]"
            : undefined,
          refresh_token: response.data?.refresh_token
            ? "[REDACTED]"
            : undefined,
        },
        null,
        2
      )
    );

    console.log("=================================");

    return response.data;

  } catch (error) {
    console.error("=================================");
    console.error("TIKTOK TOKEN EXCHANGE FAILED");
    console.error("=================================");

    console.error(
      "HTTP Status:",
      error.response?.status
    );

    console.error(
      "TikTok Error:",
      JSON.stringify(
        error.response?.data,
        null,
        2
      )
    );

    console.error("=================================");

    throw error;
  }
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
  try {
    console.log("=================================");
    console.log("TIKTOK USER INFO REQUEST");
    console.log("=================================");

    console.log(
      "Access token received:",
      !!accessToken
    );

    console.log(
      "Access token length:",
      accessToken?.length
    );

    /*
     * Start with fields covered by user.info.basic.
     *
     * username and profile_deep_link require
     * user.info.profile under TikTok's current
     * scope model.
     */
    const fields = [
      "open_id",
      "display_name",
      "avatar_url",
    ].join(",");

    console.log(
      "Requested fields:",
      fields
    );

    const response = await axios.get(
      `${BASE_URL}/user/info/`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },

        params: {
          fields,
        },
      }
    );

    console.log("TikTok User Info Response:");

    console.log(
      JSON.stringify(
        response.data,
        null,
        2
      )
    );

    console.log("=================================");

    if (
      response.data?.error &&
      response.data.error.code !== "ok"
    ) {
      throw new Error(
        response.data.error.message ||
          "TikTok User Info request failed."
      );
    }

    if (!response.data?.data?.user) {
      throw new Error(
        "TikTok User Info response did not contain a user."
      );
    }

    return response.data.data.user;

  } catch (error) {
    console.error("=================================");
    console.error("TIKTOK USER INFO FAILED");
    console.error("=================================");

    console.error(
      "HTTP Status:",
      error.response?.status
    );

    console.error(
      "TikTok Error:",
      JSON.stringify(
        error.response?.data,
        null,
        2
      )
    );

    console.error(
      "TikTok Error Code:",
      error.response?.data?.error?.code
    );

    console.error(
      "TikTok Error Message:",
      error.response?.data?.error?.message
    );

    console.error(
      "TikTok Log ID:",
      error.response?.data?.error?.log_id
    );

    console.error("=================================");

    throw error;
  }
}