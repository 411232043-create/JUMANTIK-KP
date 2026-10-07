"use client";

import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  Filter,
  Home,
  MapPin,
  Plus,
  ShieldAlert,
  Users,
  Waves
} from "lucide-react";
import { useMemo, useState } from "react";

type SectionPagesProps = {
  active: string;
  query: string;
  onCreateReport: () => void;
  notify: (message: string) => void;
};

const inspections = [
  { id: "L-240923-014", kader: "Siti Rahmawati", area: "RT 01 · RW 04", date: "23 Sep 2024", checked: 48, positive: 2, status: "Terverifikasi" },
  { id: "L-240923-013", kader: "Agus Nugroho", area: "RT 03 · RW 04", date: "23 Sep 2024", checked: 56, positive: 4, status: "Menunggu verifikasi" },
  { id: "L-240922-012", kader: "Dewi Wulandari", area: "RT 04 · RW 04", date: "22 Sep 2024", checked: 42, positive: 1, status: "Terverifikasi" },
  { id: "L-240922-011", kader: "Rina Puspita", area: "RT 02 · RW 04", date: "22 Sep 2024", checked: 39, positive: 5, status: "Perlu revisi" },
  { id: "L-240921-010", kader: "Budi Santoso", area: "RT 01 · RW 04", date: "21 Sep 2024", checked: 51, positive: 2, status: "Terverifikasi" }
];

const households = [
  { name: "Keluarga Santoso", address: "Jl. Melati No. 12", area: "RT 01", last: "23 Sep 2024", state: "Sudah diperiksa" },
  { name: "Keluarga Wulandari", address: "Jl. Kenanga No. 8", area: "RT 01", last: "23 Sep 2024", state: "Sudah diperiksa" },
  { name: "Keluarga Pratama", address: "Jl. Mawar No. 21", area: "RT 02", last: "Belum minggu ini", state: "Belum diperiksa" },
  { name: "Keluarga Hidayat", address: "Jl. Anggrek No. 4", area: "RT 03", last: "22 Sep 2024", state: "Ada temuan jentik" },
  { name: "Keluarga Amelia", address: "Jl. Cempaka No. 17", area: "RT 04", last: "23 Sep 2024", state: "Sudah diperiksa" }
];

const cases = [
  { id: "DBD-024", patient: "Inisial A.S.", area: "RT 02 · RW 04", reported: "22 Sep 2024", state: "Terverifikasi", color: "rose" },
  { id: "DBD-023", patient: "Inisial M.R.", area: "RT 03 · RW 04", reported: "18 Sep 2024", state: "Pemantauan", color: "amber" },
  { id: "DBD-022", patient: "Inisial N.F.", area: "RT 01 · RW 04", reported: "09 Sep 2024", state: "Selesai", color: "emerald" }
];

function PageHeading({ eyebrow, title, description, action }: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[9px] font-bold uppercase tracking-[1.3px] text-emerald-700">{eyebrow}</p>
        <h2 className="font-display mt-1 text-xl font-extrabold tracking-[-.6px] text-[#173a2b] sm:text-2xl">{title}</h2>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500">{description}</p>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function DemoNote() {
  return (
    <p className="mt-4 flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/70 px-3 py-2.5 text-[10px] leading-relaxed text-sky-800">
      <Activity size={13} className="mt-0.5 shrink-0" />
      Data pada tampilan ini masih contoh. Hubungkan koleksi Firestore agar menampilkan data wilayah sebenarnya.
    </p>
  );
}

function Metric({ label, value, helper, icon: Icon, tone = "green" }: {
  label: string;
  value: string;
  helper: string;
  icon: typeof Home;
  tone?: "green" | "amber" | "rose" | "blue";
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    blue: "bg-blue-50 text-blue-700"
  };
  return (
    <article className="soft-card rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold text-slate-500">{label}</p>
        <span className={`grid h-8 w-8 place-items-center rounded-xl ${tones[tone]}`}><Icon size={16} /></span>
      </div>
      <p className="font-display mt-3 text-2xl font-extrabold tracking-[-1px] text-slate-800">{value}</p>
      <p className="mt-1 text-[10px] text-slate-400">{helper}</p>
    </article>
  );
}

function AreaTable({ query }: { query: string }) {
  const rows = [
    { rt: "RT 01", checked: 48, total: 52, abj: 96.2, status: "Aman" },
    { rt: "RT 02", checked: 39, total: 45, abj: 86.7, status: "Bahaya" },
    { rt: "RT 03", checked: 56, total: 60, abj: 93.3, status: "Waspada" },
    { rt: "RT 04", checked: 42, total: 44, abj: 97.6, status: "Aman" },
    { rt: "RT 05", checked: 34, total: 40, abj: 91.2, status: "Waspada" },
    { rt: "RT 06", checked: 50, total: 53, abj: 98, status: "Aman" }
  ].filter((row) => row.rt.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="soft-card mt-4 overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-4 sm:px-5">
        <div><h3 className="font-display text-sm font-extrabold text-slate-800">Capaian pemeriksaan per RT</h3><p className="mt-1 text-[10px] text-slate-400">Persentase dihitung dari hasil inspeksi yang tercatat.</p></div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-500">Minggu 38</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[490px] text-left">
          <thead><tr className="bg-slate-50/70 text-[9px] font-bold uppercase tracking-wide text-slate-400"><th className="px-5 py-3">Wilayah</th><th className="px-3 py-3">Rumah diperiksa</th><th className="px-3 py-3">ABJ</th><th className="px-5 py-3">Status risiko</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.rt} className="border-t border-slate-50 text-[11px]">
            <td className="px-5 py-3.5 font-bold text-slate-700">{row.rt} · RW 04</td>
            <td className="px-3 py-3.5 text-slate-500">{row.checked} / {row.total}</td>
            <td className={`px-3 py-3.5 font-extrabold ${row.abj < 90 ? "text-rose-600" : row.abj < 95 ? "text-amber-600" : "text-emerald-700"}`}>{row.abj.toFixed(1).replace(".", ",")}%</td>
            <td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${row.status === "Aman" ? "bg-emerald-50 text-emerald-700" : row.status === "Waspada" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{row.status}</span></td>
          </tr>)}</tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="px-5 py-8 text-center text-xs text-slate-400">RT tidak ditemukan.</p>}
    </div>
  );
}

function MapPage({ query, notify }: { query: string; notify: (message: string) => void }) {
  const points = [
    { rt: "RT 01", left: "24%", top: "30%", score: "96,2%", tone: "emerald" },
    { rt: "RT 02", left: "54%", top: "58%", score: "86,7%", tone: "rose" },
    { rt: "RT 03", left: "77%", top: "30%", score: "93,3%", tone: "amber" },
    { rt: "RT 04", left: "32%", top: "75%", score: "97,6%", tone: "emerald" },
    { rt: "RT 05", left: "75%", top: "75%", score: "91,2%", tone: "amber" }
  ].filter((point) => point.rt.toLowerCase().includes(query.toLowerCase()));
  const dot: Record<string, string> = { emerald: "bg-emerald-500", amber: "bg-amber-500", rose: "bg-rose-500" };
  return (
    <>
      <PageHeading eyebrow="Pemantauan wilayah" title="Peta Sebaran ABJ" description="Lihat kondisi bebas jentik setiap RT dan prioritaskan kunjungan ke wilayah berisiko." action={<button className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-600" onClick={() => window.print()}><MapPin size={14} className="mr-1.5 inline" />Cetak peta</button>} />
      <DemoNote />
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <section aria-label="Peta heatmap ABJ" className="soft-card rounded-[22px] p-3 sm:p-5">
          <div className="map-grid relative min-h-[340px] overflow-hidden rounded-2xl border border-emerald-100 sm:min-h-[440px]">
            <div className="absolute left-[14%] top-[13%] h-36 w-36 rounded-full border border-rose-400/20 bg-rose-400/[.09] sm:h-48 sm:w-48" />
            <div className="absolute left-[23%] top-[25%] h-24 w-24 rounded-full border border-rose-400/30 bg-rose-400/[.11]" />
            <div className="absolute left-[52%] top-[44%] h-32 w-32 rounded-full border border-amber-400/25 bg-amber-300/[.1]" />
            {points.map((point) => <button key={point.rt} style={{ left: point.left, top: point.top }} onClick={() => notify(`${point.rt} · ABJ ${point.score} · RT ${point.tone === "rose" ? "Bahaya" : point.tone === "amber" ? "Waspada" : "Aman"}`)} className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-white bg-white/95 py-1.5 pl-1.5 pr-3 text-[10px] font-extrabold text-slate-700 shadow-lg">
              <span className={`grid h-7 w-7 place-items-center rounded-full text-white ${dot[point.tone]}`}><MapPin size={13} fill="currentColor" /></span>{point.rt} <span className="font-semibold text-slate-500">{point.score}</span>
            </button>)}
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 rounded-xl border border-white/80 bg-white/90 px-3 py-2 text-[9px] font-bold text-slate-500 shadow-sm">
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-emerald-500" /> Aman ≥95%</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-amber-500" /> Waspada 90–94%</span>
              <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full bg-rose-500" /> Bahaya &lt;90%</span>
            </div>
          </div>
        </section>
        <section className="soft-card rounded-[22px] p-4 sm:p-5">
          <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50/80 p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-rose-600 shadow-sm"><ShieldAlert size={17} /></span>
            <div><p className="text-xs font-extrabold text-rose-800">Prioritas kunjungan</p><p className="mt-1 text-[10px] leading-relaxed text-rose-700">RT 02 berada di bawah target ABJ. Jadwalkan pemeriksaan ulang dan edukasi PSN 3M Plus.</p></div>
          </div>
          <div className="mt-4 space-y-2">
            {[
              { label: "RT 02 · RW 04", value: "86,7%", note: "Tindak lanjut segera", tone: "rose" },
              { label: "RT 03 · RW 04", value: "93,3%", note: "Pantau minggu depan", tone: "amber" },
              { label: "RT 05 · RW 04", value: "91,2%", note: "Pantau minggu depan", tone: "amber" }
            ].map((item) => <div key={item.label} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 p-3">
              <div><p className="text-[11px] font-bold text-slate-700">{item.label}</p><p className="mt-1 text-[9px] text-slate-400">{item.note}</p></div>
              <span className={`font-display text-sm font-extrabold ${item.tone === "rose" ? "text-rose-600" : "text-amber-600"}`}>{item.value}</span>
            </div>)}
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-3 text-[10px] leading-relaxed text-slate-500"><MapPin size={13} className="mr-1 inline text-emerald-700" />Lingkaran pada peta adalah ilustrasi visual, bukan radius GIS hasil koordinat lapangan.</div>
        </section>
      </div>
    </>
  );
}

function InspectionsPage({ query, onCreateReport, notify }: SectionPagesProps) {
  const [filter, setFilter] = useState("Semua status");
  const rows = useMemo(() => inspections.filter((item) => {
    const matchesQuery = `${item.id} ${item.kader} ${item.area}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (filter === "Semua status" || item.status === filter);
  }), [filter, query]);

  return (
    <>
      <PageHeading eyebrow="Operasional kader" title="Data Pemeriksaan" description="Kelola hasil pemeriksaan jentik, pantau laporan yang menunggu verifikasi, dan catat temuan kader." action={<button onClick={onCreateReport} className="rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 px-4 py-3 text-xs font-bold text-white shadow-lg"><Plus size={14} className="mr-1 inline" />Buat pemeriksaan</button>} />
      <DemoNote />
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Laporan minggu ini" value="184" helper="+16 dari minggu lalu" icon={ClipboardCheck} />
        <Metric label="Menunggu verifikasi" value="12" helper="Perlu ditinjau pengurus" icon={Activity} tone="amber" />
        <Metric label="Sudah diverifikasi" value="165" helper="89,7% dari laporan" icon={CheckCircle2} tone="blue" />
        <Metric label="Perlu revisi" value="7" helper="Kader perlu melengkapi data" icon={AlertTriangle} tone="rose" />
      </div>
      <section className="soft-card mt-4 overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:px-5">
          <div><h3 className="font-display text-sm font-extrabold text-slate-800">Riwayat laporan kader</h3><p className="mt-1 text-[10px] text-slate-400">Minggu pemeriksaan berjalan · klik baris untuk detail.</p></div>
          <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] text-slate-500"><Filter size={13} /><select value={filter} onChange={(event) => setFilter(event.target.value)} className="max-w-[150px] bg-transparent outline-none"><option>Semua status</option><option>Terverifikasi</option><option>Menunggu verifikasi</option><option>Perlu revisi</option></select></label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead><tr className="bg-slate-50/70 text-[9px] font-bold uppercase tracking-wide text-slate-400"><th className="px-5 py-3">ID / Tanggal</th><th className="px-3 py-3">Kader</th><th className="px-3 py-3">Wilayah</th><th className="px-3 py-3">Diperiksa</th><th className="px-3 py-3">Jentik +</th><th className="px-5 py-3">Status</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id} onClick={() => notify(`Detail ${row.id}: ${row.checked} diperiksa, ${row.positive} temuan jentik`)} className="cursor-pointer border-t border-slate-50 text-[10px] hover:bg-emerald-50/40">
              <td className="px-5 py-3.5"><p className="font-bold text-slate-700">{row.id}</p><p className="mt-1 text-slate-400">{row.date}</p></td><td className="px-3 py-3.5 font-semibold text-slate-600">{row.kader}</td><td className="px-3 py-3.5 text-slate-500">{row.area}</td><td className="px-3 py-3.5 text-slate-600">{row.checked}</td><td className="px-3 py-3.5 font-bold text-rose-600">{row.positive}</td>
              <td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${row.status === "Terverifikasi" ? "bg-emerald-50 text-emerald-700" : row.status === "Perlu revisi" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{row.status}</span></td>
            </tr>)}</tbody>
          </table>
          {rows.length === 0 && <p className="px-5 py-8 text-center text-xs text-slate-400">Tidak ada laporan yang cocok.</p>}
        </div>
      </section>
    </>
  );
}

function ResidentsPage({ query, notify }: SectionPagesProps) {
  const rows = households.filter((row) => `${row.name} ${row.address} ${row.area}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <PageHeading eyebrow="Basis data lingkungan" title="Data Warga & Rumah" description="Daftar rumah yang menjadi sasaran kunjungan kader dan riwayat pemeriksaan penampungan air." action={<button onClick={() => notify("Form tambah rumah memerlukan data wilayah Firestore.")} className="rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 px-4 py-3 text-xs font-bold text-white shadow-lg"><Plus size={14} className="mr-1 inline" />Tambah rumah</button>} />
      <DemoNote />
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Rumah terdaftar" value="1.420" helper="Di 16 RT wilayah RW 04" icon={Home} />
        <Metric label="Sudah dikunjungi" value="1.284" helper="90,4% cakupan minggu ini" icon={CheckCircle2} />
        <Metric label="Belum diperiksa" value="136" helper="Perlu dijadwalkan kader" icon={ClipboardCheck} tone="amber" />
        <Metric label="Temuan jentik" value="41" helper="Perlu tindak lanjut" icon={Waves} tone="rose" />
      </div>
      <section className="soft-card mt-4 overflow-hidden rounded-2xl">
        <div className="border-b border-slate-100 p-4 sm:px-5"><h3 className="font-display text-sm font-extrabold text-slate-800">Daftar sasaran kunjungan</h3><p className="mt-1 text-[10px] text-slate-400">Cari nama keluarga, alamat, atau nomor RT.</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left">
          <thead><tr className="bg-slate-50/70 text-[9px] font-bold uppercase tracking-wide text-slate-400"><th className="px-5 py-3">Kepala keluarga</th><th className="px-3 py-3">Alamat</th><th className="px-3 py-3">RT</th><th className="px-3 py-3">Pemeriksaan terakhir</th><th className="px-5 py-3">Status minggu ini</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.address} className="border-t border-slate-50 text-[10px]">
            <td className="px-5 py-3.5 font-bold text-slate-700">{row.name}</td><td className="px-3 py-3.5 text-slate-500">{row.address}</td><td className="px-3 py-3.5 text-slate-500">{row.area}</td><td className="px-3 py-3.5 text-slate-500">{row.last}</td>
            <td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${row.state === "Sudah diperiksa" ? "bg-emerald-50 text-emerald-700" : row.state === "Ada temuan jentik" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{row.state}</span></td>
          </tr>)}</tbody>
        </table>{rows.length === 0 && <p className="px-5 py-8 text-center text-xs text-slate-400">Warga tidak ditemukan.</p>}</div>
      </section>
    </>
  );
}

function exportCsv() {
  const content = [
    ["Wilayah", "Rumah diperiksa", "ABJ", "Status"],
    ["RT 01 RW 04", "48/52", "96.2%", "Aman"],
    ["RT 02 RW 04", "39/45", "86.7%", "Bahaya"],
    ["RT 03 RW 04", "56/60", "93.3%", "Waspada"],
    ["RT 04 RW 04", "42/44", "97.6%", "Aman"]
  ].map((row) => row.join(",")).join("\n");
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  link.download = "rekap-jumantik-mingguan.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function ReportsPage({ query }: { query: string }) {
  return (
    <>
      <PageHeading eyebrow="Pelaporan kelurahan" title="Rekapitulasi Laporan" description="Rekap hasil pemeriksaan per RT/RW untuk bahan evaluasi dan pelaporan rutin." action={<button onClick={exportCsv} className="rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 px-4 py-3 text-xs font-bold text-white shadow-lg"><ArrowDownToLine size={14} className="mr-1 inline" />Unduh CSV</button>} />
      <DemoNote />
      <div className="mt-4 flex flex-wrap gap-2">
        {["Mingguan", "Bulanan", "Wilayah RW 04"].map((item, index) => <span key={item} className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${index === 0 ? "bg-emerald-100 text-emerald-800" : "border border-slate-200 bg-white text-slate-500"}`}>{item}</span>)}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Cakupan pemeriksaan" value="90,4%" helper="1.284 dari 1.420 rumah" icon={Home} />
        <Metric label="Angka Bebas Jentik" value="96,8%" helper="Target kelurahan ≥95%" icon={CheckCircle2} />
        <Metric label="Rumah positif" value="41" helper="3,2% dari rumah diperiksa" icon={Waves} tone="amber" />
        <Metric label="Laporan diterima" value="184 / 196" helper="94% kader sudah melapor" icon={FileSpreadsheet} tone="blue" />
      </div>
      <AreaTable query={query} />
      <div className="soft-card mt-4 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div><p className="text-xs font-extrabold text-slate-700">Tanda tangan pengesahan</p><p className="mt-1 text-[10px] text-slate-500">Rekap final perlu diverifikasi dan disahkan oleh pengurus RW.</p></div>
        <button className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[10px] font-bold text-emerald-800"><CheckCircle2 size={13} className="mr-1 inline" />Tandai siap diverifikasi</button>
      </div>
    </>
  );
}

function CasesPage({ notify }: { notify: (message: string) => void }) {
  const [status, setStatus] = useState("Semua kasus");
  const visibleCases = cases.filter((item) => status === "Semua kasus" || item.state === status);
  return (
    <>
      <PageHeading eyebrow="Kewaspadaan DBD" title="Kasus DBD & Tindak Lanjut" description="Pantau laporan kasus, koordinasikan pemeriksaan lingkungan sekitar, dan catat tindak lanjut bersama puskesmas." action={<button onClick={() => notify("Form laporan kasus hanya untuk petugas berwenang dan belum terhubung ke backend.")} className="rounded-xl bg-gradient-to-br from-rose-600 to-rose-700 px-4 py-3 text-xs font-bold text-white shadow-lg"><Plus size={14} className="mr-1 inline" />Catat kasus</button>} />
      <DemoNote />
      <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Metric label="Kasus tercatat" value="24" helper="Sepanjang tahun berjalan" icon={Activity} tone="rose" />
        <Metric label="Kasus bulan ini" value="3" helper="2 telah diverifikasi" icon={AlertTriangle} tone="amber" />
        <Metric label="Area tindak lanjut" value="2 RT" helper="Koordinasi dengan puskesmas" icon={MapPin} tone="blue" />
        <Metric label="Pemantauan selesai" value="18" helper="Kasus ditutup petugas" icon={CheckCircle2} />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="soft-card overflow-hidden rounded-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-4 sm:px-5"><div><h3 className="font-display text-sm font-extrabold text-slate-800">Daftar kasus & tindak lanjut</h3><p className="mt-1 text-[10px] text-slate-400">Identitas ditampilkan terbatas untuk menjaga privasi pasien.</p></div><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[10px] font-semibold text-slate-500 outline-none"><option>Semua kasus</option><option>Terverifikasi</option><option>Pemantauan</option><option>Selesai</option></select></div>
          <div className="divide-y divide-slate-50">{visibleCases.map((item) => <button key={item.id} onClick={() => notify(`${item.id}: hubungi petugas surveilans untuk detail kasus`)} className="flex w-full items-center gap-3 px-4 py-4 text-left hover:bg-slate-50 sm:px-5">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.color === "rose" ? "bg-rose-50 text-rose-600" : item.color === "amber" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}><Activity size={16} /></span>
            <span className="min-w-0 flex-1"><span className="block text-[11px] font-bold text-slate-700">{item.id} · {item.patient}</span><span className="mt-1 block text-[9px] text-slate-400">{item.area} · Dilaporkan {item.reported}</span></span>
            <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${item.color === "rose" ? "bg-rose-50 text-rose-700" : item.color === "amber" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{item.state}</span>
          </button>)}</div>
        </section>
        <section className="soft-card rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-rose-50 text-rose-600"><MapPin size={16} /></span><h3 className="font-display text-sm font-extrabold text-slate-800">Respons lingkungan</h3></div>
          <ol className="mt-4 space-y-3">
            {[
              ["Verifikasi laporan", "Petugas surveilans memvalidasi wilayah dan waktu kasus."],
              ["Penyelidikan epidemiologi", "Koordinasikan kunjungan dan pemeriksaan jentik di sekitar lokasi."],
              ["Tindak lanjut terarah", "Puskesmas menentukan intervensi; fogging bukan tindakan otomatis."]
            ].map(([title, detail], index) => <li key={title} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-[9px] font-extrabold text-emerald-800">{index + 1}</span><div><p className="text-[10px] font-bold text-slate-700">{title}</p><p className="mt-1 text-[9px] leading-relaxed text-slate-500">{detail}</p></div></li>)}
          </ol>
          <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-[9px] leading-relaxed text-amber-800"><AlertTriangle size={13} className="mr-1 inline" />Jangan tampilkan nama lengkap atau alamat pasien pada peta atau halaman publik.</p>
        </section>
      </div>
    </>
  );
}

export default function SectionPages(props: SectionPagesProps) {
  switch (props.active) {
    case "Peta Sebaran":
      return <MapPage query={props.query} notify={props.notify} />;
    case "Data Pemeriksaan":
      return <InspectionsPage {...props} />;
    case "Data Warga":
      return <ResidentsPage {...props} />;
    case "Rekapitulasi":
      return <ReportsPage query={props.query} />;
    case "Kasus DBD":
      return <CasesPage notify={props.notify} />;
    default:
      return null;
  }
}
