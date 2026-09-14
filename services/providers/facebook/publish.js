/*
|--------------------------------------------------------------------------
| Facebook Publisher
|--------------------------------------------------------------------------
|
| Publishes content to a Facebook Page.
|
| The actual Facebook Graph API publishing logic is
| handled by the Facebook service.
|
*/

import {
  publishFacebookContent,
} from "../../facebook.service.js";

/**
 * Publish content to Facebook
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
      "Facebook access token is missing."
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Validate Facebook Page
  |--------------------------------------------------------------------------
  */

  if (!targetId) {
    throw new Error(
      "Facebook Page ID is missing."
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
  | Publish
  |--------------------------------------------------------------------------
  */

  console.log("=================================");
  console.log("FACEBOOK PUBLISHER");
  console.log("=================================");

  console.log(
    "Facebook Page ID:",
    targetId
  );

  console.log(
    "Content type:",
    content.type ??
      content.mediaType ??
      "text"
  );

  const result =
    await publishFacebookContent({
      accessToken,

      pageId:
        targetId,

      content,
    });

  console.log(
    "✅ Facebook publishing completed"
  );

  console.log("=================================");

  return result;
}