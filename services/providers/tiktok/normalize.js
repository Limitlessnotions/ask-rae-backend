/*
|--------------------------------------------------------------------------
| TikTok Account Normalizer
|--------------------------------------------------------------------------
|
| Converts TikTok's API response into
| Ask Rae's standard social account format.
|
*/

/**
 * Normalize a TikTok account.
 */
export function normalizeTikTokAccount({
  profile,
  token,
}) {
  return {
    platform: "tiktok",

    platformUserId: profile.open_id,

    username: profile.username ?? null,

    name: profile.display_name ?? null,

    email: null,

    avatar: profile.avatar_url ?? null,

    accessToken: token.access_token,

    refreshToken: token.refresh_token ?? null,

    expiresAt: token.expires_in
      ? new Date(
          Date.now() + token.expires_in * 1000
        )
      : null,

    profileUrl:
      profile.profile_deep_link ?? null,

    raw: {
      profile,
      token,
    },
  };
}