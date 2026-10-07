export type InspectionCounts = {
  checked: number;
  positive: number;
};

export type OfflineReport = {
  localId: string;
  regionId: string;
  weekNumber: number;
  date: string;
  categories: Record<string, InspectionCounts>;
  capturedAt: string;
  coordinates?: { latitude: number; longitude: number };
};

const DATABASE_NAME = "jumantik-offline";
const STORE_NAME = "pending-reports";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME, { keyPath: "localId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Gagal membuka penyimpanan offline."));
  });
}

export async function saveOfflineReport(report: OfflineReport): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(report);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Gagal menyimpan laporan offline."));
  });
  db.close();
}

export async function getPendingReports(): Promise<OfflineReport[]> {
  const db = await openDatabase();
  const reports = await new Promise<OfflineReport[]>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as OfflineReport[]);
    request.onerror = () => reject(request.error ?? new Error("Gagal membaca antrean laporan."));
  });
  db.close();
  return reports;
}

export async function removePendingReport(localId: string): Promise<void> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(localId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Gagal menghapus laporan tersinkron."));
  });
  db.close();
}
