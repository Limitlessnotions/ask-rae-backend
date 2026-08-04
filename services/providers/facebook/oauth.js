/*
|--------------------------------------------------------------------------
| Facebook OAuth Provider
|--------------------------------------------------------------------------
|
| Handles Facebook-specific OAuth operations.
|
*/

import {
  getFacebookLoginUrl,
  exchangeCodeForToken,
  getFacebookProfile,
  getUserPages,
} from "../../facebook.service.js";

import { normalizeFacebookAccount } from "./normalize.js";

/**
 * Build Facebook Authorization URL
 */
export function buildAuthorizationUrl({ state }) {
  return getFacebookLoginUrl(state);
}

/**
 * Connect a Facebook account.
 */
export async function connectAccount(code) {
  console.log("=================================");
  console.log("FACEBOOK CONNECT ACCOUNT");
  console.log("=================================");

  console.log("Step 1: Exchanging authorization code...");

  const token = await exchangeCodeForToken(code);

  console.log("✅ Access token received");
  console.log(token);

  console.log("Step 2: Loading Facebook profile...");

  const profile = await getFacebookProfile(
    token.access_token
  );

  console.log("✅ Profile loaded");
  console.log(profile);

  console.log("Step 3: Loading Facebook Pages...");

  const pages = await getUserPages(
    token.access_token
  );

  console.log("✅ Pages loaded");
  console.log(pages);

  console.log("Step 4: Normalizing account...");

  const account = normalizeFacebookAccount({
    profile,
    token,
    pages,
  });

  console.log("✅ Account normalized");

  return account;
}

/**
 * Refresh token
 */
export async function refreshAccessToken() {
  throw new Error(
    "Facebook refresh token not implemented."
  );
}