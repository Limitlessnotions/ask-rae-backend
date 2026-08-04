export function getInstagramConfig() {
  return {
    appId: process.env.FACEBOOK_APP_ID,
    appSecret: process.env.FACEBOOK_APP_SECRET,
    redirectUri: process.env.INSTAGRAM_REDIRECT_URI,
  };
}