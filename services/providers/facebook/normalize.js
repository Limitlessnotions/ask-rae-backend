/*
|--------------------------------------------------------------------------
| Facebook Account Normalizer
|--------------------------------------------------------------------------
|
| Converts Facebook's profile, token and managed Pages into
| Ask Rae's standard social account format.
|
*/

/**
 * Normalize a Facebook account.
 */
export function normalizeFacebookAccount({
  profile,
  token,
  pages = [],
}) {
  const defaultPage =
    pages.length > 0 ? pages[0] : null;

  return {
    platform: "facebook",

    platformUserId: profile.id,

    displayName: profile.name ?? null,

    name: profile.name ?? null,

    email: profile.email ?? null,

    username: null,

    avatar:
      profile.picture?.data?.url ?? null,

    accessToken: token.access_token,

    refreshToken: null,

    expiresAt: token.expires_in
      ? new Date(
          Date.now() +
            token.expires_in * 1000
        )
      : null,

    /*
    |--------------------------------------------------------------------------
    | Default Publishing Target
    |--------------------------------------------------------------------------
    */

    defaultTargetId:
      defaultPage?.id ?? null,

    defaultTargetName:
      defaultPage?.name ?? null,

    /*
    |--------------------------------------------------------------------------
    | Managed Facebook Pages
    |--------------------------------------------------------------------------
    */

    pages: pages.map((page) => ({
      id: page.id,
      name: page.name,
      category: page.category ?? null,

      accessToken:
        page.access_token,

      picture:
        page.picture?.data?.url ??
        null,

      tasks: page.tasks ?? [],
    })),

    /*
    |--------------------------------------------------------------------------
    | Metadata
    |--------------------------------------------------------------------------
    */

    connectedAt: new Date(),

    updatedAt: new Date(),

    raw: {
      profile,
      token,
    },
  };
}