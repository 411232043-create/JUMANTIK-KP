"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, LoaderCircle, MapPin, ShieldCheck, X } from "lucide-react";
import { FirestoreRecord, loadJumantikData, UserScope } from "@/lib/jumantik-firestore";
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

type Props = {
  open: boolean;
  onClose: () => void;
  scope: UserScope;
  onSaved: () => void;
};

export default function ReportCapture({ open, onClose, scope, onSaved }: Props) {
  const [regions, setRegions] = useState<FirestoreRecord[]>([]);
  const [regionId, setRegionId] = useState(scope.regionId ?? "");
  const [date, setDate] = useState(todayLocal);
  const [counts, setCounts] = useState<Record<string, { checked: number; positive: number }>>(
    Object.fromEntries(categories.map(([key]) => [key, { checked: 0, positive: 0 }]))
  );
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number }>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [regionsLoading, setRegionsLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadJumantikData("regions", scope).then((result) => {
      if (!cancelled) {
        setRegions(result);
        if (!scope.regionId && result.length === 1) setRegionId(result[0].id);
      }
    }).catch((error: unknown) => {
      if (!cancelled) setMessage(error instanceof Error ? error.message : "Gagal mengambil daftar wilayah.");
    }).finally(() => {
      if (!cancelled) setRegionsLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, scope]);

  const totals = useMemo(() => {
    const checked = Object.values(counts).reduce((sum, value) => sum + value.checked, 0);
    const positive = Object.values(counts).reduce((sum, value) => sum + value.positive, 0);
    return {
      checked,
      positive,
      negative: checked - positive,
      abj: checked ? ((checked - positive) / checked) * 100 : 0
    };
  }, [counts]);

  if (!open) return null;

  function requestLocation() {
    if (!navigator.geolocation) {
      setMessage("Perangkat ini tidak mendukung geotagging.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setMessage("Koordinat lokasi berhasil direkam.");
      },
      (error) => setMessage(`Lokasi tidak dapat diambil: ${error.message}`),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submitReport() {
    if (!regionId) {
      setMessage("Pilih wilayah pemeriksaan.");
      return;
    }
    if (totals.checked < 1) {
      setMessage("Masukkan minimal satu lokasi yang diperiksa.");
      return;
    }
    const invalid = Object.entries(counts).find(([, value]) =>
      !Number.isSafeInteger(value.checked) ||
      !Number.isSafeInteger(value.positive) ||
      value.checked < 0 ||
      value.positive < 0 ||
      value.positive > value.checked
    );
    if (invalid) {
      setMessage("Jumlah jentik positif tidak boleh melebihi jumlah lokasi diperiksa.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const report: OfflineReport = {
        localId: crypto.randomUUID(),
        regionId,
        weekNumber: getWeekNumber(new Date(`${date}T12:00:00`)),
        date: new Date(`${date}T12:00:00`).toISOString(),
        categories: counts,
        capturedAt: new Date().toISOString(),
        ...(coordinates ? { coordinates } : {})
      };
      await saveOfflineReport(report);
      window.dispatchEvent(new Event("jumantik:sync"));
      setMessage("Laporan masuk antrean. Sinkronisasi akan berjalan saat koneksi Firestore tersedia.");
      setCounts(Object.fromEntries(categories.map(([key]) => [key, { checked: 0, positive: 0 }])));
      onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Gagal menyimpan laporan offline.");
    } finally {
      setBusy(false);
    }
  }

  const canSelectAnyRegion = scope.role === "ADMIN_KELURAHAN" || scope.role === "KETUA_RW";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="report-title" className="max-h-[94dvh] w-full max-w-[620px] overflow-y-auto rounded-t-[26px] border border-white/80 bg-[#f8fbf9] p-5 shadow-[0_30px_90px_rgba(5,45,32,.28)] sm:rounded-[26px] sm:p-7">
        <header className="flex items-start justify-between gap-4">
          <div><span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[1px] text-emerald-800"><ShieldCheck size={12} /> Laporan digital</span><h2 id="report-title" className="font-display mt-2 text-xl font-extrabold tracking-[-.5px] text-slate-800">Pemeriksaan jentik</h2><p className="mt-1 text-xs text-slate-500">Laporan disimpan di perangkat dan Firestore menyinkron saat online.</p></div>
          <button type="button" onClick={onClose} aria-label="Tutup form" className="rounded-xl bg-white p-2 text-slate-500 shadow-sm"><X size={18} /></button>
        </header>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_170px]">
          <label className="text-[10px] font-bold text-slate-600">Wilayah pemeriksaan
            {canSelectAnyRegion ? <select value={regionId} disabled={regionsLoading} onChange={(event) => setRegionId(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-emerald-400">
              <option value="">{regionsLoading ? "Memuat wilayah..." : "Pilih RT / wilayah"}</option>
              {regions.map((region) => <option key={region.id} value={region.id}>{`RT ${String(region.rt ?? "")} · RW ${String(region.rw ?? "")} · ${String(region.kelurahan ?? "")}`}</option>)}
            </select> : <input readOnly value={regions[0] ? `RT ${String(regions[0].rt ?? "")} · RW ${String(regions[0].rw ?? "")}` : "Wilayah belum terdaftar"} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium" />}
          </label>
          <label className="text-[10px] font-bold text-slate-600">Tanggal pemeriksaan
            <input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium outline-none focus:border-emerald-400" />
          </label>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-emerald-100/80 bg-white">
          <div className="grid grid-cols-[1fr_70px_70px] border-b border-slate-100 bg-emerald-50/60 px-3 py-2.5 text-[9px] font-bold uppercase tracking-wide text-slate-500 sm:grid-cols-[1fr_100px_100px] sm:px-4"><span>Kategori lokasi</span><span className="text-center">Diperiksa</span><span className="text-center">Jentik +</span></div>
          {categories.map(([key, label]) => <div key={key} className="grid grid-cols-[1fr_70px_70px] items-center border-b border-slate-50 px-3 py-2.5 last:border-0 sm:grid-cols-[1fr_100px_100px] sm:px-4">
            <span className="text-[10px] font-semibold text-slate-600">{label}</span>
            {(["checked", "positive"] as const).map((field) => <input key={field} aria-label={`${label} ${field === "checked" ? "diperiksa" : "jentik positif"}`} type="number" min="0" value={counts[key][field]} onChange={(event) => {
              const value = Math.max(0, Number(event.target.value) || 0);
              setCounts((previous) => {
                const next = { ...previous, [key]: { ...previous[key], [field]: value } };
                if (next[key].positive > next[key].checked) next[key].checked = value;
                return next;
              });
            }} className="mx-auto w-14 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-xs font-semibold outline-none focus:border-emerald-500 sm:w-16" />)}
          </div>)}
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {[["Total diperiksa", totals.checked], ["Jentik positif", totals.positive], ["ABJ", `${totals.abj.toFixed(1).replace(".", ",")}%`]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-white bg-gradient-to-br from-white to-emerald-50/80 p-3 shadow-[0_6px_18px_rgba(8,118,83,.06)]"><p className="text-[9px] font-semibold text-slate-500">{label}</p><p className="font-display mt-1 text-base font-extrabold text-emerald-800">{value}</p></div>)}
        </div>

        <button type="button" onClick={requestLocation} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-2.5 text-[10px] font-bold text-emerald-800 shadow-sm"><MapPin size={14} />{coordinates ? `${coordinates.latitude.toFixed(5)}, ${coordinates.longitude.toFixed(5)}` : "Tambahkan lokasi GPS (opsional)"}</button>
        {message && <p role="status" className="mt-3 rounded-xl bg-slate-100 p-3 text-[10px] leading-relaxed text-slate-700">{message}</p>}
        <footer className="mt-4 flex flex-col-reverse gap-2 pb-[env(safe-area-inset-bottom)] sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600">Tutup</button>
          <button type="button" onClick={() => void submitReport()} disabled={busy || regionsLoading || regions.length === 0} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 px-5 py-3 text-xs font-bold text-white shadow-[0_8px_18px_rgba(5,150,105,.22)] disabled:opacity-60">{busy ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />}Simpan pemeriksaan</button>
        </footer>
      </section>
    </div>
  );
}
