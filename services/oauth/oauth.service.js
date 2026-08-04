import { generateState } from "./oauth.state.js";
import { generatePKCE } from "./oauth.pkce.js";

import {
  saveOAuthSession,
  getOAuthSession,
  deleteOAuthSession,
} from "./oauth.storage.js";

import { PROVIDERS } from "../../config/providers.config.js";
import providers from "../providers/index.js";

import {
  saveSocialAccount,
} from "../socialAccount.service.js";

/**
 * --------------------------------------------------------------------------
 * Create OAuth Connection
 * --------------------------------------------------------------------------
 */
export async function createConnection({
  uid,
  platform,
}) {
  const config = PROVIDERS[platform];

  if (!config) {
    throw new Error(`Unsupported provider: ${platform}`);
  }

  const provider = providers[platform];

  if (!provider) {
    throw new Error(`Provider '${platform}' is not registered.`);
  }

  const state = generateState();

  let pkce = null;

  if (config.usesPKCE) {
    pkce = generatePKCE();
  }

  await saveOAuthSession({
    uid,
    platform,
    state,
    codeVerifier: pkce?.codeVerifier ?? null,
  });

  const authorizationUrl =
    provider.oauth.buildAuthorizationUrl({
      state,
      codeChallenge: pkce?.codeChallenge,
      codeChallengeMethod: pkce?.codeChallengeMethod,
    });

  return {
    authorizationUrl,
  };
}

/**
 * --------------------------------------------------------------------------
 * Handle OAuth Callback
 * --------------------------------------------------------------------------
 */
export async function handleCallback({
  platform,
  query,
}) {
  const { code, state } = query;

  if (!code) {
    throw new Error("Authorization code missing.");
  }

  if (!state) {
    throw new Error("OAuth state missing.");
  }

  const session = await getOAuthSession(state);

  if (!session) {
    throw new Error("OAuth session not found.");
  }

  const provider = providers[platform];

  if (!provider) {
    throw new Error(`Unsupported provider: ${platform}`);
  }

 const account =
  await provider.oauth.connectAccount(
    code,
    session
  );

  console.log("Step 5: Saving social account...");

await saveSocialAccount({
  uid: session.uid,
  platform,
  account,
});

console.log("✅ Social account saved");

console.log("Step 6: Deleting OAuth session...");

await deleteOAuthSession(state);

console.log("✅ OAuth session deleted");

console.log("Step 7: OAuth completed successfully");

return {
  success: true,
  account,
};

}
