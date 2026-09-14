/*
|--------------------------------------------------------------------------
| Instagram Publisher
|--------------------------------------------------------------------------
|
| Publishes content to Instagram using the Instagram API
| with Instagram Login.
|
| Authentication:
|   Instagram User Access Token
|
| API:
|   https://graph.instagram.com
|
| Required permissions:
|   instagram_business_basic
|   instagram_business_content_publish
|
| Publishing flow:
|
|   1. Create media container
|   2. Wait for container to become ready
|   3. Publish the container
|
|--------------------------------------------------------------------------
*/

import axios from "axios";

const GRAPH_URL =
  "https://graph.instagram.com/v23.0";

const CONTAINER_POLL_INTERVAL = 2000;

const CONTAINER_MAX_ATTEMPTS = 30;

/*
|--------------------------------------------------------------------------
| Content extraction helpers
|--------------------------------------------------------------------------
*/

/**
 * Extract a caption from the content object.
 */
function getCaption(content) {
  return (
    content?.caption ??
    content?.text ??
    content?.body ??
    content?.description ??
    ""
  );
}

/**
 * Extract a media object when Ask Rae sends
 * media as a nested object.
 */
function getNestedMedia(content) {
  if (
    content?.media &&
    typeof content.media === "object"
  ) {
    return content.media;
  }

  return null;
}

/**
 * Extract a publicly accessible image URL.
 */
function getImageUrl(content) {
  const media = getNestedMedia(content);

  const image =
    content?.image &&
    typeof content.image === "object"
      ? content.image
      : null;

  return (
    content?.imageUrl ??
    content?.image_url ??
    content?.mediaUrl ??
    content?.media_url ??
    content?.url ??
    media?.imageUrl ??
    media?.image_url ??
    media?.mediaUrl ??
    media?.media_url ??
    media?.url ??
    media?.uri ??
    image?.url ??
    image?.uri ??
    null
  );
}

/**
 * Extract a publicly accessible video URL.
 */
function getVideoUrl(content) {
  const media = getNestedMedia(content);

  const video =
    content?.video &&
    typeof content.video === "object"
      ? content.video
      : null;

  return (
    content?.videoUrl ??
    content?.video_url ??
    content?.mediaUrl ??
    content?.media_url ??
    content?.url ??
    media?.videoUrl ??
    media?.video_url ??
    media?.mediaUrl ??
    media?.media_url ??
    media?.url ??
    media?.uri ??
    video?.url ??
    video?.uri ??
    null
  );
}

/**
 * Determine whether a URL looks like a video.
 */
function urlLooksLikeVideo(url) {
  if (
    typeof url !== "string" ||
    !url
  ) {
    return false;
  }

  const cleanUrl = url
    .split("?")[0]
    .split("#")[0]
    .toLowerCase();

  return /\.(mp4|mov|m4v|avi|webm)$/i.test(
    cleanUrl
  );
}

/**
 * Determine whether a URL looks like an image.
 */
function urlLooksLikeImage(url) {
  if (
    typeof url !== "string" ||
    !url
  ) {
    return false;
  }

  const cleanUrl = url
    .split("?")[0]
    .split("#")[0]
    .toLowerCase();

  return /\.(jpg|jpeg|png|webp|gif)$/i.test(
    cleanUrl
  );
}

/**
 * Determine the Instagram media type.
 *
 * Returns:
 *
 *   IMAGE
 *   REELS
 */
function getMediaType(content) {
  const explicitType = String(
    content?.mediaType ??
      content?.media_type ??
      content?.media?.type ??
      content?.media?.mediaType ??
      content?.media?.media_type ??
      content?.type ??
      ""
  ).toLowerCase();

  /*
  |--------------------------------------------------------------------------
  | Explicit video types
  |--------------------------------------------------------------------------
  */

  if (
    explicitType === "reel" ||
    explicitType === "reels" ||
    explicitType === "video" ||
    explicitType === "mp4" ||
    explicitType === "mov"
  ) {
    return "REELS";
  }

  /*
  |--------------------------------------------------------------------------
  | Explicit carousel types
  |--------------------------------------------------------------------------
  */

  if (
    explicitType === "carousel" ||
    explicitType === "carousel_album"
  ) {
    return "CAROUSEL";
  }

  /*
  |--------------------------------------------------------------------------
  | Generic "media"
  |--------------------------------------------------------------------------
  |
  | Ask Rae may send:
  |
  |   type: "media"
  |
  | In that case, inspect the URL and nested
  | media object to determine image/video.
  |
  */

  if (explicitType === "media") {
    const videoUrl =
      getVideoUrl(content);

    if (
      content?.media?.type &&
      ["video", "reel", "reels"].includes(
        String(content.media.type).toLowerCase()
      )
    ) {
      return "REELS";
    }

    if (urlLooksLikeVideo(videoUrl)) {
      return "REELS";
    }

    return "IMAGE";
  }

  /*
  |--------------------------------------------------------------------------
  | Text with media
  |--------------------------------------------------------------------------
  |
  | If the payload says "text" but contains a
  | media URL, treat it as media instead of
  | attempting a text-only Instagram post.
  |
  */

  if (explicitType === "text") {
    const videoUrl =
      getVideoUrl(content);

    const imageUrl =
      getImageUrl(content);

    if (urlLooksLikeVideo(videoUrl)) {
      return "REELS";
    }

    if (imageUrl || videoUrl) {
      return "IMAGE";
    }
  }

  /*
  |--------------------------------------------------------------------------
  | Direct URL detection
  |--------------------------------------------------------------------------
  */

  const videoUrl =
    getVideoUrl(content);

  if (urlLooksLikeVideo(videoUrl)) {
    return "REELS";
  }

  /*
  |--------------------------------------------------------------------------
  | Default
  |--------------------------------------------------------------------------
  |
  | Instagram publishing requires media.
  | Default to IMAGE because Ask Rae's
  | generated social posts are normally images.
  |
  */

  return "IMAGE";
}

/**
 * Determine whether the payload actually contains media.
 */
function hasMedia(content) {
  return Boolean(
    getImageUrl(content) ||
    getVideoUrl(content)
  );
}

/*
|--------------------------------------------------------------------------
| Instagram Graph API
|--------------------------------------------------------------------------
*/

/**
 * Make a request to the Instagram Graph API.
 */
async function graphRequest({
  method,
  endpoint,
  accessToken,
  params = {},
  data = null,
}) {
  const url =
    `${GRAPH_URL}${endpoint}`;

  const config = {
    method,
    url,

    headers: {
      Authorization:
        `Bearer ${accessToken}`,

      "Content-Type":
        "application/json",
    },

    params,
  };

  if (data) {
    config.data = data;
  }

  try {
    const response =
      await axios(config);

    return response.data;
  } catch (error) {
    const apiError =
      error?.response?.data;

    console.error(
      "Instagram Graph API Error:",
      JSON.stringify(
        apiError ??
          error?.message ??
          error,
        null,
        2
      )
    );

    const message =
      apiError?.error?.message ??
      error?.message ??
      "Instagram Graph API request failed.";

    throw new Error(
      `Instagram API error: ${message}`
    );
  }
}

/*
|--------------------------------------------------------------------------
| Media container
|--------------------------------------------------------------------------
*/

/**
 * Create an Instagram media container.
 */
async function createMediaContainer({
  instagramUserId,
  accessToken,
  content,
}) {
  const mediaType =
    getMediaType(content);

  const caption =
    getCaption(content);

  console.log("=================================");
  console.log(
    "INSTAGRAM MEDIA CONTAINER"
  );
  console.log("=================================");
  console.log(
    "Detected media type:",
    mediaType
  );
  console.log(
    "Caption available:",
    Boolean(caption)
  );

  /*
  |--------------------------------------------------------------------------
  | IMAGE
  |--------------------------------------------------------------------------
  */

  if (mediaType === "IMAGE") {
    const imageUrl =
      getImageUrl(content);

    console.log(
      "Instagram image URL:",
      imageUrl
    );

    if (!imageUrl) {
      throw new Error(
        "Instagram image publishing requires a publicly accessible image URL."
      );
    }

    const params = {
      image_url: imageUrl,
    };

    if (caption) {
      params.caption =
        caption;
    }

    console.log(
      "Creating Instagram image container..."
    );

    const result =
      await graphRequest({
        method: "POST",

        endpoint:
          `/${instagramUserId}/media`,

        accessToken,

        params,
      });

    if (!result.id) {
      throw new Error(
        "Instagram did not return a media container ID."
      );
    }

    console.log(
      "✅ Instagram image container created:",
      result.id
    );

    return result;
  }

  /*
  |--------------------------------------------------------------------------
  | REELS / VIDEO
  |--------------------------------------------------------------------------
  */

  if (mediaType === "REELS") {
    const videoUrl =
      getVideoUrl(content);

    console.log(
      "Instagram video URL:",
      videoUrl
    );

    if (!videoUrl) {
      throw new Error(
        "Instagram Reel publishing requires a publicly accessible video URL."
      );
    }

    const params = {
      media_type: "REELS",

      video_url: videoUrl,

      share_to_feed:
        content?.shareToFeed ??
        content?.share_to_feed ??
        true,
    };

    if (caption) {
      params.caption =
        caption;
    }

    console.log(
      "Creating Instagram Reel container..."
    );

    const result =
      await graphRequest({
        method: "POST",

        endpoint:
          `/${instagramUserId}/media`,

        accessToken,

        params,
      });

    if (!result.id) {
      throw new Error(
        "Instagram did not return a Reel container ID."
      );
    }

    console.log(
      "✅ Instagram Reel container created:",
      result.id
    );

    return result;
  }

  /*
  |--------------------------------------------------------------------------
  | CAROUSEL
  |--------------------------------------------------------------------------
  |
  | Carousel publishing requires multiple child
  | containers and is intentionally not handled
  | by this publisher yet.
  |
  */

  if (mediaType === "CAROUSEL") {
    throw new Error(
      "Instagram carousel publishing is not currently supported."
    );
  }

  throw new Error(
    `Instagram media type "${mediaType}" is not currently supported by this publisher.`
  );
}

/*
|--------------------------------------------------------------------------
| Container status
|--------------------------------------------------------------------------
*/

/**
 * Check the status of an Instagram media container.
 */
async function getContainerStatus({
  containerId,
  accessToken,
}) {
  return await graphRequest({
    method: "GET",

    endpoint:
      `/${containerId}`,

    accessToken,

    params: {
      fields:
        "status_code,status",
    },
  });
}

/**
 * Wait until Instagram finishes processing
 * a media container.
 */
async function waitForContainer({
  containerId,
  accessToken,
}) {
  for (
    let attempt = 1;
    attempt <=
      CONTAINER_MAX_ATTEMPTS;
    attempt++
  ) {
    const status =
      await getContainerStatus({
        containerId,
        accessToken,
      });

    console.log(
      `Instagram container status (${attempt}/${CONTAINER_MAX_ATTEMPTS}):`,
      status
    );

    const statusCode =
      status.status_code;

    /*
    |--------------------------------------------------------------------------
    | Ready
    |--------------------------------------------------------------------------
    */

    if (
      statusCode === "FINISHED"
    ) {
      return status;
    }

    /*
    |--------------------------------------------------------------------------
    | Failed
    |--------------------------------------------------------------------------
    */

    if (
      statusCode === "ERROR" ||
      statusCode === "EXPIRED"
    ) {
      throw new Error(
        `Instagram media processing failed: ${
          status.status ??
          statusCode
        }`
      );
    }

    /*
    |--------------------------------------------------------------------------
    | Still processing
    |--------------------------------------------------------------------------
    */

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          CONTAINER_POLL_INTERVAL
        )
    );
  }

  throw new Error(
    "Instagram media container did not finish processing within the allowed time."
  );
}

/*
|--------------------------------------------------------------------------
| Publish media container
|--------------------------------------------------------------------------
*/

/**
 * Publish an Instagram media container.
 */
async function publishMediaContainer({
  instagramUserId,
  accessToken,
  containerId,
}) {
  console.log(
    "Publishing Instagram media container:",
    containerId
  );

  const result =
    await graphRequest({
      method: "POST",

      endpoint:
        `/${instagramUserId}/media_publish`,

      accessToken,

      params: {
        creation_id:
          containerId,
      },
    });

  if (!result.id) {
    throw new Error(
      "Instagram did not return a published media ID."
    );
  }

  console.log(
    "✅ Instagram media published:",
    result.id
  );

  return result;
}

/*
|--------------------------------------------------------------------------
| Public publisher
|--------------------------------------------------------------------------
*/

/**
 * Publish content to Instagram.
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
  console.log("=================================");
  console.log(
    "INSTAGRAM PUBLISHER"
  );
  console.log("=================================");

  /*
  |--------------------------------------------------------------------------
  | Validate input
  |--------------------------------------------------------------------------
  */

  if (!accessToken) {
    throw new Error(
      "Instagram access token is missing."
    );
  }

  if (!targetId) {
    throw new Error(
      "Instagram publishing target ID is missing."
    );
  }

  if (!content) {
    throw new Error(
      "Instagram content is missing."
    );
  }

  console.log(
    "Instagram User ID:",
    targetId
  );

  console.log(
    "Original content type:",
    content.type ??
      content.mediaType ??
      content.media_type ??
      "unknown"
  );

  /*
  |--------------------------------------------------------------------------
  | Inspect payload
  |--------------------------------------------------------------------------
  */

  const imageUrl =
    getImageUrl(content);

  const videoUrl =
    getVideoUrl(content);

  const mediaType =
    getMediaType(content);

  console.log(
    "Instagram detected media type:",
    mediaType
  );

  console.log(
    "Instagram image URL:",
    imageUrl
  );

  console.log(
    "Instagram video URL:",
    videoUrl
  );

  console.log(
    "Instagram payload contains media:",
    hasMedia(content)
  );

  /*
  |--------------------------------------------------------------------------
  | Prevent accidental text-only publishing
  |--------------------------------------------------------------------------
  |
  | Instagram's publishing flow here is media-based.
  | If the app sends a pure text post, fail with a
  | clear message instead of generating a confusing
  | "image URL required" error.
  |
  */

  if (
    !hasMedia(content)
  ) {
    throw new Error(
      "Instagram publishing requires an image or video URL. The current content payload does not contain publicly accessible media."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Step 1: Create media container
  |--------------------------------------------------------------------------
  */

  console.log(
    "Step 1: Creating Instagram media container..."
  );

  const container =
    await createMediaContainer({
      instagramUserId:
        targetId,

      accessToken,

      content,
    });

  const containerId =
    container.id;

  /*
  |--------------------------------------------------------------------------
  | Step 2: Wait for media processing
  |--------------------------------------------------------------------------
  |
  | Instagram requires media containers to be ready
  | before publishing. This is particularly important
  | for video/Reels.
  |
  */

  console.log(
    "Step 2: Checking Instagram media container..."
  );

  await waitForContainer({
    containerId,

    accessToken,
  });

  console.log(
    "✅ Instagram media container is ready."
  );

  /*
  |--------------------------------------------------------------------------
  | Step 3: Publish media container
  |--------------------------------------------------------------------------
  */

  console.log(
    "Step 3: Publishing Instagram media..."
  );

  const published =
    await publishMediaContainer({
      instagramUserId:
        targetId,

      accessToken,

      containerId,
    });

  /*
  |--------------------------------------------------------------------------
  | Final result
  |--------------------------------------------------------------------------
  */

  console.log("=================================");
  console.log(
    "✅ INSTAGRAM PUBLISH SUCCESSFUL"
  );
  console.log(
    "Instagram Media ID:",
    published.id
  );
  console.log("=================================");

  return {
    success: true,

    platform:
      "instagram",

    instagramUserId:
      targetId,

    containerId,

    mediaId:
      published.id,

    raw:
      published,
  };
}