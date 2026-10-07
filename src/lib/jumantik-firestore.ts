"use client";

import {
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  limit,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  runTransaction,
  Timestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { FirebaseApp } from "firebase/app";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { OfflineReport } from "@/lib/offline-reports";

export type JumantikRole = "KADER" | "KETUA_RW" | "ADMIN_KELURAHAN" | "WARGA";

export type UserScope = {
  uid: string;
  name: string;
  email: string;
  role: JumantikRole;
  regionId?: string;
  rwId?: string;
  kelurahan?: string;
};

export type FirestoreRecord = Record<string, unknown> & { id: string };

export type InspectionRecord = FirestoreRecord & {
  regionId: string;
  inspectorId: string;
  inspectorName?: string;
  date: string;
  weekNumber: number;
  totalChecked: number;
  totalPositive: number;
  totalNegative: number;
  abjScore: number;
  status: string;
};

export type RegionRecord = FirestoreRecord & {
  kelurahan: string;
  kecamatan: string;
  rw: string;
  rt: string;
  rwId: string;
};

export type CollectionName = "regions" | "jumantikReports" | "properties" | "dbdCases";

let firestoreInstance: ReturnType<typeof getFirestore> | undefined;

function db(app: FirebaseApp = getFirebaseAuth().app) {
  if (!firestoreInstance) {
    if (typeof indexedDB !== "undefined") {
      firestoreInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } else {
      firestoreInstance = getFirestore(app);
    }
  }
  return firestoreInstance;
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeValue(item)])
    );
  }
  return value;
}

function normalizeRecord(id: string, data: DocumentData): FirestoreRecord {
  return { id, ...normalizeValue(data) as Record<string, unknown> };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object" && !(value instanceof Timestamp)) {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  if (value === undefined) return "undefined";
  return JSON.stringify(value);
}

function notifyDataChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("jumantik:data-changed"));
  }
}

function scopeQuery(name: CollectionName, scope: UserScope) {
  const firestore = db();
  const source = collection(firestore, name);
  const constraints = [];
  if (scope.role === "KETUA_RW") {
    if (!scope.rwId) throw new Error("Akun Ketua RW belum memiliki claim rwId.");
    constraints.push(where("rwId", "==", scope.rwId));
  } else if (scope.role !== "ADMIN_KELURAHAN") {
    if (!scope.regionId) throw new Error("Akun ini belum memiliki claim regionId.");
    if (name === "properties" && scope.role === "WARGA") {
      constraints.push(where("ownerUid", "==", scope.uid));
    } else if (name === "jumantikReports" && scope.role === "WARGA") {
      constraints.push(where("inspectorId", "==", scope.uid));
    } else {
      constraints.push(where("regionId", "==", scope.regionId));
    }
  }

  if (name === "jumantikReports") constraints.push(orderBy("date", "desc"));
  if (name === "properties") constraints.push(orderBy("address", "asc"));
  if (name === "dbdCases") constraints.push(orderBy("reportedAt", "desc"));
  if (name === "regions") constraints.push(orderBy("rt", "asc"));
  constraints.push(limit(500));
  return getDocs(query(source, ...constraints)).then((snapshot) =>
    snapshot.docs.map((item) => normalizeRecord(item.id, item.data()))
  );
}

export async function loadJumantikData(
  resource: CollectionName,
  scope: UserScope
): Promise<FirestoreRecord[]> {
  if (resource === "regions" && scope.regionId && scope.role !== "ADMIN_KELURAHAN" && scope.role !== "KETUA_RW") {
    const firestore = db();
    const region = await getDoc(doc(firestore, "regions", scope.regionId));
    return region.exists() ? [normalizeRecord(region.id, region.data())] : [];
  }
  if (resource === "dbdCases" && scope.role !== "ADMIN_KELURAHAN" && scope.role !== "KETUA_RW") {
    return [];
  }
  return scopeQuery(resource, scope);
}

export async function saveOfflineReportToFirestore(
  report: OfflineReport
): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("Login terlebih dahulu sebelum menyinkronkan laporan.");
  const token = await user.getIdTokenResult();
  const role = token.claims.role;

  const firestore = db();
  const regionSnapshot = await getDoc(doc(firestore, "regions", report.regionId));
  if (!regionSnapshot.exists()) {
    throw new Error("Wilayah belum terdaftar di Firestore. Hubungi admin kelurahan.");
  }
  const region = regionSnapshot.data();
  const isAdmin = role === "ADMIN_KELURAHAN";
  const isRwManager = role === "KETUA_RW" && token.claims.rwId === region.rwId;
  if (!isAdmin && !isRwManager && token.claims.regionId !== report.regionId) {
    throw new Error("Wilayah laporan tidak sesuai dengan hak akses akun.");
  }
  const categories = Object.fromEntries(
    ["permukiman", "institusi", "tempatKerja", "ttu", "tpm", "sarana"].map((key) => [
      key,
      report.categories[key] ?? { checked: 0, positive: 0 }
    ])
  );
  const counts = Object.values(categories) as Array<{ checked: number; positive: number }>;
  const totalChecked = counts.reduce((sum, value) => sum + value.checked, 0);
  const totalPositive = counts.reduce((sum, value) => sum + value.positive, 0);
  if (totalChecked < 1 || counts.some((value) =>
    !Number.isSafeInteger(value.checked) ||
    !Number.isSafeInteger(value.positive) ||
    value.checked < 0 ||
    value.positive < 0 ||
    value.positive > value.checked
  )) {
    throw new Error("Isi jumlah rumah diperiksa dan pastikan jentik positif tidak melebihi jumlah diperiksa.");
  }
  const totalNegative = totalChecked - totalPositive;
  const abjScore = Number(((totalNegative / totalChecked) * 100).toFixed(2));
  const reportDate = new Date(report.date);
  if (Number.isNaN(reportDate.getTime())) throw new Error("Tanggal pemeriksaan tidak valid.");

  const reportRef = doc(firestore, "jumantikReports", report.localId);
  const reportData = {
    localId: report.localId,
    regionId: report.regionId,
    rwId: String(region.rwId),
    kelurahan: String(region.kelurahan ?? ""),
    rt: String(region.rt ?? ""),
    inspectorId: user.uid,
    inspectorName: user.displayName ?? user.email ?? user.uid,
    weekNumber: report.weekNumber,
    date: Timestamp.fromDate(reportDate),
    categories,
    totalChecked,
    totalPositive,
    totalNegative,
    abjScore,
    status: "SUBMITTED",
    coordinates: report.coordinates ?? null,
    capturedAt: report.capturedAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
  await runTransaction(firestore, async (transaction) => {
    const existing = await transaction.get(reportRef);
    if (existing.exists()) {
      const stored = existing.data();
      const sameReport = stored.inspectorId === user.uid
        && stored.regionId === report.regionId
        && stored.weekNumber === report.weekNumber
        && stored.date instanceof Timestamp
        && stored.date.toMillis() === reportDate.getTime()
        && canonical(stored.categories) === canonical(categories)
        && canonical(stored.coordinates ?? null) === canonical(report.coordinates ?? null);
      if (sameReport) return;
      throw new Error("ID laporan ini sudah digunakan untuk data pemeriksaan lain.");
    }
    transaction.set(reportRef, reportData);
  });
  notifyDataChanged();
}

export async function updateInspectionStatus(
  reportId: string,
  status: "VERIFIED" | "NEEDS_REVISION",
  uid: string
) {
  const firestore = db();
  await updateDoc(doc(firestore, "jumantikReports", reportId), {
    status,
    verifiedBy: uid,
    verifiedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  notifyDataChanged();
}

export async function createProperty(
  input: {
    qrCode: string;
    type: string;
    ownerName: string;
    address: string;
    regionId: string;
    ownerUid?: string;
  },
  scope: UserScope
) {
  if (scope.role !== "ADMIN_KELURAHAN" && scope.role !== "KETUA_RW") {
    throw new Error("Hanya admin kelurahan atau ketua RW yang dapat mendaftarkan rumah.");
  }
  const firestore = db();
  const regionSnapshot = await getDoc(doc(firestore, "regions", input.regionId));
  if (!regionSnapshot.exists()) throw new Error("Wilayah tidak ditemukan.");
  const region = regionSnapshot.data();
  const propertyId = input.qrCode.trim();
  if (!propertyId) throw new Error("Kode QR wajib diisi.");
  await setDoc(doc(firestore, "properties", propertyId), {
    qrCode: propertyId,
    type: input.type,
    ownerName: input.ownerName.trim(),
    address: input.address.trim(),
    regionId: input.regionId,
    rwId: String(region.rwId),
    kelurahan: String(region.kelurahan ?? ""),
    rt: String(region.rt ?? ""),
    ...(input.ownerUid ? { ownerUid: input.ownerUid } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  notifyDataChanged();
}

export async function createDbdCase(
  input: {
    caseCode: string;
    patientInitials: string;
    regionId: string;
    notes: string;
  },
  scope: UserScope
) {
  if (scope.role !== "ADMIN_KELURAHAN" && scope.role !== "KETUA_RW") {
    throw new Error("Hanya admin kelurahan atau ketua RW yang dapat mencatat kasus DBD.");
  }
  const firestore = db();
  const regionSnapshot = await getDoc(doc(firestore, "regions", input.regionId));
  if (!regionSnapshot.exists()) throw new Error("Wilayah tidak ditemukan.");
  const region = regionSnapshot.data();
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Sesi login sudah berakhir.");
  await setDoc(doc(firestore, "dbdCases", input.caseCode.trim()), {
    caseCode: input.caseCode.trim(),
    patientInitials: input.patientInitials.trim().toUpperCase(),
    regionId: input.regionId,
    rwId: String(region.rwId),
    kelurahan: String(region.kelurahan ?? ""),
    rt: String(region.rt ?? ""),
    reportedAt: Timestamp.now(),
    status: "REPORTED",
    notes: input.notes.trim(),
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  notifyDataChanged();
}

export async function updateDbdCaseStatus(
  caseId: string,
  status: "VERIFIED" | "MONITORING" | "FOGGING_SCHEDULED" | "CLOSED",
  uid: string
) {
  const firestore = db();
  await updateDoc(doc(firestore, "dbdCases", caseId), {
    status,
    verifiedBy: uid,
    verifiedAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  notifyDataChanged();
}
