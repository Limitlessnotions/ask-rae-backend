export function normalizeFacebookAccount({
  profile,
  token,
  pages = [],
}) {
  const defaultPage =
    pages.length > 0 ? pages[0] : null;

  /*
  |--------------------------------------------------------------------------
  | Facebook Page Identity
  |--------------------------------------------------------------------------
  |
  | Facebook Login for Business is returning the
  | Meta System User as /me:
  |
  |   Ask Rae System User
  |
  | But Ask Rae is actually connecting the Facebook
  | Page for publishing.
  |
  | Therefore the Page becomes the displayed identity.
  |
  */

  const pageName =
    defaultPage?.name ??
    "Facebook";

  const pagePicture =
    defaultPage?.picture?.data?.url ??
    null;

  return {
    platform: "facebook",

    /*
    |--------------------------------------------------------------------------
    | Display Identity
    |--------------------------------------------------------------------------
    */

    platformUserId:
      profile.id,

    displayName:
      pageName,

    name:
      pageName,

    avatar:
      pagePicture,

    email:
      profile.email ?? null,

    username:
      null,

    /*
    |--------------------------------------------------------------------------
    | OAuth Token
    |--------------------------------------------------------------------------
    */

    accessToken:
      token.access_token,

    refreshToken:
      null,

    expiresAt:
      token.expires_in
        ? new Date(
            Date.now() +
              token.expires_in * 1000
          )
        : null,

    /*
    |--------------------------------------------------------------------------
    | Default Facebook Page
    |--------------------------------------------------------------------------
    */

    defaultTargetId:
      defaultPage?.id ??
      null,

    defaultTargetName:
      pageName,

    /*
    |--------------------------------------------------------------------------
    | Connected Facebook Pages
    |--------------------------------------------------------------------------
    */

    pages: pages.map((page) => ({
      id: page.id,

      name: page.name,

      category:
        page.category ?? null,

      accessToken:
        page.access_token,

      refreshToken:
        null,

      picture:
        page.picture?.data?.url ??
        null,

      tasks:
        page.tasks ?? [],
    })),

    /*
    |--------------------------------------------------------------------------
    | Connection Metadata
    |--------------------------------------------------------------------------
    */

    connectedAt:
      new Date(),

    updatedAt:
      new Date(),

    /*
    |--------------------------------------------------------------------------
    | Raw Facebook Data
    |--------------------------------------------------------------------------
    */

    raw: {
      profile,
      token,
    },
  };
}