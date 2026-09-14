export function getInstagramConfig() {
  const appId = process.env.INSTAGRAM_APP_ID;
  const appSecret = process.env.INSTAGRAM_APP_SECRET;
  const redirectUri = process.env.INSTAGRAM_REDIRECT_URI;

  if (!appId) {
    throw new Error("INSTAGRAM_APP_ID is not configured.");
  }

  if (!appSecret) {
    throw new Error("INSTAGRAM_APP_SECRET is not configured.");
  }

  if (!redirectUri) {
    throw new Error("INSTAGRAM_REDIRECT_URI is not configured.");
  }

  return {
    appId,
    appSecret,
    redirectUri,
  };
}