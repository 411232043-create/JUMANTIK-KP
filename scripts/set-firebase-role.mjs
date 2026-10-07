import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const [uid, role, regionId, rwId, kelurahan] = process.argv.slice(2);
const allowedRoles = ["KADER", "KETUA_RW", "ADMIN_KELURAHAN", "WARGA"];

if (!uid || !allowedRoles.includes(role)) {
  console.error("Usage: node scripts/set-firebase-role.mjs <uid> <KADER|KETUA_RW|ADMIN_KELURAHAN|WARGA> [regionId] [rwId]");
  process.exit(1);
}
if (role === "KETUA_RW" && !rwId) {
  throw new Error("Role KETUA_RW wajib memiliki rwId.");
}
if ((role === "KADER" || role === "WARGA") && !regionId) {
  throw new Error(`Role ${role} wajib memiliki regionId.`);
}

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
if (!projectId || !clientEmail || !privateKey) {
  throw new Error("Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY.");
}

const app = getApps()[0] ?? initializeApp({
  credential: cert({ projectId, clientEmail, privateKey }),
  projectId
});
const claims = { role, ...(regionId ? { regionId } : {}), ...(rwId ? { rwId } : {}) };
const auth = getAuth(app);
const user = await auth.getUser(uid);
await auth.setCustomUserClaims(uid, claims);
await getFirestore(app).collection("users").doc(uid).set({
  uid,
  displayName: user.displayName ?? user.email ?? uid,
  email: user.email ?? null,
  role,
  ...(regionId ? { regionId } : {}),
  ...(rwId ? { rwId } : {}),
  ...(kelurahan ? { kelurahan } : {}),
  provisionedAt: FieldValue.serverTimestamp()
}, { merge: true });
console.log(`Role ${role} berhasil dipasang untuk akun ${user.email ?? uid}. Akun perlu login ulang.`);
