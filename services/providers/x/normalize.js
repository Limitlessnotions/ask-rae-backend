/*
|--------------------------------------------------------------------------
| Normalize X (Twitter) Account
|--------------------------------------------------------------------------
|
| Converts the raw X API response into the standard
| social account format used throughout Ask Rae.
|
*/

export function normalizeXAccount({
  profile,
  token,
}) {
  const user = profile.data;

  return {
    id: user.id,

    platform: "x",

    username: user.username,

    displayName: user.name,

    avatar: user.profile_image_url,

    verified: user.verified ?? false,

    accessToken: token.access_token,

    refreshToken: token.refresh_token ?? null,

    expiresIn: token.expires_in ?? null,

    tokenType: token.token_type,

    scopes: token.scope
      ? token.scope.split(" ")
      : [],
  };
}