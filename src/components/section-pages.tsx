"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  Filter,
  Home,
  LoaderCircle,
  MapPin,
  Plus,
  ShieldAlert,
  Users,
  Waves
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CollectionName,
  createDbdCase,
  createProperty,
  FirestoreRecord,
  loadJumantikData,
  RegionRecord,
  updateDbdCaseStatus,
  updateInspectionStatus,
  UserScope
} from "@/lib/jumantik-firestore";

type SectionPagesProps = {
  active: string;
  query: string;
  scope: UserScope;
  onCreateReport: () => void;
  notify: (message: string) => void;
};

const sourceByPage: Record<string, CollectionName> = {
  "Peta Sebaran": "regions",
  "Data Pemeriksaan": "jumantikReports",
  "Data Warga": "properties",
  Rekapitulasi: "jumantikReports",
  "Kasus DBD": "dbdCases"
};

function PageHeading({ eyebrow, title, description, action }: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-[9px] font-bold uppercase tracking-[1.3px] text-emerald-700">{eyebrow}</p><h2 className="font-display mt-1 text-xl font-extrabold tracking-[-.6px] text-[#173a2b] sm:text-2xl">{title}</h2><p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">{description}</p></div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function DataState({ loading, error, empty, children }: {
  loading: boolean;
  error: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  if (loading) return <div role="status" className="soft-card mt-4 flex items-center justify-center gap-2 rounded-2xl p-10 text-xs font-semibold text-emerald-800"><LoaderCircle size={16} className="animate-spin" />Mengambil data Firestore...</div>;
  if (error) return <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs leading-relaxed text-rose-800">Data tidak dapat dimuat: {error}. Periksa rules Firebase dan indeks yang sudah dipublikasikan.</div>;
  if (empty) return <div className="soft-card mt-4 rounded-2xl p-8 text-center"><ClipboardCheck className="mx-auto text-emerald-600" size={22} /><p className="mt-2 text-xs font-bold text-slate-700">Belum ada data untuk ditampilkan</p><p className="mt-1 text-[10px] text-slate-400">Data akan muncul setelah wilayah atau laporan resmi ditambahkan.</p></div>;
  return <>{children}</>;
}

function Metric({ label, value, helper, icon: Icon, tone = "green" }: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Home;
  tone?: "green" | "amber" | "rose" | "blue";
}) {
  const tones = { green: "bg-emerald-50 text-emerald-700", amber: "bg-amber-50 text-amber-700", rose: "bg-rose-50 text-rose-700", blue: "bg-blue-50 text-blue-700" };
  return <article className="soft-card rounded-2xl p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-semibold text-slate-500">{label}</p><span className={`grid h-8 w-8 place-items-center rounded-xl ${tones[tone]}`}><Icon size={16} /></span></div><p className="font-display mt-3 text-2xl font-extrabold tracking-[-1px] text-slate-800">{value}</p><p className="mt-1 text-[10px] text-slate-400">{helper}</p></article>;
}

function numeric(record: FirestoreRecord, key: string) {
  const value = Number(record[key] ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function dateValue(record: FirestoreRecord, key: string) {
  const value = record[key];
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function statusFor(abj: number | null) {
  if (abj === null) return "Belum diperiksa";
  if (abj >= 95) return "Aman";
  if (abj >= 90) return "Waspada";
  return "Bahaya";
}

function displayDate(date: Date | null) {
  return date ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date) : "—";
}

function csvDownload(filename: string, rows: Array<Array<string | number>>) {
  const content = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function SectionPages(props: SectionPagesProps) {
  const [result, setResult] = useState<{ key: string; records?: FirestoreRecord[]; error?: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const requestKey = `${props.active}:${props.scope.uid}:${props.scope.role}:${props.scope.regionId ?? ""}:${props.scope.rwId ?? ""}:${refreshKey}`;

  useEffect(() => {
    let cancelled = false;
    const resource = sourceByPage[props.active];
    if (!resource) return;
    loadJumantikData(resource, props.scope).then((data) => {
      if (!cancelled) setResult({ key: requestKey, records: data });
    }).catch((reason: unknown) => {
      if (!cancelled) setResult({ key: requestKey, error: reason instanceof Error ? reason.message : "Gagal membaca koleksi Firestore." });
    });
    return () => { cancelled = true; };
  }, [props.active, props.scope, refreshKey, requestKey]);

  useEffect(() => {
    const refreshCurrentPage = () => setRefreshKey((current) => current + 1);
    window.addEventListener("jumantik:data-changed", refreshCurrentPage);
    return () => window.removeEventListener("jumantik:data-changed", refreshCurrentPage);
  }, []);

  const loading = result?.key !== requestKey;
  const error = result?.key === requestKey ? result.error ?? "" : "";
  const filtered = useMemo(() => (result?.key === requestKey ? result.records ?? [] : []).filter((record) =>
    JSON.stringify(record).toLowerCase().includes(props.query.toLowerCase())
  ), [props.query, requestKey, result]);

  function refresh() {
    setRefreshKey((current) => current + 1);
  }

  if (props.active === "Peta Sebaran") return <MapPage notify={props.notify} rows={filtered as RegionRecord[]} loading={loading} error={error} />;
  if (props.active === "Data Pemeriksaan") return <InspectionsPage {...props} rows={filtered} loading={loading} error={error} refresh={refresh} />;
  if (props.active === "Data Warga") return <ResidentsPage {...props} rows={filtered} loading={loading} error={error} refresh={refresh} />;
  if (props.active === "Rekapitulasi") return <ReportsPage {...props} rows={filtered} loading={loading} error={error} />;
  if (props.active === "Kasus DBD") return <CasesPage {...props} rows={filtered} loading={loading} error={error} refresh={refresh} />;
  return null;
}

function MapPage({ notify, rows, loading, error }: {
  notify: (message: string) => void;
  rows: RegionRecord[];
  loading: boolean;
  error: string;
}) {
  return <>
    <PageHeading eyebrow="Pemantauan wilayah" title="Peta Sebaran ABJ" description="Kondisi wilayah dibaca dari data master RT yang dapat diakses akun. Tambahkan koordinat centroid wilayah untuk memetakan lokasi sebenarnya." action={<button disabled className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-400"><MapPin size={14} className="mr-1.5 inline" />Koordinat diperlukan</button>} />
    <DataState loading={loading} error={error} empty={!rows.length}>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <section aria-label="Peta wilayah" className="soft-card rounded-[22px] p-4 sm:p-5">
          <div className="flex items-center justify-between"><div><h3 className="font-display text-sm font-extrabold text-slate-800">Wilayah terdaftar</h3><p className="mt-1 text-[10px] text-slate-400">{rows[0]?.kelurahan}, {rows[0]?.kecamatan}</p></div><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-bold text-emerald-700">{rows.length} RT</span></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {rows.map((region) => {
              const center = region.center as { latitude?: number; longitude?: number } | undefined;
              return <article key={region.id} className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-emerald-50/40 p-4">
                <div className="flex items-start justify-between gap-2"><span className="text-[11px] font-extrabold text-slate-700">RT {region.rt} · RW {region.rw}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-500">Terdaftar</span></div>
                <p className="mt-2 text-[10px] text-slate-500">{center && Number.isFinite(center.latitude) && Number.isFinite(center.longitude) ? `${center.latitude}, ${center.longitude}` : "Koordinat wilayah belum diisi"}</p>
                <p className="mt-1 truncate text-[9px] text-slate-400">{String(region.address ?? "Alamat wilayah belum diisi")}</p>
              </article>;
            })}
          </div>
          {!rows.some((region) => region.center) && <p className="mt-4 rounded-xl border border-dashed border-amber-200 bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-800">Heatmap lokasi memerlukan koordinat asli. Peta tidak menampilkan marker contoh atau koordinat rekaan.</p>}
        </section>
        <section className="soft-card rounded-[22px] p-4 sm:p-5"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><MapPin size={16} /></span><div><h3 className="font-display text-sm font-extrabold text-slate-800">Cakupan akun</h3><p className="mt-1 text-[10px] text-slate-400">Daftar wilayah aktual dari Firestore</p></div></div><p className="mt-4 text-3xl font-extrabold text-slate-800">{rows.length}</p><p className="text-[10px] text-slate-400">wilayah RT/RW yang dapat diakses</p><button onClick={() => notify("Tambahkan properti koordinat center pada dokumen regions melalui panel Firebase.")} className="mt-4 text-[10px] font-bold text-emerald-700">Petunjuk koordinat wilayah <span aria-hidden>→</span></button></section>
      </div>
    </DataState>
  </>;
}

function InspectionsPage({ scope, onCreateReport, rows, loading, error, refresh }: SectionPagesProps & {
  rows: FirestoreRecord[];
  loading: boolean;
  error: string;
  refresh: () => void;
}) {
  const [filter, setFilter] = useState("Semua status");
  const visible = rows.filter((item) => filter === "Semua status" || item.status === filter);
  const canVerify = scope.role === "ADMIN_KELURAHAN" || scope.role === "KETUA_RW";
  async function changeStatus(item: FirestoreRecord, status: "VERIFIED" | "NEEDS_REVISION") {
    try {
      await updateInspectionStatus(item.id, status, scope.uid);
      refresh();
    } catch (reason) {
      window.alert(reason instanceof Error ? reason.message : "Perubahan status gagal disimpan.");
    }
  }
  return <>
    <PageHeading eyebrow="Operasional kader" title="Data Pemeriksaan" description="Laporan inspeksi disimpan langsung ke Firestore dan dibatasi sesuai role serta wilayah akun." action={scope.role === "WARGA" ? undefined : <button onClick={onCreateReport} className="rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 px-4 py-3 text-xs font-bold text-white shadow-lg"><Plus size={14} className="mr-1 inline" />Buat pemeriksaan</button>} />
    <DataState loading={loading} error={error} empty={!rows.length}><>
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Total laporan" value={String(rows.length)} helper="Dalam cakupan akun" icon={ClipboardCheck} />
        <Metric label="Menunggu verifikasi" value={String(rows.filter((row) => row.status === "SUBMITTED").length)} helper="Perlu ditinjau pengurus" icon={Activity} tone="amber" />
        <Metric label="Terverifikasi" value={String(rows.filter((row) => row.status === "VERIFIED").length)} helper="Laporan disahkan" icon={CheckCircle2} tone="blue" />
        <Metric label="Perlu revisi" value={String(rows.filter((row) => row.status === "NEEDS_REVISION").length)} helper="Kader perlu tindak lanjut" icon={AlertTriangle} tone="rose" />
      </div>
      <section className="soft-card mt-4 overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:px-5"><div><h3 className="font-display text-sm font-extrabold text-slate-800">Riwayat laporan kader</h3><p className="mt-1 text-[10px] text-slate-400">Laporan aktual · pilih filter status untuk peninjauan.</p></div><label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] text-slate-500"><Filter size={13} /><select value={filter} onChange={(event) => setFilter(event.target.value)} className="max-w-[155px] bg-transparent outline-none"><option>Semua status</option><option value="SUBMITTED">SUBMITTED</option><option value="VERIFIED">VERIFIED</option><option value="NEEDS_REVISION">NEEDS_REVISION</option></select></label></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="bg-slate-50/70 text-[9px] font-bold uppercase tracking-wide text-slate-400"><th className="px-5 py-3">Tanggal / Minggu</th><th className="px-3 py-3">Petugas</th><th className="px-3 py-3">RT/RW</th><th className="px-3 py-3">Diperiksa</th><th className="px-3 py-3">Jentik +</th><th className="px-3 py-3">ABJ</th><th className="px-5 py-3">Status / aksi</th></tr></thead><tbody>{visible.map((row) => <tr key={row.id} className="border-t border-slate-50 text-[10px]">
          <td className="px-5 py-3.5"><p className="font-bold text-slate-700">{displayDate(dateValue(row, "date"))}</p><p className="mt-1 text-slate-400">Minggu {String(row.weekNumber ?? "—")}</p></td><td className="px-3 py-3.5 text-slate-600">{String(row.inspectorName ?? "Petugas")}</td><td className="px-3 py-3.5 text-slate-500">RT {String(row.rt ?? "—")} · RW {String(row.rwId ?? "—")}</td><td className="px-3 py-3.5">{numeric(row, "totalChecked")}</td><td className="px-3 py-3.5 font-bold text-rose-600">{numeric(row, "totalPositive")}</td><td className="px-3 py-3.5 font-extrabold text-emerald-700">{numeric(row, "abjScore").toFixed(1)}%</td><td className="px-5 py-3.5"><span className="font-bold text-slate-600">{String(row.status ?? "—")}</span>{canVerify && row.status === "SUBMITTED" && <div className="mt-2 flex gap-1"><button onClick={() => void changeStatus(row, "VERIFIED")} className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">Verifikasi</button><button onClick={() => void changeStatus(row, "NEEDS_REVISION")} className="rounded-md bg-rose-50 px-2 py-1 text-[9px] font-bold text-rose-700">Revisi</button></div>}</td>
        </tr>)}</tbody></table></div>
      </section>
    </></DataState>
  </>;
}

function ResidentsPage({ query, scope, notify, rows, loading, error, refresh }: SectionPagesProps & {
  rows: FirestoreRecord[];
  loading: boolean;
  error: string;
  refresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setFormError("");
    try {
      await createProperty({
        qrCode: crypto.randomUUID(),
        type: "PERMUKIMAN",
        ownerName: String(form.get("ownerName")),
        address: String(form.get("address")),
        regionId: String(form.get("regionId")),
        ownerUid: String(form.get("ownerUid") ?? "").trim() || undefined
      }, scope);
      setOpen(false);
      refresh();
      notify("Rumah berhasil didaftarkan.");
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Gagal menyimpan data rumah.");
    } finally {
      setSaving(false);
    }
  }
  const canAdd = scope.role === "ADMIN_KELURAHAN" || scope.role === "KETUA_RW";
  const visible = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()));
  return <>
    <PageHeading eyebrow="Basis data lingkungan" title="Data Warga & Rumah" description="Daftar rumah yang benar-benar terdaftar dan menjadi sasaran kunjungan kader." action={canAdd ? <button onClick={() => setOpen(true)} className="rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 px-4 py-3 text-xs font-bold text-white shadow-lg"><Plus size={14} className="mr-1 inline" />Tambah rumah</button> : undefined} />
    <DataState loading={loading} error={error} empty={!rows.length}><>
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-3"><Metric label="Rumah terdaftar" value={String(rows.length)} helper="Dalam cakupan akun" icon={Home} /><Metric label="Dengan koordinat" value={String(rows.filter((row) => row.coordinates).length)} helper="Siap dipetakan" icon={MapPin} tone="blue" /><Metric label="Jenis properti" value={new Set(rows.map((row) => String(row.type ?? "Lainnya"))).size.toString()} helper="Berdasarkan master lokasi" icon={Users} /></div>
      <section className="soft-card mt-4 overflow-hidden rounded-2xl"><div className="border-b border-slate-100 p-4 sm:px-5"><h3 className="font-display text-sm font-extrabold text-slate-800">Master sasaran kunjungan</h3><p className="mt-1 text-[10px] text-slate-400">Data identitas hanya terlihat oleh petugas sesuai wilayah dan hak aksesnya.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left"><thead><tr className="bg-slate-50/70 text-[9px] font-bold uppercase tracking-wide text-slate-400"><th className="px-5 py-3">Kepala keluarga</th><th className="px-3 py-3">Alamat</th><th className="px-3 py-3">RT/RW</th><th className="px-3 py-3">QR code</th><th className="px-5 py-3">Jenis lokasi</th></tr></thead><tbody>{visible.map((row) => <tr key={row.id} className="border-t border-slate-50 text-[10px]"><td className="px-5 py-3.5 font-bold text-slate-700">{String(row.ownerName ?? "—")}</td><td className="px-3 py-3.5 text-slate-500">{String(row.address ?? "—")}</td><td className="px-3 py-3.5 text-slate-500">RT {String(row.rt ?? "—")} · RW {String(row.rwId ?? "—")}</td><td className="px-3 py-3.5 font-mono text-[9px] text-slate-500">{String(row.qrCode ?? row.id)}</td><td className="px-5 py-3.5 text-slate-500">{String(row.type ?? "PERMUKIMAN")}</td></tr>)}</tbody></table>{!visible.length && <p className="p-6 text-center text-xs text-slate-400">Rumah tidak ditemukan.</p>}</div>
      </section>
    </></DataState>
    {open && <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/40 p-4"><form onSubmit={submit} className="soft-card w-full max-w-md rounded-2xl p-5"><div className="flex justify-between"><h3 className="font-display font-extrabold text-slate-800">Daftarkan rumah</h3><button type="button" onClick={() => setOpen(false)} aria-label="Tutup form">×</button></div><label className="mt-4 block text-[10px] font-bold text-slate-600">ID wilayah Firestore<input name="regionId" required defaultValue={scope.regionId} placeholder="ID dokumen RT" className="mt-1 w-full rounded-lg border p-2.5 text-xs" /></label><label className="mt-3 block text-[10px] font-bold text-slate-600">Nama kepala keluarga<input name="ownerName" required maxLength={100} className="mt-1 w-full rounded-lg border p-2.5 text-xs" /></label><label className="mt-3 block text-[10px] font-bold text-slate-600">Alamat<input name="address" required maxLength={200} className="mt-1 w-full rounded-lg border p-2.5 text-xs" /></label><label className="mt-3 block text-[10px] font-bold text-slate-600">UID akun warga (opsional)<input name="ownerUid" maxLength={128} placeholder="UID Firebase warga agar dapat melihat rumah sendiri" className="mt-1 w-full rounded-lg border p-2.5 text-xs" /></label>{formError && <p role="alert" className="mt-3 text-xs text-rose-700">{formError}</p>}<button disabled={saving} className="mt-4 w-full rounded-lg bg-emerald-700 px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan rumah"}</button></form></div>}
  </>;
}

function ReportsPage({ query, rows, loading, error }: SectionPagesProps & {
  rows: FirestoreRecord[];
  loading: boolean;
  error: string;
}) {
  const groups = new Map<string, FirestoreRecord[]>();
  for (const report of rows) {
    const key = String(report.regionId ?? "");
    groups.set(key, [...(groups.get(key) ?? []), report]);
  }
  const aggregates = [...groups.entries()].map(([id, reports]) => {
    const checked = reports.reduce((sum, report) => sum + numeric(report, "totalChecked"), 0);
    const positive = reports.reduce((sum, report) => sum + numeric(report, "totalPositive"), 0);
    const negative = reports.reduce((sum, report) => sum + numeric(report, "totalNegative"), 0);
    const first = reports[0];
    const score = checked ? negative / checked * 100 : 0;
    return { id, reports, checked, positive, score, label: `RT ${String(first.rt ?? "—")} · RW ${String(first.rwId ?? "—")}` };
  }).filter((row) => row.label.toLowerCase().includes(query.toLowerCase()));
  const checked = rows.reduce((sum, row) => sum + numeric(row, "totalChecked"), 0);
  const positive = rows.reduce((sum, row) => sum + numeric(row, "totalPositive"), 0);
  const negative = rows.reduce((sum, row) => sum + numeric(row, "totalNegative"), 0);
  const abj = checked ? negative / checked * 100 : null;
  function download() {
    csvDownload("rekap-jumantik-firestore.csv", [
      ["Region ID", "Wilayah", "Laporan", "Lokasi diperiksa", "Jentik positif", "ABJ"],
      ...aggregates.map((item) => [item.id, item.label, item.reports.length, item.checked, item.positive, `${item.score.toFixed(2)}%`])
    ]);
  }
  return <>
    <PageHeading eyebrow="Pelaporan kelurahan" title="Rekapitulasi Laporan" description="Rekap dihitung dari laporan inspeksi yang tersimpan di Firestore pada cakupan akun." action={<button onClick={download} disabled={!rows.length} className="rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 px-4 py-3 text-xs font-bold text-white shadow-lg disabled:opacity-50"><ArrowDownToLine size={14} className="mr-1 inline" />Unduh CSV</button>} />
    <DataState loading={loading} error={error} empty={!rows.length}><>
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4"><Metric label="Total laporan" value={String(rows.length)} helper="Laporan pada cakupan akun" icon={FileSpreadsheet} /><Metric label="Lokasi diperiksa" value={String(checked)} helper="Akumulasi hasil inspeksi" icon={Home} tone="blue" /><Metric label="Angka Bebas Jentik" value={abj === null ? "—" : `${abj.toFixed(1)}%`} helper="Target ABJ minimal 95%" icon={CheckCircle2} /><Metric label="Rumah positif" value={String(positive)} helper="Temuan jentik positif" icon={Waves} tone={positive ? "amber" : "green"} /></div>
      <div className="soft-card mt-4 overflow-x-auto rounded-2xl"><table className="w-full min-w-[650px] text-left"><thead><tr className="bg-slate-50 text-[9px] font-bold uppercase tracking-wide text-slate-400"><th className="px-5 py-3">Wilayah</th><th className="px-3 py-3">Laporan</th><th className="px-3 py-3">Diperiksa</th><th className="px-3 py-3">Positif</th><th className="px-5 py-3">ABJ / kondisi</th></tr></thead><tbody>{aggregates.map((row) => { const status = statusFor(row.score); return <tr key={row.id} className="border-t border-slate-50 text-[10px]"><td className="px-5 py-3.5 font-bold text-slate-700">{row.label}</td><td className="px-3 py-3.5">{row.reports.length}</td><td className="px-3 py-3.5">{row.checked}</td><td className="px-3 py-3.5 text-rose-600">{row.positive}</td><td className="px-5 py-3.5"><span className="font-extrabold">{row.score.toFixed(1)}%</span><span className="ml-2 text-slate-500">{status}</span></td></tr>; })}</tbody></table></div>
      <p className="mt-3 text-[10px] text-slate-400">Ekspor CSV berisi agregasi aktual. Dokumen ini belum menggantikan formulir resmi bertanda tangan.</p>
    </></DataState>
  </>;
}

function CasesPage({ scope, notify, rows, loading, error, refresh }: SectionPagesProps & {
  rows: FirestoreRecord[];
  loading: boolean;
  error: string;
  refresh: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const canManage = scope.role === "ADMIN_KELURAHAN" || scope.role === "KETUA_RW";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setFormError("");
    try {
      await createDbdCase({
        caseCode: `DBD-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        patientInitials: String(form.get("patientInitials")),
        regionId: String(form.get("regionId")),
        notes: String(form.get("notes"))
      }, scope);
      setOpen(false);
      refresh();
      notify("Kasus dan tindak lanjut berhasil dicatat.");
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "Gagal menyimpan kasus.");
    } finally {
      setSaving(false);
    }
  }
  async function updateStatus(caseId: string, status: "VERIFIED" | "MONITORING" | "FOGGING_SCHEDULED" | "CLOSED") {
    try {
      await updateDbdCaseStatus(caseId, status, scope.uid);
      refresh();
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : "Gagal mengubah status kasus.");
    }
  }
  return <>
    <PageHeading eyebrow="Kewaspadaan DBD" title="Kasus DBD & Tindak Lanjut" description="Catatan kasus dibatasi pada pengurus wilayah. Identitas lengkap pasien tidak disimpan pada sistem ini." action={canManage ? <button onClick={() => setOpen(true)} className="rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 px-4 py-3 text-xs font-bold text-white shadow-lg"><Plus size={14} className="mr-1 inline" />Catat kasus</button> : undefined} />
    <DataState loading={loading} error={error} empty={!rows.length}><div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
      <section className="soft-card overflow-hidden rounded-2xl"><div className="border-b border-slate-100 p-4 sm:px-5"><h3 className="font-display text-sm font-extrabold text-slate-800">Kasus dalam cakupan wilayah</h3><p className="mt-1 text-[10px] text-slate-400">Hanya inisial, nomor RT, tanggal, dan status tindak lanjut.</p></div>
        <div className="divide-y divide-slate-50">{rows.map((row) => <div key={row.id} className="flex flex-wrap items-center gap-3 px-4 py-4 sm:flex-nowrap sm:px-5"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${row.status === "CLOSED" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}><Activity size={16} /></span><div className="min-w-0 flex-1"><p className="text-[11px] font-bold text-slate-700">{String(row.caseCode ?? row.id)} · {String(row.patientInitials ?? "Inisial tidak tersedia")}</p><p className="mt-1 text-[9px] text-slate-400">RT {String(row.rt ?? "—")} · {displayDate(dateValue(row, "reportedAt"))}</p></div>{canManage ? <select aria-label={`Status kasus ${String(row.caseCode ?? row.id)}`} value={String(row.status ?? "REPORTED")} onChange={(event) => void updateStatus(row.id, event.target.value as "VERIFIED" | "MONITORING" | "FOGGING_SCHEDULED" | "CLOSED")} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-bold text-slate-600"><option value="REPORTED">REPORTED</option><option value="VERIFIED">VERIFIED</option><option value="MONITORING">MONITORING</option><option value="FOGGING_SCHEDULED">FOGGING SCHEDULED</option><option value="CLOSED">CLOSED</option></select> : <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">{String(row.status ?? "REPORTED")}</span>}</div>)}</div>
      </section>
      <section className="soft-card rounded-2xl p-4 sm:p-5"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-50 text-amber-700"><ShieldAlert size={16} /></span><h3 className="font-display text-sm font-extrabold text-slate-800">Prosedur tindak lanjut</h3></div><ol className="mt-4 space-y-3">{[["Verifikasi laporan", "Petugas surveilans memvalidasi wilayah dan waktu kasus."], ["Pemeriksaan lingkungan", "Koordinasikan kunjungan dan pemeriksaan jentik di area sekitar."], ["Koordinasi puskesmas", "Intervensi ditetapkan tenaga kesehatan; fogging bukan tindakan otomatis."]].map(([title, description], index) => <li key={title} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-[9px] font-extrabold text-emerald-800">{index + 1}</span><div><p className="text-[10px] font-bold text-slate-700">{title}</p><p className="mt-1 text-[9px] leading-relaxed text-slate-500">{description}</p></div></li>)}</ol><p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-[9px] leading-relaxed text-amber-800"><AlertTriangle size={13} className="mr-1 inline" />Jangan menuliskan identitas lengkap pasien di catatan atau peta publik.</p></section>
    </div></DataState>
    {open && <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/40 p-4"><form onSubmit={submit} className="soft-card w-full max-w-md rounded-2xl p-5"><div className="flex justify-between"><h3 className="font-display font-extrabold text-slate-800">Catat kasus DBD</h3><button type="button" onClick={() => setOpen(false)} aria-label="Tutup form">×</button></div><label className="mt-4 block text-[10px] font-bold text-slate-600">ID wilayah Firestore<input name="regionId" required defaultValue={scope.regionId} placeholder="ID dokumen RT" className="mt-1 w-full rounded-lg border p-2.5 text-xs" /></label><label className="mt-3 block text-[10px] font-bold text-slate-600">Inisial pasien saja<input name="patientInitials" required maxLength={12} placeholder="A.B." className="mt-1 w-full rounded-lg border p-2.5 text-xs" /></label><label className="mt-3 block text-[10px] font-bold text-slate-600">Catatan tindak lanjut<input name="notes" maxLength={300} className="mt-1 w-full rounded-lg border p-2.5 text-xs" /></label>{formError && <p role="alert" className="mt-3 text-xs text-rose-700">{formError}</p>}<button disabled={saving} className="mt-4 w-full rounded-lg bg-rose-700 px-4 py-3 text-xs font-bold text-white disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan kasus"}</button></form></div>}
  </>;
}
