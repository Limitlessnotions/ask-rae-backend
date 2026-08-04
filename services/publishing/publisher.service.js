/*
|--------------------------------------------------------------------------
| Universal Publisher Engine
|--------------------------------------------------------------------------
|
| This service is responsible for publishing content to any platform.
| It finds the correct provider and delegates the work.
|
*/

import providers from "../providers/index.js";

export async function publish({
  platform,
  accessToken,
  targetId,
  content,
}) {

  console.log("=================================");
  console.log("Publisher Engine");
  console.log("Platform:", platform);

  const provider = providers[platform];

  console.log("Provider Found:", !!provider);
  console.log("=================================");

  if (!provider) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  return await provider.publish({
    accessToken,
    targetId,
    content,
  });
}