/*
|--------------------------------------------------------------------------
| Facebook Publisher
|--------------------------------------------------------------------------
|
| Delegates publishing to the Facebook service.
|
*/

import { publishFacebookContent } from "../../facebook.service.js";

/**
 * Publish content to Facebook
 */
export async function publish({
  accessToken,
  targetId,
  content,
}) {
  if (!accessToken) {
    throw new Error(
      "Facebook access token is missing."
    );
  }

  if (!targetId) {
    throw new Error(
      "Facebook Page ID is missing."
    );
  }

  if (!content) {
    throw new Error(
      "Content payload is missing."
    );
  }

  return publishFacebookContent({
    accessToken,
    pageId: targetId,
    content,
  });
}