import axios from "axios";
import { getXConfig } from "../config/x.config.js";

const X_API = "https://api.twitter.com/2";

/**
 * Build X Authorization URL
 */
export function getXAuthorizationUrl({
  state,
  codeChallenge,
  codeChallengeMethod,
}) {
  const config = getXConfig();

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scopes,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
  });

  const url =
    `${config.authorizationUrl}?${params.toString()}`;

  console.log("=================================");
  console.log("X OAuth Configuration");
  console.log("=================================");
  console.log("CLIENT ID:", config.clientId);
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
  const config = getXConfig();

  const credentials = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString("base64");

  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
    code_verifier: codeVerifier,
  });

  const response = await axios.post(
    config.tokenUrl,
    params.toString(),
    {
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
    }
  );

  return response.data;
}

/**
 * Generic GET helper
 */
export async function xGet(
  endpoint,
  accessToken,
  params = {}
) {
  const response = await axios.get(
    `${X_API}${endpoint}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params,
    }
  );

  return response.data;
}

/**
 * Get authenticated user
 */
export async function getXProfile(
  accessToken
) {
  return await xGet("/users/me", accessToken, {
    "user.fields":
      "id,name,username,profile_image_url,verified",
  });
}