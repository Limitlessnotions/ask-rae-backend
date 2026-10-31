
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
  deleteSocialAccount,
} from "../socialAccount.service.js";

/**
 * --------------------------------------------------------------------------
 * Create OAuth Connection
 * --------------------------------------------------------------------------
 *
 * replaceExisting:
 * - false: start a normal OAuth connection.
 * - true: remove the existing Ask Rae connection before starting OAuth.
 *
 * This only removes Ask Rae's stored credentials. It does not, by itself,
 * revoke authorization from the external social platform.
 */
export async function createConnection({
  uid,
  platform,
  replaceExisting = false,
}) {
  if (!uid) {
    throw new Error("User ID is required to create an OAuth connection.");
  }

  if (!platform) {
    throw new Error("OAuth platform is required.");
  }

  const normalizedPlatform = platform.toLowerCase();
  const config = PROVIDERS[normalizedPlatform];

  if (!config) {
    throw new Error(`Unsupported provider: ${normalizedPlatform}`);
  }

  const provider = providers[normalizedPlatform];

  if (!provider) {
    throw new Error(
      `Provider '${normalizedPlatform}' is not registered.`
    );
  }

  // Remove the old local connection before beginning a fresh authorization.
  if (replaceExisting) {
    await deleteSocialAccount(uid, normalizedPlatform);
  }

  const state = generateState();

  let pkce = null;

  if (config.usesPKCE) {
    pkce = generatePKCE();
  }

  await saveOAuthSession({
    uid,
    platform: normalizedPlatform,
    state,
    codeVerifier: pkce?.codeVerifier ?? null,
  });

  try {
    const authorizationUrl =
      await provider.oauth.buildAuthorizationUrl({
        state,
        codeChallenge: pkce?.codeChallenge,
        codeChallengeMethod: pkce?.codeChallengeMethod,
      });

    if (!authorizationUrl) {
      throw new Error(
        `Unable to generate ${normalizedPlatform} authorization URL.`
      );
    }

    return {
      authorizationUrl,
    };
  } catch (error) {
    // Avoid leaving an unusable OAuth session behind.
    await deleteOAuthSession(state);
    throw error;
  }
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
  const normalizedPlatform = platform?.toLowerCase();
  const { code, state, error, error_description: errorDescription } =
    query ?? {};

  if (error) {
    throw new Error(
      errorDescription ||
        `OAuth authorization was declined or failed: ${error}`
    );
  }

  if (!code) {
    throw new Error("Authorization code missing.");
  }

  if (!state) {
    throw new Error("OAuth state missing.");
  }

  const session = await getOAuthSession(state);

  if (!session) {
    throw new Error("OAuth session not found or expired.");
  }

  if (!session.uid) {
    await deleteOAuthSession(state);
    throw new Error("OAuth session does not contain a user ID.");
  }

  if (
    !session.platform ||
    session.platform !== normalizedPlatform
  ) {
    await deleteOAuthSession(state);
    throw new Error("OAuth platform mismatch.");
  }

  const provider = providers[normalizedPlatform];

  if (!provider) {
    await deleteOAuthSession(state);
    throw new Error(`Unsupported provider: ${normalizedPlatform}`);
  }

  try {
    const account = await provider.oauth.connectAccount(
      code,
      session
    );

    if (!account || typeof account !== "object") {
      throw new Error(
        `${normalizedPlatform} did not return a valid account.`
      );
    }

    await saveSocialAccount({
      uid: session.uid,
      platform: normalizedPlatform,
      account,
    });

    return {
      success: true,
      platform: normalizedPlatform,
      account,
    };
  } finally {
    // A callback state must not be reusable, including after provider errors.
    await deleteOAuthSession(state);
  }
}
