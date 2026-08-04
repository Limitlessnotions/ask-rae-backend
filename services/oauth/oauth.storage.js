import { db } from "../../firebase/firebaseAdmin.js";

/*
|--------------------------------------------------------------------------
| Firestore References
|--------------------------------------------------------------------------
*/

const oauthCollection = db
  .collection("system")
  .doc("oauth")
  .collection("sessions");

/*
|--------------------------------------------------------------------------
| Save OAuth Session
|--------------------------------------------------------------------------
*/

export async function saveOAuthSession({
  state,
  uid,
  platform,
  codeVerifier = null,
}) {
  console.log("=================================");
  console.log("SAVING OAUTH SESSION");
  console.log({ state, uid, platform });

  await oauthCollection.doc(state).set({
    uid,
    platform,
    state,
    codeVerifier,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  const verify = await oauthCollection.doc(state).get();

  console.log("Saved successfully?", verify.exists);

  if (verify.exists) {
    console.log("Firestore document:");
    console.log(verify.data());
  }

  console.log("=================================");
}
/*
|--------------------------------------------------------------------------
| Get OAuth Session
|--------------------------------------------------------------------------
*/

export async function getOAuthSession(state) {
  console.log("=================================");
  console.log("READING OAUTH SESSION");
  console.log("State:", state);

  const snapshot = await oauthCollection.doc(state).get();

  console.log("Document exists?", snapshot.exists);

  if (snapshot.exists) {
    console.log(snapshot.data());
  }

  console.log("=================================");

  if (!snapshot.exists) {
    return null;
  }

  return snapshot.data();
}

/*
|--------------------------------------------------------------------------
| Delete OAuth Session
|--------------------------------------------------------------------------
*/

export async function deleteOAuthSession(state) {
  await oauthCollection
    .doc(state)
    .delete();
}