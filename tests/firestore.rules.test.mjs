import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where
} from "firebase/firestore";

let environment;
const regionId = "sukamaju-rt01";
const rwId = "sukamaju-rw-04";

before(async () => {
  const rules = await readFile(new URL("../firestore.rules", import.meta.url), "utf8");
  environment = await initializeTestEnvironment({
    projectId: "demo-jumantik-rules",
    firestore: { rules }
  });
});

after(async () => {
  await environment?.cleanup();
});

function validReport(uid, id, region = regionId, rw = rwId) {
  const categories = Object.fromEntries(
    ["permukiman", "institusi", "tempatKerja", "ttu", "tpm", "sarana"].map((name, index) => [
      name,
      { checked: index === 0 ? 10 : 0, positive: index === 0 ? 1 : 0 }
    ])
  );
  return {
    localId: id,
    regionId: region,
    rwId: rw,
    kelurahan: "Sukamaju",
    rt: "01",
    inspectorId: uid,
    inspectorName: "Petugas",
    weekNumber: 1,
    date: Timestamp.now(),
    categories,
    totalChecked: 10,
    totalPositive: 1,
    totalNegative: 9,
    abjScore: 90,
    status: "SUBMITTED",
    coordinates: null,
    capturedAt: new Date().toISOString(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}

test("anonymous users cannot read operational collections", async () => {
  const db = environment.unauthenticatedContext().firestore();
  await assertFails(getDocs(collection(db, "jumantikReports")));
  await assertFails(getDocs(collection(db, "properties")));
});

test("a cadre may submit a valid report only in the assigned RT", async () => {
  const db = environment.authenticatedContext("cadre-1", {
    role: "KADER",
    regionId,
    rwId
  }).firestore();

  await assertSucceeds(setDoc(
    doc(db, "jumantikReports", "report-valid"),
    validReport("cadre-1", "report-valid")
  ));
  await assertFails(setDoc(
    doc(db, "jumantikReports", "report-out-of-scope"),
    validReport("cadre-1", "report-out-of-scope", "other-rt", "other-rw")
  ));
});

test("reports reject totals and category counts that do not reconcile", async () => {
  const db = environment.authenticatedContext("cadre-2", {
    role: "KADER",
    regionId,
    rwId
  }).firestore();
  const invalid = validReport("cadre-2", "report-invalid");
  invalid.totalChecked = 99;

  await assertFails(setDoc(doc(db, "jumantikReports", "report-invalid"), invalid));
});

test("only a resident can read a property linked to their UID", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "properties", "home-owner"), {
      ownerUid: "resident-1",
      regionId,
      rwId,
      ownerName: "Resident One",
      address: "Private address"
    });
    await setDoc(doc(db, "properties", "home-other"), {
      ownerUid: "resident-2",
      regionId,
      rwId,
      ownerName: "Resident Two",
      address: "Private address"
    });
  });

  const resident = environment.authenticatedContext("resident-1", {
    role: "WARGA",
    regionId,
    rwId
  }).firestore();
  await assertSucceeds(getDoc(doc(resident, "properties", "home-owner")));
  await assertFails(getDoc(doc(resident, "properties", "home-other")));
  await assertSucceeds(getDocs(query(
    collection(resident, "properties"),
    where("ownerUid", "==", "resident-1")
  )));
});

test("a RW manager can verify reports in their RW but cannot edit report counts", async () => {
  await environment.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "jumantikReports", "report-to-verify"), validReport("cadre-3", "report-to-verify"));
  });

  const rwManager = environment.authenticatedContext("rw-manager", {
    role: "KETUA_RW",
    rwId
  }).firestore();
  await assertSucceeds(updateDoc(doc(rwManager, "jumantikReports", "report-to-verify"), {
    status: "VERIFIED",
    verifiedBy: "rw-manager",
    verifiedAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  }));
  await assertFails(updateDoc(doc(rwManager, "jumantikReports", "report-to-verify"), {
    totalPositive: 2
  }));
});
