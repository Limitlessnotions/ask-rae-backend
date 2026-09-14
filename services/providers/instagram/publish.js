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

/**
 * Extract a caption from the content object.
 */
function getCaption(content) {
  return (
    content.caption ??
    content.text ??
    content.body ??
    ""
  );
}

/**
 * Extract a publicly accessible image URL.
 */
function getImageUrl(content) {
  return (
    content.imageUrl ??
    content.image_url ??
    content.mediaUrl ??
    content.media_url ??
    content.url ??
    null
  );
}

/**
 * Extract a publicly accessible video URL.
 */
function getVideoUrl(content) {
  return (
    content.videoUrl ??
    content.video_url ??
    content.mediaUrl ??
    content.media_url ??
    content.url ??
    null
  );
}

/**
 * Determine the Instagram media type.
 */
function getMediaType(content) {
  const type =
    String(
      content.type ??
      content.mediaType ??
      content.media_type ??
      ""
    ).toLowerCase();

  if (
    type === "reel" ||
    type === "reels" ||
    type === "video"
  ) {
    return "REELS";
  }

  if (
    type === "carousel" ||
    type === "carousel_album"
  ) {
    return "CAROUSEL";
  }

  return "IMAGE";
}

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

  const response =
    await axios(config);

  return response.data;
}

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

  /*
  |--------------------------------------------------------------------------
  | IMAGE
  |--------------------------------------------------------------------------
  */

  if (mediaType === "IMAGE") {
    const imageUrl =
      getImageUrl(content);

    if (!imageUrl) {
      throw new Error(
        "Instagram image publishing requires a publicly accessible image URL."
      );
    }

    const params = {
      image_url: imageUrl,
    };

    if (caption) {
      params.caption = caption;
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

    if (!videoUrl) {
      throw new Error(
        "Instagram Reel publishing requires a publicly accessible video URL."
      );
    }

    const params = {
      media_type: "REELS",

      video_url: videoUrl,

      share_to_feed:
        content.shareToFeed ??
        content.share_to_feed ??
        true,
    };

    if (caption) {
      params.caption = caption;
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

  throw new Error(
    `Instagram media type "${mediaType}" is not currently supported by this publisher.`
  );
}

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
    attempt <= CONTAINER_MAX_ATTEMPTS;
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
  console.log("INSTAGRAM PUBLISHER");
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
    "Content type:",
    content.type ??
      content.mediaType ??
      content.media_type ??
      "IMAGE"
  );

  /*
  |--------------------------------------------------------------------------
  | Step 1: Create media container
  |--------------------------------------------------------------------------
  */

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
  | Instagram requires media containers to be ready before
  | publishing. This is particularly important for video/Reels.
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