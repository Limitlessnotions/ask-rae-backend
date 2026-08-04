import { db } from "../firebase/firebaseAdmin.js";

/*
|--------------------------------------------------------------------------
| Collection Helpers
|--------------------------------------------------------------------------
*/

function socialAccountRef(uid, platform) {
  return db
    .collection("users")
    .doc(uid)
    .collection("socialAccounts")
    .doc(platform);
}

/*
|--------------------------------------------------------------------------
| Save Social Account
|--------------------------------------------------------------------------
*/

export async function saveSocialAccount({
  uid,
  platform,
  account,
}) {
  await socialAccountRef(uid, platform).set({
    ...account,
    connectedAt: new Date(),
    updatedAt: new Date(),
  });
}

/*
|--------------------------------------------------------------------------
| Get Social Account
|--------------------------------------------------------------------------
*/

export async function getSocialAccount(
  uid,
  platform
) {
  const snapshot = await socialAccountRef(
    uid,
    platform
  ).get();

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data();
}

/*
|--------------------------------------------------------------------------
| Update Social Account
|--------------------------------------------------------------------------
*/

export async function updateSocialAccount({
  uid,
  platform,
  updates,
}) {
  await socialAccountRef(uid, platform).update({
    ...updates,
    updatedAt: new Date(),
  });
}

/*
|--------------------------------------------------------------------------
| Delete Social Account
|--------------------------------------------------------------------------
*/

export async function deleteSocialAccount(
  uid,
  platform
) {
  await socialAccountRef(uid, platform).delete();
}