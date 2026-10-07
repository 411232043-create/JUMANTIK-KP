import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [uid, role, regionId, rwId] = process.argv.slice(2);
const allowedRoles = ["KADER", "KETUA_RW", "ADMIN_KELURAHAN", "WARGA"];

if (!uid || !allowedRoles.includes(role)) {
  console.error("Usage: node scripts/set-firebase-role.mjs <uid> <KADER|KETUA_RW|ADMIN_KELURAHAN|WARGA> [regionId] [rwId]");
  process.exit(1);
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
await getAuth(app).setCustomUserClaims(uid, claims);
console.log(`Role ${role} berhasil dipasang untuk UID ${uid}. User perlu login ulang agar token diperbarui.`);
