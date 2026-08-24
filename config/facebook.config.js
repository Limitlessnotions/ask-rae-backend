/**
 * Facebook Configuration
 *
 * We expose a function instead of a constant so that
 * environment variables are read only when needed,
 * after dotenv has already loaded.
 */

export function getFacebookConfig() {
  return {
    appId: process.env.FACEBOOK_APP_ID,

    appSecret: process.env.FACEBOOK_APP_SECRET,

    redirectUri: process.env.FACEBOOK_REDIRECT_URI,

    configId: process.env.FACEBOOK_CONFIG_ID,

    scopes: [
      "public_profile",
      "email",
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
    ].join(","),
  };
}