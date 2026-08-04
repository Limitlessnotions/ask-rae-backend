/*
|--------------------------------------------------------------------------
| X OAuth Provider
|--------------------------------------------------------------------------
|
| Handles X (Twitter) OAuth operations.
|
*/

import {
  getXAuthorizationUrl,
  exchangeCodeForToken,
  getXProfile,
} from "../../x.service.js";

import { normalizeXAccount } from "./normalize.js";

/**
 * Build Authorization URL
 */
export function buildAuthorizationUrl({
  state,
  codeChallenge,
  codeChallengeMethod,
}) {
  return getXAuthorizationUrl({
    state,
    codeChallenge,
    codeChallengeMethod,
  });
}

/**
 * Connect X Account
 */
export async function connectAccount(
  code,
  session
) {
  console.log("=================================");
  console.log("X CONNECT ACCOUNT");
  console.log("=================================");

  console.log("Step 1: Exchanging authorization code...");

  const token =
    await exchangeCodeForToken({
      code,
      codeVerifier: session.codeVerifier,
    });

  console.log("✅ Access token received");

  console.log("Step 2: Loading X profile...");

  const profile =
    await getXProfile(token.access_token);

  console.log("✅ Profile loaded");
  console.log(profile);

  console.log("Step 3: Normalizing account...");

  const account =
    normalizeXAccount({
      profile,
      token,
    });

  console.log("✅ X account normalized");

  return account;
}

/**
 * Refresh token
 */
export async function refreshAccessToken() {
  throw new Error(
    "X refresh token not implemented."
  );
}