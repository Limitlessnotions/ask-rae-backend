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
    /*
    |--------------------------------------------------------------------------
    | TikTok App Credentials
    |--------------------------------------------------------------------------
    */

    clientKey: process.env.TIKTOK_CLIENT_KEY,

    clientSecret: process.env.TIKTOK_CLIENT_SECRET,

    /*
    |--------------------------------------------------------------------------
    | TikTok OAuth Callback
    |--------------------------------------------------------------------------
    |
    | This URL is registered with TikTok.
    |
    | TikTok redirects the user here after authorization.
    |
    */

    redirectUri: process.env.TIKTOK_REDIRECT_URI,

    /*
    |--------------------------------------------------------------------------
    | Ask Rae App Redirect
    |--------------------------------------------------------------------------
    |
    | After the backend finishes the OAuth flow, the backend
    | redirects back into the Ask Rae mobile application.
    |
    | Example:
    |
    | askrae://tiktok-success
    |
    */

    appRedirectUri:
      process.env.TIKTOK_APP_REDIRECT,

    /*
    |--------------------------------------------------------------------------
    | TikTok OAuth Scopes
    |--------------------------------------------------------------------------
    */

    scopes: [
      "user.info.basic",
      "video.upload",
    ],
  };
}