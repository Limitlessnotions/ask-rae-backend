/*
|--------------------------------------------------------------------------
| TikTok Publisher
|--------------------------------------------------------------------------
|
| Publishes content directly to an authorized TikTok account using
| TikTok's Content Posting API.
|
| Supported:
| - Video Direct Post using PULL_FROM_URL
| - Photo Direct Post using PULL_FROM_URL
|
*/

const TIKTOK_API_BASE =
  "https://open.tiktokapis.com/v2";

const TIKTOK_MEDIA_PROXY_BASE_URL =
  (
    process.env.TIKTOK_MEDIA_PROXY_BASE_URL ||
    "https://ask-rae.vercel.app/api/tiktok-media"
  ).replace(/\/+$/, "");

const CLOUDINARY_HOST =
  "res.cloudinary.com";

const CLOUDINARY_CLOUD_NAME =
  "gmdcnulb";

/**
 * Convert an Ask Rae media URL into a URL hosted
 * on the Ask Rae domain.
 *
 * TikTok requires PULL_FROM_URL media to belong to
 * a domain or URL prefix verified by the TikTok app.
 *
 * Cloudinary is therefore proxied through:
 *
 * https://ask-rae.vercel.app/api/tiktok-media/
 *
 * @param {string} mediaUrl
 * @returns {string}
 */
function toTikTokMediaUrl(mediaUrl) {
  if (
    typeof mediaUrl !== "string" ||
    !mediaUrl.trim()
  ) {
    return mediaUrl;
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(mediaUrl);
  } catch {
    return mediaUrl;
  }

  /*
   * Only transform Cloudinary URLs belonging
   * to Ask Rae's configured Cloudinary account.
   */
  if (
    parsedUrl.hostname !== CLOUDINARY_HOST
  ) {
    return mediaUrl;
  }

  const expectedPrefix =
    `/${CLOUDINARY_CLOUD_NAME}/`;

  if (
    !parsedUrl.pathname.startsWith(
      expectedPrefix
    )
  ) {
    return mediaUrl;
  }

  const cloudinaryPath =
    parsedUrl.pathname.slice(
      expectedPrefix.length
    );

  if (
    !cloudinaryPath.startsWith(
      "video/upload/"
    ) &&
    !cloudinaryPath.startsWith(
      "image/upload/"
    )
  ) {
    return mediaUrl;
  }

  return (
    `${TIKTOK_MEDIA_PROXY_BASE_URL}/` +
    cloudinaryPath
  );
}

/**
 * Make an authenticated request to TikTok.
 *
 * @param {string} endpoint
 * @param {string} accessToken
 * @param {Object} options
 * @returns {Promise<Object>}
 */
async function tiktokRequest(
  endpoint,
  accessToken,
  options = {}
) {
  const response = await fetch(
    `${TIKTOK_API_BASE}${endpoint}`,
    {
      ...options,

      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type":
          "application/json; charset=UTF-8",

        ...(options.headers || {}),
      },
    }
  );

  let data;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      `TikTok API request failed with status ${response.status}.`;

    const error = new Error(message);

    error.status = response.status;
    error.code = data?.error?.code;
    error.logId = data?.error?.log_id;
    error.response = data;

    throw error;
  }

  if (
    data?.error &&
    data.error.code &&
    data.error.code !== "ok"
  ) {
    const error = new Error(
      data.error.message ||
        `TikTok API error: ${data.error.code}`
    );

    error.code = data.error.code;
    error.logId = data.error.log_id;
    error.response = data;

    throw error;
  }

  return data;
}

/**
 * Extract a media URL from the Ask Rae content object.
 *
 * The existing publishing system may provide media in
 * different shapes, so we intentionally support the common
 * structures already used by the other social publishers.
 *
 * @param {Object} content
 * @returns {string|null}
 */
function extractMediaUrl(content) {
  if (!content) {
    return null;
  }

  const candidates = [
    content.mediaUrl,
    content.media_url,
    content.url,
    content.imageUrl,
    content.image_url,
    content.videoUrl,
    content.video_url,

    content.media?.url,
    content.media?.mediaUrl,
    content.media?.media_url,

    content.image?.url,
    content.image?.mediaUrl,
    content.image?.media_url,

    content.video?.url,
    content.video?.mediaUrl,
    content.video?.media_url,

    content.media?.[0]?.url,
    content.media?.[0]?.mediaUrl,
    content.media?.[0]?.media_url,

    content.images?.[0]?.url,
    content.videos?.[0]?.url,
  ];

  return (
    candidates.find(
      (value) =>
        typeof value === "string" &&
        value.trim().length > 0
    ) || null
  );
}

/**
 * Extract a caption from the Ask Rae content object.
 *
 * @param {Object} content
 * @returns {string}
 */
function extractCaption(content) {
  if (!content) {
    return "";
  }

  const caption =
    content.caption ??
    content.text ??
    content.message ??
    content.description ??
    content.title ??
    "";

  return String(caption).trim();
}

/**
 * Determine whether the supplied content is a photo.
 *
 * @param {Object} content
 * @returns {boolean}
 */
function isPhoto(content) {
  const type = String(
    content?.type ??
      content?.mediaType ??
      content?.media?.type ??
      ""
  ).toLowerCase();

  return (
    type === "photo" ||
    type === "image" ||
    type === "picture"
  );
}

/**
 * Query the currently authorized TikTok creator.
 *
 * TikTok requires creator information before Direct Post.
 *
 * @param {string} accessToken
 * @returns {Promise<Object>}
 */
async function queryCreatorInfo(accessToken) {
  return await tiktokRequest(
    "/post/publish/creator_info/query/",
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
}

/**
 * Publish a video directly to TikTok.
 *
 * @param {string} accessToken
 * @param {Object} content
 * @returns {Promise<Object>}
 */
async function publishVideo({
  accessToken,
  content,
  creatorInfo,
}) {
  const originalMediaUrl =
    extractMediaUrl(content);

  if (!originalMediaUrl) {
    throw new Error(
      "TikTok video URL is missing."
    );
  }

  const mediaUrl =
    toTikTokMediaUrl(
      originalMediaUrl
    );

  console.log(
    "TikTok original media URL:",
    originalMediaUrl
  );

  console.log(
    "TikTok verified media URL:",
    mediaUrl
  );

  const caption =
    extractCaption(content);

  const privacyOptions =
    creatorInfo?.data?.privacy_level_options ||
    [];

  /*
  |--------------------------------------------------------------------------
  | For Sandbox / unaudited clients
  |--------------------------------------------------------------------------
  |
  | SELF_ONLY is the safest privacy level because TikTok restricts
  | unaudited Direct Posts to private viewing.
  |
  */

  const privacyLevel =
    privacyOptions.includes("SELF_ONLY")
      ? "SELF_ONLY"
      : privacyOptions[0];

  if (!privacyLevel) {
    throw new Error(
      "TikTok did not return any available privacy levels."
    );
  }

  const response =
    await tiktokRequest(
      "/post/publish/video/init/",
      accessToken,
      {
        method: "POST",

        body: JSON.stringify({
          post_info: {
            title: caption,

            privacy_level:
              privacyLevel,

            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,

            /*
             * Ask Rae can generate AI content.
             * This can be overridden by the content payload.
             */
            is_aigc:
              content?.isAigc ??
              content?.is_aigc ??
              false,
          },

          source_info: {
            source: "PULL_FROM_URL",
            video_url: mediaUrl,
          },
        }),
      }
    );

  return {
    platform: "tiktok",

    mediaType: "video",

    publishId:
      response?.data?.publish_id ?? null,

    status: "processing",

    raw: response,
  };
}

/**
 * Publish a photo directly to TikTok.
 *
 * @param {string} accessToken
 * @param {Object} content
 * @param {Object} creatorInfo
 * @returns {Promise<Object>}
 */
async function publishPhoto({
  accessToken,
  content,
  creatorInfo,
}) {
  const originalMediaUrl =
    extractMediaUrl(content);

  if (!originalMediaUrl) {
    throw new Error(
      "TikTok photo URL is missing."
    );
  }

  const mediaUrl =
    toTikTokMediaUrl(
      originalMediaUrl
    );

  console.log(
    "TikTok original media URL:",
    originalMediaUrl
  );

  console.log(
    "TikTok verified media URL:",
    mediaUrl
  );

  const caption =
    extractCaption(content);

  const privacyOptions =
    creatorInfo?.data?.privacy_level_options ||
    [];

  const privacyLevel =
    privacyOptions.includes("SELF_ONLY")
      ? "SELF_ONLY"
      : privacyOptions[0];

  if (!privacyLevel) {
    throw new Error(
      "TikTok did not return any available privacy levels."
    );
  }

  const response =
    await tiktokRequest(
      "/post/publish/content/init/",
      accessToken,
      {
        method: "POST",

        body: JSON.stringify({
          post_info: {
            title: caption,

            description: caption,

            privacy_level:
              privacyLevel,

            disable_comment: false,
          },

          source_info: {
            source: "PULL_FROM_URL",

            photo_cover_index: 0,

            photo_images: [
              mediaUrl,
            ],
          },

          post_mode: "DIRECT_POST",

          media_type: "PHOTO",

          is_aigc:
            content?.isAigc ??
            content?.is_aigc ??
            false,
        }),
      }
    );

  return {
    platform: "tiktok",

    mediaType: "photo",

    publishId:
      response?.data?.publish_id ?? null,

    status: "processing",

    raw: response,
  };
}

/**
 * Publish content to TikTok.
 *
 * @param {Object} params
 * @param {string} params.accessToken
 * @param {string} params.targetId
 * @param {Object} params.content
 */
export async function publish({
  accessToken,
  targetId,
  content,
}) {
  /*
  |--------------------------------------------------------------------------
  | Validate access token
  |--------------------------------------------------------------------------
  */

  if (!accessToken) {
    throw new Error(
      "TikTok access token is missing."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate target
  |--------------------------------------------------------------------------
  |
  | TikTok identifies the authorized creator through the access token.
  | targetId is therefore not required for the TikTok API request itself.
  |
  */

  if (!content) {
    throw new Error(
      "Content payload is missing."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Logging
  |--------------------------------------------------------------------------
  */

  console.log(
    "================================="
  );

  console.log(
    "TIKTOK PUBLISHER"
  );

  console.log(
    "================================="
  );

  console.log(
    "TikTok Target ID:",
    targetId ?? "not required"
  );

  console.log(
    "Content type:",
    content.type ??
      content.mediaType ??
      "unknown"
  );

  console.log(
    "Media URL:",
    extractMediaUrl(content)
      ? "present"
      : "missing"
  );

  /*
  |--------------------------------------------------------------------------
  | Query creator information
  |--------------------------------------------------------------------------
  */

  console.log(
    "Querying TikTok creator information..."
  );

  const creatorInfo =
    await queryCreatorInfo(
      accessToken
    );

  console.log(
    "TikTok creator:",
    creatorInfo?.data?.creator_username ??
      creatorInfo?.data?.creator_nickname ??
      "unknown"
  );

  /*
  |--------------------------------------------------------------------------
  | Determine media type
  |--------------------------------------------------------------------------
  */

  if (isPhoto(content)) {
    console.log(
      "Publishing TikTok photo..."
    );

    const result =
      await publishPhoto({
        accessToken,
        content,
        creatorInfo,
      });

    console.log(
      "✅ TikTok photo publishing initialized"
    );

    console.log(
      "Publish ID:",
      result.publishId
    );

    console.log(
      "================================="
    );

    return result;
  }

  /*
  |--------------------------------------------------------------------------
  | Default to video
  |--------------------------------------------------------------------------
  */

  console.log(
    "Publishing TikTok video..."
  );

  const result =
    await publishVideo({
      accessToken,
      content,
      creatorInfo,
    });

  console.log(
    "✅ TikTok video publishing initialized"
  );

  console.log(
    "Publish ID:",
    result.publishId
  );

  console.log(
    "================================="
  );

  return result;
}