/*
|--------------------------------------------------------------------------
| X (Twitter) Provider
|--------------------------------------------------------------------------
|
| X provider implementation.
|
*/

import * as oauth from "./oauth.js";
import { publish } from "./publish.js";
import { getProfile } from "./profile.js";

const XProvider = {
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

export default XProvider;