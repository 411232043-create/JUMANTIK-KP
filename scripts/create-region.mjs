import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const [regionId, kelurahan, kecamatan, rw, rt, latitude, longitude, address = ""] = process.argv.slice(2);
if (!regionId || !kelurahan || !kecamatan || !rw || !rt) {
  console.error("Usage: node scripts/create-region.mjs <regionId> <kelurahan> <kecamatan> <rw> <rt> [latitude] [longitude] [alamat]");
  process.exit(1);
}
if ((latitude && !longitude) || (!latitude && longitude)) {
  throw new Error("Latitude dan longitude harus diisi berpasangan.");
}
const coordinates = latitude && longitude
  ? { latitude: Number(latitude), longitude: Number(longitude) }
  : undefined;
if (coordinates && (
  !Number.isFinite(coordinates.latitude) ||
  coordinates.latitude < -90 ||
  coordinates.latitude > 90 ||
  !Number.isFinite(coordinates.longitude) ||
  coordinates.longitude < -180 ||
  coordinates.longitude > 180
)) throw new Error("Koordinat geografis tidak valid.");

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
const rwId = `${kelurahan.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-rw-${rw}`;
const region = {
  kelurahan: kelurahan.trim(),
  kecamatan: kecamatan.trim(),
  rw: rw.trim(),
  rt: rt.trim(),
  rwId,
  ...(address ? { address: address.trim() } : {}),
  ...(coordinates ? { center: coordinates } : {}),
  active: true,
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp()
};
await getFirestore(app).collection("regions").doc(regionId).set(region, { merge: false });
console.log(`Wilayah RT ${rt} RW ${rw} berhasil dibuat. rwId untuk klaim Ketua RW: ${rwId}`);
