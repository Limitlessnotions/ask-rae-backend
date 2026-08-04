/*
|--------------------------------------------------------------------------
| Social Provider Configuration
|--------------------------------------------------------------------------
|
| This file contains the configuration for every social media provider
| supported by Ask Rae.
|
| It is the single source of truth for:
| - OAuth
| - API URLs
| - Scopes
| - PKCE support
| - API versions
|
*/

export const PROVIDERS = {

  facebook: {

    name: "Facebook",

    apiVersion: "v23.0",

    authorizationUrl:
      "https://www.facebook.com/v23.0/dialog/oauth",

    tokenUrl:
      "https://graph.facebook.com/v23.0/oauth/access_token",

    usesPKCE: false,

    scopes: [
      "email",
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "pages_manage_metadata"
      
    ]
     },
 instagram: {

    name: "Instagram",

    apiVersion: "v23.0",

    authorizationUrl:
      "https://www.facebook.com/v23.0/dialog/oauth",

    tokenUrl:
      "https://graph.facebook.com/v23.0/oauth/access_token",

    usesPKCE: false,

    scopes: [
      "email",
      "pages_show_list",
      "pages_read_engagement",
      "pages_manage_posts",
      "instagram_basic"
    ]
    
  },

  x: {

  name: "X",

  authorizationUrl:
    "https://twitter.com/i/oauth2/authorize",

  tokenUrl:
    "https://api.twitter.com/2/oauth2/token",

  usesPKCE: true,

  scopes: [
    "tweet.read",
    "tweet.write",
    "users.read",
    "offline.access",
  ],

},
  
  tiktok: {

    name: "TikTok",

    authorizationUrl:
      "https://www.tiktok.com/v2/auth/authorize/",

    tokenUrl:
      "https://open.tiktokapis.com/v2/oauth/token/",

    usesPKCE: true,

    scopes: [
      "user.info.basic",
      "video.publish"
    ]

  }

};