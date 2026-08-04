/*
|--------------------------------------------------------------------------
| TikTok OAuth Provider
|--------------------------------------------------------------------------
|
| Handles TikTok OAuth operations.
|
*/

import {
  getTikTokAuthorizationUrl,
  exchangeCodeForToken,
  getTikTokProfile,
} from "../../tiktok.service.js";

import { normalizeTikTokAccount } from "./normalize.js";

/**
 * Build TikTok Authorization URL
 */
export function buildAuthorizationUrl({
  state,
  codeChallenge,
  codeChallengeMethod,
}) {
  return getTikTokAuthorizationUrl({
    state,
    codeChallenge,
    codeChallengeMethod,
  });
}

/**
 * Connect TikTok Account
 */
export async function connectAccount(code, session) {
  console.log("=================================");
  console.log("TIKTOK CONNECT ACCOUNT");
  console.log("=================================");

  console.log("Step 1: Exchanging authorization code...");

  const token = await exchangeCodeForToken({
    code,
    codeVerifier: session.codeVerifier,
  });

  console.log("✅ Access token received");

  console.log("Step 2: Loading TikTok profile...");

  const profile = await getTikTokProfile(
    token.access_token
  );

  console.log("✅ Profile loaded");
  console.log(profile);

  console.log("Step 3: Normalizing account...");

  const account = normalizeTikTokAccount({
    profile,
    token,
  });

  console.log("✅ TikTok account normalized");

  return account;
}

/**
 * Refresh TikTok token
 */
export async function refreshAccessToken() {
  throw new Error(
    "TikTok refresh token not implemented."
  );
}