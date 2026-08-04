/*
|--------------------------------------------------------------------------
| TikTok Provider
|--------------------------------------------------------------------------
|
| TikTok provider implementation.
|
*/

import * as oauth from "./oauth.js";
import { publish } from "./publish.js";
import { getProfile } from "./profile.js";

const TikTokProvider = {
  oauth,
  publish,
  getProfile,

  async disconnect() {
    throw new Error("Not implemented.");
  },

  async revoke() {
    throw new Error("Not implemented.");
  },
};

export default TikTokProvider;