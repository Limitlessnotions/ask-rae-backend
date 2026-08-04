import crypto from "crypto";

/**
 * Generate a cryptographically secure OAuth state token.
 *
 * This token is sent to the OAuth provider and returned to us
 * in the callback. We use it to verify that the callback
 * belongs to the user who initiated the login.
 */
export function generateState() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Compare two OAuth state values.
 *
 * Returns true if they match.
 */
export function validateState(expectedState, receivedState) {
  return (
    typeof expectedState === "string" &&
    typeof receivedState === "string" &&
    expectedState === receivedState
  );
}