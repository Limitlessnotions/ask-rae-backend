/*
|--------------------------------------------------------------------------
| Facebook Profile Provider
|--------------------------------------------------------------------------
|
| Responsible for retrieving Facebook account information.
|
*/

import { getFacebookProfile } from "../../facebook.service.js";

export async function getProfile(accessToken) {
  return await getFacebookProfile(accessToken);
}