"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, WifiOff } from "lucide-react";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { getPendingReports, removePendingReport } from "@/lib/offline-reports";
import { onAuthStateChanged } from "firebase/auth";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function subscribeToConnection(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export default function PwaClient() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const online = useSyncExternalStore(
    subscribeToConnection,
    () => navigator.onLine,
    () => true
  );
  const [installed, setInstalled] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncNotice, setSyncNotice] = useState("");

  useEffect(() => {
    let syncing = false;
    const refreshPendingCount = async () => {
      try {
        setPendingCount((await getPendingReports()).length);
      } catch (error) {
        console.error("Unable to read offline report queue:", error);
      }
    };
    const syncReports = async () => {
      if (!navigator.onLine || syncing) {
        await refreshPendingCount();
        return;
      }
      syncing = true;
      try {
        const auth = getFirebaseAuth();
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const reports = await getPendingReports();
        for (const report of reports) {
          const response = await fetch("/api/reports", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(report)
          });
          if (response.status === 401 || response.status === 403) {
            setSyncNotice("Login atau akses wilayah tidak sesuai; laporan tetap tersimpan.");
            break;
          }
          if (!response.ok) {
            const details = await response.json().catch(() => ({}));
            console.error("Offline report sync failed:", response.status, details);
            setSyncNotice("Sinkronisasi gagal; laporan tetap tersimpan untuk dicoba lagi.");
            break;
          }
          await removePendingReport(report.localId);
          setSyncNotice("");
        }
      } catch (error) {
        if (!(error instanceof Error && error.message.includes("configuration is missing"))) {
          console.error("Offline report sync failed:", error);
        }
      } finally {
        syncing = false;
        await refreshPendingCount();
      }
    };
    const handleSync = () => { void syncReports(); };
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    window.addEventListener("online", handleSync);
    window.addEventListener("jumantik:sync", handleSync);
    let unsubscribeAuth = () => {};
    try {
      unsubscribeAuth = onAuthStateChanged(getFirebaseAuth(), (user) => {
        if (user) void syncReports();
      });
    } catch (error) {
      if (!(error instanceof Error && error.message.includes("configuration is missing"))) {
        console.error("Firebase auth state listener failed:", error);
      }
    }
    void refreshPendingCount();
    void syncReports();

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
        console.error("PWA service worker registration failed:", error);
      });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.removeEventListener("online", handleSync);
      window.removeEventListener("jumantik:sync", handleSync);
      unsubscribeAuth();
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  }

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50 flex flex-col items-end gap-2 sm:right-6">
      {!online && (
        <div role="status" className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white/95 px-3 py-2.5 text-xs font-semibold text-amber-800 shadow-xl backdrop-blur">
          <WifiOff size={15} /> Offline · {pendingCount} laporan tersimpan di perangkat
        </div>
      )}
      {online && pendingCount > 0 && (
        <button onClick={() => window.dispatchEvent(new Event("jumantik:sync"))} className="rounded-xl border border-emerald-100 bg-white/95 px-3 py-2.5 text-xs font-semibold text-emerald-800 shadow-lg">
          {pendingCount} laporan menunggu sinkronisasi
        </button>
      )}
      {online && syncNotice && <p role="status" className="max-w-[280px] rounded-xl border border-amber-200 bg-white/95 px-3 py-2.5 text-right text-[10px] font-semibold text-amber-800 shadow-lg">{syncNotice}</p>}
      {!installed && installPrompt && (
        <button onClick={installApp} className="flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-700 to-emerald-500 px-4 py-3 text-xs font-bold text-white shadow-[0_9px_24px_rgba(5,95,70,.28)] transition hover:-translate-y-0.5">
          <Download size={15} /> Pasang aplikasi
        </button>
      )}
    </div>
  );
}
