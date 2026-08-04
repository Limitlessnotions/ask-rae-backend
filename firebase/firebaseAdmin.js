import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { readFileSync, existsSync } from "fs";
import path from "path";

let serviceAccount;

// Render Secret File
const renderSecretPath = "/etc/secrets/serviceAccountKey.json";

// Local Development Secret File
const localSecretPath = path.resolve(
  "./firebase/serviceAccountKey.json"
);

if (existsSync(renderSecretPath)) {
  console.log("✅ Using Render Firebase credentials");

  serviceAccount = JSON.parse(
    readFileSync(renderSecretPath, "utf8")
  );

} else if (existsSync(localSecretPath)) {
  console.log("✅ Using Local Firebase credentials");

  serviceAccount = JSON.parse(
    readFileSync(localSecretPath, "utf8")
  );

} else {
  throw new Error(
    "Firebase serviceAccountKey.json not found."
  );
}

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export const db = getFirestore();
export const auth = getAuth();