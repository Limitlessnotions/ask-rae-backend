/*
|--------------------------------------------------------------------------
| TikTok Publisher — Inbox Draft Upload
|--------------------------------------------------------------------------
| Uploads videos and photos to the creator's TikTok inbox as drafts.
| The creator must open the TikTok inbox notification, finish editing,
| and publish from the TikTok app.
|
| Required user-authorized scope: video.upload
|
| Video: POST /v2/post/publish/inbox/video/init/
| Photo: POST /v2/post/publish/content/init/ with MEDIA_UPLOAD
|--------------------------------------------------------------------------
*/

const TIKTOK_API_BASE = "https://open.tiktokapis.com/v2";

const TIKTOK_MEDIA_PROXY_BASE_URL = (
  process.env.TIKTOK_MEDIA_PROXY_BASE_URL ||
  "https://ask-rae.vercel.app/api/tiktok-media"
).replace(/\/+$/, "");

const CLOUDINARY_HOST = "res.cloudinary.com";
const CLOUDINARY_CLOUD_NAME = "gmdcnulb";

/**
 * Convert an Ask Rae Cloudinary media URL into a URL hosted
 * on the Ask Rae domain.
 *
 * TikTok requires PULL_FROM_URL media to belong to a
 * domain or URL prefix verified by the TikTok app.
 *
 * @param {string} mediaUrl
 * @returns {string}
 */
function toTikTokMediaUrl(mediaUrl) {
  if (typeof mediaUrl !== "string" || !mediaUrl.trim()) {
    return mediaUrl;
  }

  let parsedUrl;

  try {
    parsedUrl = new URL(mediaUrl);
  } catch {
    return mediaUrl;
  }

  // Only transform Cloudinary URLs.
  if (parsedUrl.hostname !== CLOUDINARY_HOST) {
    return mediaUrl;
  }

  const expectedPrefix = `/${CLOUDINARY_CLOUD_NAME}/`;

  if (!parsedUrl.pathname.startsWith(expectedPrefix)) {
    return mediaUrl;
  }

  const cloudinaryPath = parsedUrl.pathname.slice(
    expectedPrefix.length
  );

  if (
    !cloudinaryPath.startsWith("video/upload/") &&
    !cloudinaryPath.startsWith("image/upload/")
  ) {
    return mediaUrl;
  }

  return `${TIKTOK_MEDIA_PROXY_BASE_URL}/${cloudinaryPath}`;
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
        "Content-Type": "application/json; charset=UTF-8",
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
    const error = new Error(
      data?.error?.message ||
      data?.message ||
      `TikTok API request failed with status ${response.status}.`
    );

    error.status = response.status;
    error.code = data?.error?.code;
    error.logId = data?.error?.log_id;
    error.response = data;

    throw error;
  }

  if (
    data?.error?.code &&
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
 * Supports the common media structures used by the
 * social publishing system.
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
      value =>
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

  return String(
    content.caption ??
    content.text ??
    content.message ??
    content.description ??
    content.title ??
    ""
  ).trim();
}

/**
 * Determine the supplied content type.
 *
 * @param {Object} content
 * @returns {string}
 */
function getContentType(content) {
  return String(
    content?.type ??
    content?.mediaType ??
    content?.media?.type ??
    content?.image?.type ??
    content?.video?.type ??
    ""
  ).toLowerCase();
}

/**
 * Determine whether the supplied content is a photo.
 *
 * Detection uses content type, MIME type, file extension,
 * and Cloudinary image URL paths.
 *
 * @param {Object} content
 * @param {string} mediaUrl
 * @returns {boolean}
 */
function isPhoto(content, mediaUrl) {
  const type = getContentType(content);

  if (
    ["photo", "image", "picture"].includes(type)
  ) {
    return true;
  }

  const mimeType = String(
    content?.mimeType ??
    content?.mime_type ??
    content?.media?.mimeType ??
    content?.media?.mime_type ??
    content?.image?.mimeType ??
    ""
  ).toLowerCase();

  if (mimeType.startsWith("image/")) {
    return true;
  }

  if (mediaUrl) {
    try {
      const pathname = new URL(mediaUrl)
        .pathname
        .toLowerCase();

      if (
        /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(pathname)
      ) {
        return true;
      }

      if (pathname.includes("/image/upload/")) {
        return true;
      }
    } catch {
      // Use the content metadata/default classification.
    }
  }

  return false;
}

/**
 * Determine whether the content is AI-generated.
 *
 * @param {Object} content
 * @returns {boolean}
 */
function getAigcFlag(content) {
  return Boolean(
    content?.isAigc ??
    content?.is_aigc ??
    false
  );
}

/**
 * Upload a video to the TikTok creator's inbox.
 *
 * This does NOT publish the video directly.
 * The creator must complete publishing inside TikTok.
 *
 * Uses:
 * POST /v2/post/publish/inbox/video/init/
 *
 * Required scope:
 * video.upload
 *
 * @param {Object} params
 * @param {string} params.accessToken
 * @param {string} params.mediaUrl
 * @returns {Promise<Object>}
 */
async function uploadVideoDraft({
  accessToken,
  mediaUrl,
}) {
  const verifiedMediaUrl = toTikTokMediaUrl(mediaUrl);

  console.log(
    "TikTok draft video URL prepared."
  );

  console.log(
    "TikTok media URL uses Ask Rae proxy:",
    verifiedMediaUrl !== mediaUrl
  );

  const response = await tiktokRequest(
    "/post/publish/inbox/video/init/",
    accessToken,
    {
      method: "POST",

      body: JSON.stringify({
        source_info: {
          source: "PULL_FROM_URL",
          video_url: verifiedMediaUrl,
        },
      }),
    }
  );

  const publishId = response?.data?.publish_id;

  if (!publishId) {
    throw new Error(
      "TikTok returned no video draft upload ID."
    );
  }

  return {
    platform: "tiktok",

    mediaType: "video",

    workflow: "draft_upload",

    publishId,

    status: "processing",

    userActionRequired: true,

    nextStep:
      "Open the TikTok inbox notification to edit and publish the video.",

    raw: response,
  };
}

/**
 * Upload a photo to the TikTok creator's inbox.
 *
 * This uses MEDIA_UPLOAD, not DIRECT_POST.
 * The creator must complete publishing inside TikTok.
 *
 * Uses:
 * POST /v2/post/publish/content/init/
 *
 * Required scope:
 * video.upload
 *
 * @param {Object} params
 * @param {string} params.accessToken
 * @param {Object} params.content
 * @param {string} params.mediaUrl
 * @returns {Promise<Object>}
 */
async function uploadPhotoDraft({
  accessToken,
  content,
  mediaUrl,
}) {
  const verifiedMediaUrl = toTikTokMediaUrl(mediaUrl);

  const caption = extractCaption(content);

  const postInfo = {};

  if (caption) {
    postInfo.title = caption.slice(0, 90);
    postInfo.description = caption.slice(0, 4000);
  }

  console.log(
    "TikTok draft photo URL prepared."
  );

  console.log(
    "TikTok media URL uses Ask Rae proxy:",
    verifiedMediaUrl !== mediaUrl
  );

  const response = await tiktokRequest(
    "/post/publish/content/init/",
    accessToken,
    {
      method: "POST",

      body: JSON.stringify({
        post_info: postInfo,

        source_info: {
          source: "PULL_FROM_URL",

          photo_cover_index: 0,

          photo_images: [
            verifiedMediaUrl,
          ],
        },

        post_mode: "MEDIA_UPLOAD",

        media_type: "PHOTO",

        is_aigc: getAigcFlag(content),
      }),
    }
  );

  const publishId = response?.data?.publish_id;

  if (!publishId) {
    throw new Error(
      "TikTok returned no photo draft upload ID."
    );
  }

  return {
    platform: "tiktok",

    mediaType: "photo",

    workflow: "draft_upload",

    publishId,

    status: "processing",

    userActionRequired: true,

    nextStep:
      "Open the TikTok inbox notification to edit and publish the photo post.",

    raw: response,
  };
}

/**
 * Main TikTok publishing function.
 *
 * Important:
 * - Does not call creator_info/query.
 * - Does not use Direct Post.
 * - Does not require video.publish.
 * - Uploads media to the TikTok inbox as a draft.
 *
 * @param {Object} params
 * @param {string} params.accessToken
 * @param {string} params.targetId
 * @param {Object} params.content
 * @returns {Promise<Object>}
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
  | Validate content
  |--------------------------------------------------------------------------
  */

  if (!content) {
    throw new Error(
      "Content payload is missing."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Extract media URL
  |--------------------------------------------------------------------------
  */

  const mediaUrl = extractMediaUrl(content);

  /*
  |--------------------------------------------------------------------------
  | Logging
  |--------------------------------------------------------------------------
  */

  console.log(
    "================================="
  );

  console.log(
    "TIKTOK DRAFT UPLOADER"
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
    getContentType(content) || "unknown"
  );

  console.log(
    "Media URL:",
    mediaUrl ? "present" : "missing"
  );

  /*
  |--------------------------------------------------------------------------
  | Validate media
  |--------------------------------------------------------------------------
  |
  | TikTok's inbox draft upload workflow requires a video
  | or photo. Text-only posts are not supported here.
  |
  */

  if (!mediaUrl) {
    throw new Error(
      "TikTok draft upload requires a video or photo URL. Text-only posts cannot be uploaded through this workflow."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Determine media type
  |--------------------------------------------------------------------------
  */

  if (isPhoto(content, mediaUrl)) {
    console.log(
      "Uploading TikTok photo as an inbox draft..."
    );

    const result = await uploadPhotoDraft({
      accessToken,
      content,
      mediaUrl,
    });

    console.log(
      "TikTok photo draft upload initialized."
    );

    console.log(
      "Publish ID:",
      result.publishId
    );

    console.log(
      "Creator must finish publishing inside TikTok."
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
    "Uploading TikTok video as an inbox draft..."
  );

  const result = await uploadVideoDraft({
    accessToken,
    mediaUrl,
  });

  console.log(
    "TikTok video draft upload initialized."
  );

  console.log(
    "Publish ID:",
    result.publishId
  );

  console.log(
    "Creator must finish publishing inside TikTok."
  );

  console.log(
    "================================="
  );

  return result;
}