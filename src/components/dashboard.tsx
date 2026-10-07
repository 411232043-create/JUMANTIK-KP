"use client";

import { motion } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Download,
  Droplets,
  FileBarChart,
  Home,
  LayoutDashboard,
  Map,
  MapPin,
  Menu,
  MoreHorizontal,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  Waves,
  X
} from "lucide-react";
import { useState } from "react";
import ReportCapture from "@/components/report-capture";
import SectionPages from "@/components/section-pages";

const navGroups = [
  {
    label: "MENU UTAMA",
    items: [
      { label: "Dashboard", icon: LayoutDashboard },
      { label: "Peta Sebaran", icon: Map },
      { label: "Data Pemeriksaan", icon: ClipboardCheck, badge: "12" },
      { label: "Data Warga", icon: Users }
    ]
  },
  {
    label: "LAPORAN",
    items: [
      { label: "Rekapitulasi", icon: FileBarChart },
      { label: "Kasus DBD", icon: Activity }
    ]
  }
];

const regions = [
  { rt: "RT 01", rw: "RW 04", checked: "48 / 52", abj: 96.2, status: "Aman" },
  { rt: "RT 02", rw: "RW 04", checked: "39 / 45", abj: 86.7, status: "Bahaya" },
  { rt: "RT 03", rw: "RW 04", checked: "56 / 60", abj: 93.3, status: "Waspada" },
  { rt: "RT 04", rw: "RW 04", checked: "42 / 44", abj: 97.6, status: "Aman" }
];

const activities = [
  { initials: "SR", name: "Siti Rahmawati", action: "menyelesaikan pemeriksaan", place: "RT 01 · RW 04", time: "10 mnt lalu", tone: "mint" },
  { initials: "AN", name: "Agus Nugroho", action: "melaporkan 2 temuan jentik", place: "RT 03 · RW 04", time: "35 mnt lalu", tone: "amber" },
  { initials: "DW", name: "Dewi Wulandari", action: "mengirim laporan mingguan", place: "RT 04 · RW 04", time: "1 jam lalu", tone: "blue" }
];

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "Aman"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : status === "Waspada"
        ? "bg-amber-50 text-amber-700 ring-amber-100"
        : "bg-rose-50 text-rose-700 ring-rose-100";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${color}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function WeeklyChart() {
  return (
    <div className="relative mt-5">
      <div className="absolute left-0 top-0 flex h-full flex-col justify-between pb-7 text-[10px] font-medium text-slate-400">
        <span>100%</span><span>95%</span><span>90%</span><span>85%</span>
      </div>
      <div className="ml-9">
        <div className="relative h-[166px]">
          {[0, 1, 2, 3].map((line) => (
            <div key={line} className="absolute w-full border-t border-dashed border-slate-100" style={{ top: `${line * 33.33}%` }} />
          ))}
          <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 600 150" preserveAspectRatio="none" role="img" aria-label="Grafik ABJ mingguan">
            <defs>
              <linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity=".2" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path className="chart-area" d="M0,77 C45,71 47,52 100,58 S165,93 200,72 S267,40 300,50 S365,63 400,38 S465,52 500,32 S565,28 600,19 L600,150 L0,150 Z" />
            <path className="chart-line" d="M0,77 C45,71 47,52 100,58 S165,93 200,72 S267,40 300,50 S365,63 400,38 S465,52 500,32 S565,28 600,19" />
            <circle cx="400" cy="38" r="5" fill="#fff" stroke="#0b9467" strokeWidth="3" />
          </svg>
          <div className="absolute left-[66.6%] top-[11px] -translate-x-1/2 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-lg">
            96,8% <span className="ml-1 font-normal text-slate-300">Minggu ini</span>
          </div>
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-medium text-slate-400">
          <span>12 Agt</span><span>19 Agt</span><span>26 Agt</span><span>02 Sep</span><span>09 Sep</span><span>16 Sep</span><span>23 Sep</span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [active, setActive] = useState("Dashboard");
  const [period, setPeriod] = useState("Bulan ini");
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [reportOpen, setReportOpen] = useState(false);

  function notify(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  }

  return (
    <div className="min-h-screen lg:flex">
      {mobileNav && <button aria-label="Tutup menu" className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={() => setMobileNav(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[258px] flex-col border-r border-emerald-950/[0.04] bg-white/90 px-5 py-6 backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-[16px] bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 text-white shadow-[0_8px_18px_rgba(5,150,105,.28)]">
              <ShieldCheck size={23} strokeWidth={2.2} />
              <span className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-lime-300" />
            </div>
            <div>
              <p className="font-display text-[15px] font-extrabold tracking-[-.5px] text-[#193a2c]">jumantik<span className="text-emerald-600">.</span></p>
              <p className="text-[9px] font-bold uppercase tracking-[1.4px] text-slate-400">Online system</p>
            </div>
          </div>
          <button aria-label="Tutup navigasi" className="rounded-lg p-2 text-slate-400 lg:hidden" onClick={() => setMobileNav(false)}><X size={18} /></button>
        </div>

        <button onClick={() => notify("Wilayah aktif: Kelurahan Sukamaju, RW 04")} className="mt-8 flex items-center gap-3 rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50/90 to-white p-3 text-left shadow-[0_5px_14px_rgba(16,95,66,.05)]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm"><Home size={17} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[9px] font-bold uppercase tracking-[1px] text-slate-400">Wilayah aktif</span>
            <span className="mt-0.5 block truncate text-[12px] font-bold text-slate-700">Kel. Sukamaju · RW 04</span>
          </span>
          <ChevronDown size={15} className="text-slate-400" />
        </button>

        <nav className="scrollbar-hide mt-8 flex-1 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label} className="mb-7">
              <p className="mb-3 px-3 text-[9px] font-bold tracking-[1.3px] text-slate-400">{group.label}</p>
              <div className="space-y-1">
                {group.items.map(({ label, icon: Icon, badge }) => (
                  <button key={label} onClick={() => { setActive(label); setMobileNav(false); }} className={`sidebar-link flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold ${active === label ? "bg-emerald-50 text-emerald-800 shadow-[inset_3px_0_0_#10b981]" : "text-slate-500"}`}>
                    <Icon size={17} strokeWidth={1.9} />
                    <span className="flex-1">{label}</span>
                    {badge && <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">{badge}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mb-4 rounded-2xl border border-emerald-100/70 bg-gradient-to-br from-[#effaf3] to-white p-4">
          <div className="flex items-center justify-between">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm"><Sparkles size={16} /></span>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-bold text-emerald-700">MINGGU 38</span>
          </div>
          <p className="mt-3 text-[12px] font-bold text-slate-700">Terus jaga lingkungan!</p>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">Pemeriksaan rutin bantu cegah penyebaran DBD di sekitar kita.</p>
          <button onClick={() => notify("Terima kasih sudah menjaga lingkungan!") } className="mt-3 flex items-center gap-1 text-[10px] font-bold text-emerald-700">Pelajari program <ArrowRight size={12} /></button>
        </div>

        <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-200 text-[11px] font-extrabold text-amber-800">NA</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold text-slate-700">Nadia Amalia</p>
            <p className="mt-0.5 text-[9px] text-slate-400">Admin Kelurahan</p>
          </div>
          <button onClick={() => notify("Pengaturan akun")} aria-label="Pengaturan akun" className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"><Settings2 size={16} /></button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-8 pt-5 sm:px-7 lg:px-9 lg:pt-7">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button aria-label="Buka menu" onClick={() => setMobileNav(true)} className="rounded-xl border border-white bg-white p-2.5 text-slate-600 shadow-sm lg:hidden"><Menu size={18} /></button>
            <div className="min-w-0">
              <div className="hidden items-center gap-2 text-[10px] font-medium text-slate-400 sm:flex"><span>Kelurahan Sukamaju</span><ChevronRight size={12} /><span className="text-emerald-700">Dashboard</span></div>
              <h1 className="font-display mt-1 truncate text-[19px] font-extrabold tracking-[-.6px] text-[#173a2b] sm:text-[23px]">{active === "Dashboard" ? "Dashboard" : active}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <label className="hidden items-center gap-2 rounded-xl border border-white bg-white px-3 py-2.5 text-slate-400 shadow-sm md:flex">
              <Search size={14} />
              <input
                aria-label="Cari wilayah"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari di halaman..."
                className="w-[115px] bg-transparent text-[10px] text-slate-600 outline-none placeholder:text-slate-400"
              />
            </label>
            <div className="hidden items-center gap-2 rounded-xl border border-white bg-white px-3 py-2.5 text-[10px] font-semibold text-slate-500 shadow-sm sm:flex"><CalendarDays size={15} className="text-emerald-700" /> 23 Sep 2024 <ChevronDown size={13} /></div>
            <button onClick={() => notify("Tidak ada notifikasi baru")} aria-label="Notifikasi" className="relative rounded-xl border border-white bg-white p-2.5 text-slate-500 shadow-sm hover:text-emerald-700"><Bell size={17} /><span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-rose-500" /></button>
            <button aria-label="Bantuan" onClick={() => notify("Hubungi admin kelurahan untuk bantuan")} className="hidden rounded-xl border border-white bg-white p-2.5 text-slate-500 shadow-sm sm:block"><CircleHelp size={17} /></button>
          </div>
        </header>

        {active === "Dashboard" ? (
          <>
        <section className="mt-6 grid gap-4 overflow-hidden rounded-[24px] bg-gradient-to-br from-[#087b56] via-[#08724f] to-[#07553f] px-6 py-6 text-white shadow-[0_18px_42px_rgba(5,95,70,.18)] sm:px-8 sm:py-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="relative z-10 max-w-[590px]">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[1.1px] text-emerald-50/90 backdrop-blur"><Sparkles size={11} /> Ringkasan wilayah</div>
            <h2 className="font-display mt-3 text-[21px] font-extrabold leading-tight tracking-[-.6px] sm:text-[26px]">Halo, Nadia <span className="inline-block origin-bottom-right animate-[wave_1.8s_ease-in-out_infinite]">👋</span></h2>
            <p className="mt-2 max-w-[480px] text-[11px] leading-relaxed text-emerald-50/75 sm:text-[12px]">Pantau kondisi jentik dan kesehatan lingkungan wilayahmu. Berikut perkembangan pemeriksaan minggu ini.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button onClick={() => setReportOpen(true)} className="rounded-xl bg-white px-4 py-2.5 text-[10px] font-bold text-emerald-800 shadow-lg shadow-emerald-950/10 transition hover:-translate-y-0.5">+ Buat laporan</button>
              <button onClick={() => notify("Laporan bulan ini sedang disiapkan")} className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-[10px] font-bold text-white backdrop-blur hover:bg-white/15"><Download size={13} /> Unduh laporan</button>
            </div>
          </div>
          <div className="relative hidden h-[130px] w-[210px] items-center justify-center lg:flex">
            <div className="absolute h-[110px] w-[110px] rounded-full bg-emerald-300/10 blur-2xl" />
            <div className="absolute right-5 top-1 h-[92px] w-[92px] rounded-[27px] border border-white/20 bg-white/[.12] shadow-[0_14px_26px_rgba(0,0,0,.12)] backdrop-blur-sm rotate-[12deg]" />
            <div className="absolute bottom-0 left-2 h-[75px] w-[75px] rounded-[23px] border border-white/20 bg-emerald-300/15 shadow-[0_12px_25px_rgba(0,0,0,.12)] backdrop-blur-sm -rotate-[12deg]" />
            <div className="relative z-10 flex h-[90px] w-[90px] items-center justify-center rounded-[28px] border border-white/25 bg-gradient-to-br from-emerald-300/40 to-emerald-800/50 text-white shadow-[0_18px_34px_rgba(0,0,0,.2)] backdrop-blur"><Droplets size={42} strokeWidth={1.4} /></div>
            <div className="absolute right-0 top-5 flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/15 px-2.5 py-2 text-[9px] font-semibold shadow-lg backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-lime-300" /> Lingkungan terpantau</div>
          </div>
        </section>

        <section className="mt-5 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
          {[
            { label: "Angka Bebas Jentik", value: "96,8%", trend: "+2,4%", note: "dari bulan lalu", icon: ShieldCheck, color: "emerald", spark: "M0 20 C12 19 12 13 24 15 S38 18 48 10 S62 11 72 5" },
            { label: "Rumah Diperiksa", value: "1.284", trend: "+12,6%", note: "dari bulan lalu", icon: Home, color: "blue", spark: "M0 18 C12 15 14 19 24 13 S38 15 48 9 S62 11 72 4" },
            { label: "Temuan Jentik", value: "41", trend: "-8,2%", note: "lebih baik", icon: Waves, color: "amber", spark: "M0 4 C12 9 14 7 24 12 S38 9 48 15 S62 13 72 19" },
            { label: "Kader Aktif", value: "38", trend: "92%", note: "dari total kader", icon: Users, color: "purple", spark: "M0 18 C12 16 15 10 24 12 S37 7 48 10 S60 3 72 5" }
          ].map((item, index) => {
            const Icon = item.icon;
            const iconColors: Record<string, string> = { emerald: "bg-emerald-50 text-emerald-700", blue: "bg-blue-50 text-blue-600", amber: "bg-amber-50 text-amber-600", purple: "bg-violet-50 text-violet-600" };
            return (
              <motion.article key={item.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .07 }} className="soft-card min-w-0 rounded-[19px] p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-semibold leading-snug text-slate-500 sm:text-[11px]">{item.label}</span>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconColors[item.color]}`}><Icon size={16} /></span>
                </div>
                <div className="mt-3 flex items-end justify-between gap-1">
                  <div className="min-w-0">
                    <p className="font-display text-[22px] font-extrabold leading-none tracking-[-1px] text-slate-800 sm:text-[26px]">{item.value}</p>
                    <p className="mt-2 flex items-center gap-1 text-[9px] font-semibold text-slate-400 sm:text-[10px]"><span className={`inline-flex items-center ${item.trend.startsWith("-") ? "text-emerald-600" : "text-emerald-600"}`}>{item.trend.startsWith("-") ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />}{item.trend}</span> {item.note}</p>
                  </div>
                  <svg viewBox="0 0 72 24" className="mb-0.5 h-7 w-[56px] shrink-0 overflow-visible sm:w-[67px]" aria-hidden="true"><path d={item.spark} fill="none" stroke={index === 2 ? "#f5a623" : "#10a875"} strokeWidth="2" strokeLinecap="round" /></svg>
                </div>
              </motion.article>
            );
          })}
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
          <article className="soft-card rounded-[20px] p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><h3 className="font-display text-[13px] font-extrabold text-slate-800">Tren Angka Bebas Jentik</h3><span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-700">+2,4%</span></div>
                <p className="mt-1 text-[10px] text-slate-400">Performa ABJ selama 7 minggu terakhir</p>
              </div>
              <button onClick={() => setPeriod(period === "Bulan ini" ? "7 minggu" : "Bulan ini")} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-2.5 py-2 text-[9px] font-semibold text-slate-500">{period}<ChevronDown size={12} /></button>
            </div>
            <div className="mt-4 flex items-center gap-4 text-[9px] font-medium text-slate-500"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /> ABJ Wilayah</span><span className="flex items-center gap-1.5"><span className="h-px w-3 border-t border-dashed border-slate-400" /> Target 95%</span></div>
            <WeeklyChart />
          </article>

          <article className="soft-card overflow-hidden rounded-[20px] p-5 sm:p-6">
            <div className="flex items-start justify-between">
              <div><div className="flex items-center gap-2"><h3 className="font-display text-[13px] font-extrabold text-slate-800">Peta Sebaran ABJ</h3><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /></div><p className="mt-1 text-[10px] text-slate-400">Kelurahan Sukamaju, Jakarta Selatan</p></div>
              <button aria-label="Opsi peta" onClick={() => notify("Peta wilayah RW 04")} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50"><MoreHorizontal size={17} /></button>
            </div>
            <div className="map-grid relative mt-4 h-[185px] overflow-hidden rounded-2xl border border-emerald-100/60">
              <div className="absolute left-[12%] top-[13%] h-[112px] w-[112px] rounded-full border border-rose-400/25 bg-rose-400/[.08]" />
              <div className="absolute left-[21%] top-[24%] h-[67px] w-[67px] rounded-full border border-rose-400/35 bg-rose-400/[.1]" />
              <div className="absolute left-[48%] top-[44%] h-[86px] w-[86px] rounded-full border border-emerald-400/25 bg-emerald-400/[.09]" />
              {[
                { x: "25%", y: "38%", label: "RT 02", color: "bg-rose-500" },
                { x: "58%", y: "56%", label: "RT 01", color: "bg-emerald-500" },
                { x: "77%", y: "29%", label: "RT 03", color: "bg-amber-500" },
                { x: "69%", y: "78%", label: "RT 04", color: "bg-emerald-500" }
              ].map((pin) => <button key={pin.label} onClick={() => notify(`${pin.label}: detail ABJ wilayah`)} style={{ left: pin.x, top: pin.y }} className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-white/80 bg-white/90 py-1 pl-1 pr-2 text-[8px] font-bold text-slate-700 shadow-[0_3px_10px_rgba(28,69,47,.13)]"><span className={`flex h-5 w-5 items-center justify-center rounded-full text-white ${pin.color}`}><MapPin size={11} fill="currentColor" /></span>{pin.label}</button>)}
              <div className="absolute bottom-2.5 left-2.5 flex gap-2 rounded-lg border border-white/70 bg-white/85 px-2.5 py-1.5 shadow-sm backdrop-blur"><span className="flex items-center gap-1 text-[8px] font-semibold text-slate-500"><i className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Aman</span><span className="flex items-center gap-1 text-[8px] font-semibold text-slate-500"><i className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Waspada</span><span className="flex items-center gap-1 text-[8px] font-semibold text-slate-500"><i className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Bahaya</span></div>
              <button aria-label="Perbesar peta" onClick={() => notify("Peta interaktif wilayah RW 04")} className="absolute bottom-2.5 right-2.5 rounded-lg border border-white/70 bg-white/90 p-1.5 text-slate-500 shadow-sm"><Map size={13} /></button>
            </div>
            <button onClick={() => setActive("Peta Sebaran")} className="mt-3 flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:text-emerald-800">Lihat peta lengkap <ArrowRight size={12} /></button>
          </article>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
          <article className="soft-card min-w-0 overflow-hidden rounded-[20px]">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
              <div><div className="flex items-center gap-2"><h3 className="font-display text-[13px] font-extrabold text-slate-800">Performa per Wilayah</h3><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-bold text-slate-500">Minggu 38</span></div><p className="mt-1 text-[10px] text-slate-400">Status pemeriksaan dan ABJ setiap RT</p></div>
              <button onClick={() => notify("Rekap wilayah siap diunduh")} className="flex items-center gap-1.5 rounded-lg border border-slate-100 px-2.5 py-2 text-[9px] font-semibold text-slate-500 hover:bg-slate-50"><Download size={12} /> <span className="hidden sm:inline">Ekspor</span></button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[510px] text-left">
                <thead><tr className="border-y border-slate-100 bg-slate-50/60 text-[9px] font-bold uppercase tracking-[.5px] text-slate-400"><th className="px-6 py-3">Wilayah</th><th className="px-3 py-3">Diperiksa</th><th className="px-3 py-3">ABJ</th><th className="px-3 py-3">Status</th><th className="px-5 py-3 text-right">Detail</th></tr></thead>
                <tbody>{regions.filter((row) => `${row.rt} ${row.rw}`.toLowerCase().includes(query.toLowerCase())).map((row) => (
                  <tr key={row.rt} className="border-b border-slate-50 text-[10px] last:border-0 hover:bg-emerald-50/30">
                    <td className="px-6 py-3.5"><span className="font-bold text-slate-700">{row.rt}</span><span className="ml-2 text-slate-400">{row.rw}</span></td>
                    <td className="px-3 py-3.5 font-medium text-slate-500">{row.checked}</td>
                    <td className="px-3 py-3.5"><span className={`font-display font-extrabold ${row.abj < 90 ? "text-rose-600" : row.abj < 95 ? "text-amber-600" : "text-emerald-700"}`}>{row.abj.toFixed(1).replace(".", ",")}%</span></td>
                    <td className="px-3 py-3.5"><StatusBadge status={row.status} /></td>
                    <td className="px-5 py-3.5 text-right"><button onClick={() => notify(`Detail pemeriksaan ${row.rt}`)} aria-label={`Detail ${row.rt}`} className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-emerald-700"><ChevronRight size={15} /></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 text-[9px] text-slate-400 sm:px-6"><span>Menampilkan 4 dari 16 RT</span><div className="flex gap-1"><button aria-label="Halaman sebelumnya" className="rounded-md border border-slate-100 p-1.5"><ChevronLeft size={12} /></button><button className="rounded-md bg-emerald-600 px-2.5 py-1 text-[9px] font-bold text-white">1</button><button className="rounded-md border border-slate-100 px-2.5 py-1">2</button><button aria-label="Halaman selanjutnya" className="rounded-md border border-slate-100 p-1.5"><ChevronRight size={12} /></button></div></div>
          </article>

          <article className="soft-card rounded-[20px] p-5 sm:p-6">
            <div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><h3 className="font-display text-[13px] font-extrabold text-slate-800">Aktivitas Terbaru</h3><span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-emerald-100 px-1 text-[8px] font-bold text-emerald-700">3</span></div><p className="mt-1 text-[10px] text-slate-400">Aktivitas kader di wilayahmu</p></div><button aria-label="Lihat aktivitas lainnya" onClick={() => notify("Menampilkan semua aktivitas")} className="text-slate-400 hover:text-emerald-700"><MoreHorizontal size={17} /></button></div>
            <div className="mt-4 space-y-0">
              {activities.map((activity, index) => (
                <div key={activity.name} className="relative flex gap-3 pb-4 last:pb-0">
                  {index !== activities.length - 1 && <span className="absolute bottom-0 left-[17px] top-[36px] w-px bg-slate-100" />}
                  <div className={`relative z-10 flex h-[35px] w-[35px] shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold ${activity.tone === "mint" ? "bg-emerald-100 text-emerald-700" : activity.tone === "amber" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{activity.initials}</div>
                  <div className="min-w-0 flex-1 pt-0.5"><p className="text-[10px] leading-relaxed text-slate-600"><span className="font-bold text-slate-800">{activity.name}</span> {activity.action}</p><p className="mt-1 flex flex-wrap items-center gap-x-2 text-[9px] text-slate-400"><span>{activity.place}</span><span>·</span><span>{activity.time}</span></p></div>
                </div>
              ))}
            </div>
            <button onClick={() => notify("Semua aktivitas ditampilkan")} className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl border border-slate-100 py-2.5 text-[9px] font-bold text-slate-500 hover:border-emerald-100 hover:bg-emerald-50/50 hover:text-emerald-700">Lihat semua aktivitas <ArrowRight size={12} /></button>
          </article>
        </section>
          </>
        ) : (
          <SectionPages
            active={active}
            query={query}
            onCreateReport={() => setReportOpen(true)}
            notify={notify}
          />
        )}

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 px-1 text-[9px] text-slate-400"><span>© 2024 Jumantik Online · Sistem Digitalisasi Kelurahan</span><span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Semua data tersinkronisasi <Check size={11} className="text-emerald-600" /></span></footer>
      </main>

      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[11px] font-semibold text-white shadow-xl"><Check size={14} className="text-emerald-400" />{notice}</div>}
      <ReportCapture open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}
