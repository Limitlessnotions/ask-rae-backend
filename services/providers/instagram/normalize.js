/*
|--------------------------------------------------------------------------
| Instagram Account Normalizer
|--------------------------------------------------------------------------
|
| Converts Instagram's Graph API response into
| Ask Rae's standard social account format.
|
*/

/**
 * Normalize an Instagram account.
 */
export function normalizeInstagramAccount({
  profile,
  token,
  page,
}) {
  return {
    platform: "instagram",

    platformUserId: profile.id,

    username: profile.username ?? null,

    name: page?.name ?? null,

    email: null,

    avatar: profile.profile_picture_url ?? null,

    accessToken: token.access_token,

    refreshToken: null,

    expiresAt: token.expires_in
      ? new Date(
          Date.now() + token.expires_in * 1000
        )
      : null,

    pageId: page?.id ?? null,

    pageName: page?.name ?? null,

    instagramBusinessId: profile.id,

    followersCount:
      profile.followers_count ?? 0,

    mediaCount:
      profile.media_count ?? 0,

    raw: {
      profile,
      page,
      token,
    },
  };
}