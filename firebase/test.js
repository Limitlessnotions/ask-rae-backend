import { db } from "./firebaseAdmin.js";

async function test() {
  const snapshot = await db.collection("users").limit(1).get();

  if (snapshot.empty) {
    console.log("No users found.");
    return;
  }

  snapshot.forEach((doc) => {
    console.log("Document ID:", doc.id);
    console.log("Data:");
    console.log(doc.data());
  });
}

test();