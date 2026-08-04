/*
|--------------------------------------------------------------------------
| TikTok Configuration
|--------------------------------------------------------------------------
|
| Loads TikTok OAuth configuration from environment variables.
|
*/

export function getTikTokConfig() {
  return {
    clientKey: process.env.TIKTOK_CLIENT_KEY,

    clientSecret: process.env.TIKTOK_CLIENT_SECRET,

    redirectUri: process.env.TIKTOK_REDIRECT_URI,

   scopes: [
  "user.info.basic",
  "video.upload",
],
  };
}