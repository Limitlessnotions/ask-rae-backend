import crypto from "crypto";

/**
 * Convert a Buffer into a Base64 URL-safe string.
 *
 * OAuth providers require PKCE values to be URL-safe.
 */
function base64UrlEncode(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Generate a PKCE code verifier.
 *
 * This is the secret that only our backend knows.
 */
function generateCodeVerifier() {
  return base64UrlEncode(
    crypto.randomBytes(64)
  );
}

/**
 * Generate a PKCE code challenge.
 *
 * This is the SHA256 hash of the verifier.
 * It is sent to the OAuth provider.
 */
function generateCodeChallenge(codeVerifier) {
  return base64UrlEncode(
    crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest()
  );
}

/**
 * Generate a complete PKCE pair.
 */
export function generatePKCE() {
  const codeVerifier =
    generateCodeVerifier();

  const codeChallenge =
    generateCodeChallenge(codeVerifier);

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: "S256",
  };
}