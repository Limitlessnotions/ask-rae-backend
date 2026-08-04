/*
|--------------------------------------------------------------------------
| Instagram OAuth Provider
|--------------------------------------------------------------------------
|
| Handles Instagram Business OAuth operations.
|
*/

import {
  getInstagramLoginUrl,
  exchangeCodeForToken,
  getUserPages,
  getInstagramBusinessAccount,
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
 * Connect an Instagram Business account
 */
export async function connectAccount(code) {
  console.log("=================================");
  console.log("INSTAGRAM CONNECT ACCOUNT");
  console.log("=================================");

  console.log("Step 1: Exchanging authorization code...");

  const token = await exchangeCodeForToken(code);

  console.log("✅ Access token received");

  console.log("Step 2: Loading Facebook Pages...");

  const pages = await getUserPages(token.access_token);

  console.log(`✅ Found ${pages.length} page(s)`);

  if (!pages.length) {
    throw new Error(
      "No Facebook Pages found for this account."
    );
  }

  console.log("Step 3: Looking for connected Instagram Business account...");

  let instagramPage = null;

  for (const page of pages) {
    console.log(`Checking page: ${page.name}`);

    const pageDetails =
      await getInstagramBusinessAccount(
        page.id,
        token.access_token
      );

    console.log(pageDetails);

    if (pageDetails.instagram_business_account) {
      instagramPage = {
        page,
        instagram:
          pageDetails.instagram_business_account,
      };

      break;
    }
  }

  if (!instagramPage) {
    throw new Error(
      "No Instagram Business account is connected to any Facebook Page."
    );
  }

  console.log("✅ Instagram Business account found");

  console.log("Step 4: Loading Instagram profile...");

  const profile =
    await getInstagramProfile(
      instagramPage.instagram.id,
      token.access_token
    );

  console.log("✅ Instagram profile loaded");
  console.log(profile);

  console.log("Step 5: Normalizing account...");

  const account = normalizeInstagramAccount({
    profile,
    token,
    page: instagramPage.page,
  });

  console.log("✅ Instagram account normalized");

  return account;
}

/**
 * Refresh token
 */
export async function refreshAccessToken() {
  throw new Error(
    "Instagram refresh token not implemented."
  );
}