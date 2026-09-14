/*
|--------------------------------------------------------------------------
| Instagram OAuth Provider
|--------------------------------------------------------------------------
|
| Handles Instagram Login OAuth operations.
|
| This provider uses Instagram Login directly.
| It does not use Facebook Pages.
|
*/

import {
  getInstagramLoginUrl,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getInstagramProfile,
} from "../../instagram.service.js";

import { normalizeInstagramAccount } from "./normalize.js";

/**
 * Build Instagram Authorization URL
 */
export function buildAuthorizationUrl({ state }) {
  return getInstagramLoginUrl(state);
}

/**
 * Connect an Instagram account
 */
export async function connectAccount(code) {
  console.log("=================================");
  console.log("INSTAGRAM CONNECT ACCOUNT");
  console.log("=================================");

  /*
  |--------------------------------------------------------------------------
  | Step 1: Exchange authorization code
  |--------------------------------------------------------------------------
  */

  console.log(
    "Step 1: Exchanging Instagram authorization code..."
  );

  const shortLivedToken =
    await exchangeCodeForToken(code);

  console.log(
    "✅ Instagram access token received"
  );

  console.log(
    "Instagram user ID:",
    shortLivedToken.user_id
  );

  /*
  |--------------------------------------------------------------------------
  | Step 2: Exchange for long-lived token
  |--------------------------------------------------------------------------
  */

  console.log(
    "Step 2: Exchanging for long-lived Instagram token..."
  );

  const longLivedToken =
    await exchangeForLongLivedToken(
      shortLivedToken.access_token
    );

  console.log(
    "✅ Long-lived Instagram token received"
  );

  /*
  |--------------------------------------------------------------------------
  | Step 3: Load Instagram profile
  |--------------------------------------------------------------------------
  */

  console.log(
    "Step 3: Loading Instagram profile..."
  );

  const profile =
    await getInstagramProfile(
      longLivedToken.access_token
    );

  console.log(
    "✅ Instagram profile loaded"
  );

  console.log(profile);

  /*
  |--------------------------------------------------------------------------
  | Step 4: Normalize account
  |--------------------------------------------------------------------------
  */

  console.log(
    "Step 4: Normalizing Instagram account..."
  );

  const account =
    normalizeInstagramAccount({
      profile,
      token: longLivedToken,
    });

  console.log(
    "✅ Instagram account normalized"
  );

  console.log(
    "Instagram username:",
    account.username
  );

  console.log(
    "Instagram account ID:",
    account.platformUserId
  );

  console.log("=================================");

  return account;
}

/**
 * Refresh Instagram access token
 */
export async function refreshAccessToken() {
  throw new Error(
    "Instagram token refresh not implemented."
  );
}