"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { Check, LoaderCircle, MapPin, ShieldCheck, X } from "lucide-react";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase-client";
import { OfflineReport, saveOfflineReport } from "@/lib/offline-reports";

const categories = [
  ["permukiman", "Permukiman"],
  ["institusi", "Institusi pendidikan"],
  ["tempatKerja", "Tempat kerja / kantor"],
  ["ttu", "Tempat-tempat umum"],
  ["tpm", "Pengolahan makanan"],
  ["sarana", "Olahraga & kesehatan"]
] as const;

function getWeekNumber(date: Date) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  return Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function todayLocal() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

type Props = { open: boolean; onClose: () => void };

export default function ReportCapture({ open, onClose }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regionId, setRegionId] = useState("");
  const [date, setDate] = useState(todayLocal);
  const [counts, setCounts] = useState<Record<string, { checked: number; positive: number }>>(
    Object.fromEntries(categories.map(([key]) => [key, { checked: 0, positive: 0 }]))
  );
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number }>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [firebaseReady] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!open || !firebaseReady) return;
    return onAuthStateChanged(getFirebaseAuth(), setUser);
  }, [firebaseReady, open]);

  const totals = useMemo(() => {
    const checked = Object.values(counts).reduce((sum, value) => sum + value.checked, 0);
    const positive = Object.values(counts).reduce((sum, value) => sum + value.positive, 0);
    return { checked, positive, negative: checked - positive, abj: checked ? ((checked - positive) / checked) * 100 : 0 };
  }, [counts]);

  if (!open) return null;

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
      setPassword("");
      window.dispatchEvent(new Event("jumantik:sync"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login Firebase gagal.");
    } finally {
      setBusy(false);
    }
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setMessage("Perangkat ini tidak mendukung geotagging.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setMessage("Koordinat lokasi berhasil direkam.");
      },
      (error) => setMessage(`Lokasi tidak dapat diambil: ${error.message}`),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submitReport() {
    if (!regionId.trim()) {
      setMessage("Masukkan ID wilayah Firestore yang sesuai dengan akses akun.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const report: OfflineReport = {
        localId: crypto.randomUUID(),
        regionId: regionId.trim(),
        weekNumber: getWeekNumber(new Date(`${date}T12:00:00`)),
        date: new Date(`${date}T12:00:00`).toISOString(),
        categories: counts,
        capturedAt: new Date().toISOString(),
        ...(coordinates ? { coordinates } : {})
      };
      await saveOfflineReport(report);
      window.dispatchEvent(new Event("jumantik:sync"));
      setMessage(
        navigator.onLine && user
          ? "Laporan masuk antrean sinkronisasi Firestore."
          : "Laporan disimpan aman di perangkat dan menunggu koneksi/login."
      );
      setCounts(Object.fromEntries(categories.map(([key]) => [key, { checked: 0, positive: 0 }])));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan laporan offline.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="report-title" className="max-h-[94dvh] w-full max-w-[620px] overflow-y-auto rounded-t-[26px] border border-white/80 bg-[#f8fbf9] p-5 shadow-[0_30px_90px_rgba(5,45,32,.28)] sm:rounded-[26px] sm:p-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[1px] text-emerald-800"><ShieldCheck size={12} /> Laporan digital</span>
            <h2 id="report-title" className="font-display mt-2 text-xl font-extrabold tracking-[-.5px] text-slate-800">Pemeriksaan jentik</h2>
            <p className="mt-1 text-xs text-slate-500">Data disimpan offline terlebih dahulu dan tersinkron saat internet tersedia.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup form" className="rounded-xl bg-white p-2 text-slate-500 shadow-sm"><X size={18} /></button>
        </header>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_170px]">
          <label className="text-[10px] font-bold text-slate-600">ID wilayah (regionId)
            <input required value={regionId} onChange={(event) => setRegionId(event.target.value)} placeholder="ID dokumen Region Firestore" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100" />
          </label>
          <label className="text-[10px] font-bold text-slate-600">Tanggal pemeriksaan
            <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-emerald-400" />
          </label>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-100/80 bg-white">
          <div className="grid grid-cols-[1fr_70px_70px] border-b border-slate-100 bg-emerald-50/60 px-3 py-2.5 text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:grid-cols-[1fr_100px_100px] sm:px-4">
            <span>Kategori lokasi</span><span className="text-center">Diperiksa</span><span className="text-center">Jentik +</span>
          </div>
          {categories.map(([key, label]) => (
            <div key={key} className="grid grid-cols-[1fr_70px_70px] items-center border-b border-slate-50 px-3 py-2.5 last:border-0 sm:grid-cols-[1fr_100px_100px] sm:px-4">
              <span className="text-[10px] font-semibold text-slate-600">{label}</span>
              {(["checked", "positive"] as const).map((field) => (
                <input key={field} aria-label={`${label} ${field === "checked" ? "diperiksa" : "jentik positif"}`} type="number" min="0" value={counts[key][field]} onChange={(event) => {
                  const value = Math.max(0, Number(event.target.value) || 0);
                  setCounts((previous) => {
                    const next = { ...previous, [key]: { ...previous[key], [field]: value } };
                    if (next[key].positive > next[key].checked) next[key].checked = value;
                    return next;
                  });
                }} className="mx-auto w-14 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-xs font-semibold outline-none focus:border-emerald-500 sm:w-16" />
              ))}
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[["Total diperiksa", totals.checked], ["Jentik positif", totals.positive], ["ABJ", `${totals.abj.toFixed(1).replace(".", ",")}%`]].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-white bg-gradient-to-br from-white to-emerald-50/80 p-3 shadow-[0_6px_18px_rgba(8,118,83,.06)]">
              <p className="text-[9px] font-semibold text-slate-500">{label}</p>
              <p className="font-display mt-1 text-base font-extrabold text-emerald-800">{value}</p>
            </div>
          ))}
        </div>

        <button type="button" onClick={requestLocation} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-[10px] font-bold text-emerald-800 shadow-sm">
          <MapPin size={14} /> {coordinates ? `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}` : "Tambahkan lokasi GPS (opsional)"}
        </button>

        {!user && firebaseReady && (
          <form onSubmit={signIn} className="mt-4 rounded-2xl border border-slate-200 bg-white p-3.5">
            <p className="mb-2 text-[10px] font-bold text-slate-700">Login Firebase untuk sinkronisasi</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email akun kader" className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-400" />
              <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Kata sandi" className="min-w-0 rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-400" />
              <button disabled={busy} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">Masuk</button>
            </div>
          </form>
        )}
        {user && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2.5 text-[10px] text-emerald-900">
            <span className="flex min-w-0 items-center gap-2"><Check size={14} /><span className="truncate">Login sebagai {user.email}</span></span>
            <button type="button" onClick={() => signOut(getFirebaseAuth())} className="shrink-0 font-bold underline underline-offset-2">Keluar</button>
          </div>
        )}
        {!firebaseReady && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-800">Firebase belum dikonfigurasi. Laporan tetap dapat disimpan offline, tetapi login dan sinkronisasi Firestore baru aktif setelah environment Firebase diisi.</p>}
        {message && <p role="status" className="mt-3 rounded-xl bg-slate-100 p-3 text-[10px] leading-relaxed text-slate-700">{message}</p>}

        <footer className="mt-4 flex flex-col-reverse gap-2 pb-[env(safe-area-inset-bottom)] sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600">Tutup</button>
          <button type="button" onClick={() => void submitReport()} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 px-5 py-3 text-xs font-bold text-white shadow-[0_8px_18px_rgba(5,150,105,.22)] disabled:opacity-60">
            {busy ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}
            Simpan & sinkronkan
          </button>
        </footer>
      </section>
    </div>
  );
}
