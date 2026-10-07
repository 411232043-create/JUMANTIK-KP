"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  FileBarChart,
  Home,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Waves,
  X
} from "lucide-react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User
} from "firebase/auth";
import { FormEvent, useEffect, useMemo, useState } from "react";
import ReportCapture from "@/components/report-capture";
import SectionPages from "@/components/section-pages";
import {
  FirestoreRecord,
  JumantikRole,
  loadJumantikData,
  RegionRecord,
  UserScope
} from "@/lib/jumantik-firestore";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase-client";

const navGroups = [
  {
    label: "MENU UTAMA",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, roles: ["KADER", "KETUA_RW", "ADMIN_KELURAHAN", "WARGA"] },
      { label: "Peta Sebaran", icon: MapIcon, roles: ["KADER", "KETUA_RW", "ADMIN_KELURAHAN"] },
      { label: "Data Pemeriksaan", icon: ClipboardCheck, roles: ["KADER", "KETUA_RW", "ADMIN_KELURAHAN"] },
      { label: "Data Warga", icon: Users, roles: ["KADER", "KETUA_RW", "ADMIN_KELURAHAN"] }
    ]
  },
  {
    label: "LAPORAN & KEWASPADAAN",
    items: [
      { label: "Rekapitulasi", icon: FileBarChart, roles: ["KETUA_RW", "ADMIN_KELURAHAN"] },
      { label: "Kasus DBD", icon: Activity, roles: ["KETUA_RW", "ADMIN_KELURAHAN"] }
    ]
  }
];

type DashboardData = {
  reports: FirestoreRecord[];
  properties: FirestoreRecord[];
  cases: FirestoreRecord[];
  regions: RegionRecord[];
};

function getScope(user: User, claims: Record<string, unknown>): UserScope | null {
  const roles: JumantikRole[] = ["KADER", "KETUA_RW", "ADMIN_KELURAHAN", "WARGA"];
  if (!roles.includes(claims.role as JumantikRole)) return null;
  return {
    uid: user.uid,
    name: user.displayName ?? user.email ?? "Petugas Jumantik",
    email: user.email ?? "",
    role: claims.role as JumantikRole,
    ...(typeof claims.regionId === "string" ? { regionId: claims.regionId } : {}),
    ...(typeof claims.rwId === "string" ? { rwId: claims.rwId } : {}),
    ...(typeof claims.kelurahan === "string" ? { kelurahan: claims.kelurahan } : {})
  };
}

function formatCount(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function MetricCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "green"
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Home;
  tone?: "green" | "blue" | "amber" | "rose";
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700"
  };
  return (
    <article className="soft-card min-w-0 rounded-[19px] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] font-semibold leading-snug text-slate-500 sm:text-[11px]">{label}</span>
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl ${tones[tone]}`}><Icon size={16} /></span>
      </div>
      <p className="font-display mt-3 text-[22px] font-extrabold leading-none tracking-[-1px] text-slate-800 sm:text-[26px]">{value}</p>
      <p className="mt-2 text-[9px] font-medium text-slate-400 sm:text-[10px]">{note}</p>
    </article>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/70 px-4 py-8 text-center">
      <ClipboardCheck className="mx-auto text-emerald-600" size={22} />
      <p className="mt-2 text-xs font-bold text-slate-700">{message}</p>
      <p className="mt-1 text-[10px] text-slate-400">Data akan muncul setelah laporan tersimpan di Firestore.</p>
    </div>
  );
}

function LoginScreen({
  error,
  busy,
  onSubmit
}: {
  error: string;
  busy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (!isFirebaseConfigured()) {
    return (
      <main className="grid min-h-screen place-items-center p-5">
        <section className="soft-card w-full max-w-md rounded-[26px] p-7 sm:p-9">
          <Brand />
          <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Konfigurasi Firebase Web belum lengkap.</div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">Isi konfigurasi Firebase Web pada `.env.local`, aktifkan Email/Password Authentication dan Cloud Firestore, kemudian mulai ulang aplikasi.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center p-5">
      <section className="soft-card w-full max-w-md rounded-[26px] p-7 sm:p-9">
        <Brand />
        <p className="mt-8 text-[10px] font-bold uppercase tracking-[1.5px] text-emerald-700">Sistem pemantauan kelurahan</p>
        <h1 className="font-display mt-2 text-2xl font-extrabold tracking-[-.7px] text-slate-800">Masuk ke Jumantik</h1>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">Gunakan akun petugas yang sudah didaftarkan oleh administrator kelurahan.</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <label className="block text-[10px] font-bold text-slate-600">Email
            <input name="email" required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
          </label>
          <label className="block text-[10px] font-bold text-slate-600">Kata sandi
            <input name="password" required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-xs outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
          </label>
          {error && <p role="alert" className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-[10px] leading-relaxed text-rose-800">{error}</p>}
          <button disabled={busy} className="w-full rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-800 px-4 py-3 text-xs font-extrabold text-white shadow-[0_9px_22px_rgba(5,95,70,.22)] disabled:opacity-60">{busy ? "Memverifikasi..." : "Masuk dengan aman"}</button>
        </form>
        <p className="mt-5 text-[9px] leading-relaxed text-slate-400">Akses data dibatasi berdasarkan role dan wilayah yang telah diverifikasi.</p>
      </section>
    </main>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid h-11 w-11 place-items-center rounded-[16px] bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-800 text-white shadow-[0_8px_18px_rgba(5,150,105,.28)]">
        <ShieldCheck size={23} strokeWidth={2.2} />
      </div>
      <div><p className="font-display text-[15px] font-extrabold tracking-[-.5px] text-[#193a2c]">jumantik<span className="text-emerald-600">.</span></p><p className="text-[9px] font-bold uppercase tracking-[1.4px] text-slate-400">Online system</p></div>
    </div>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [scope, setScope] = useState<UserScope | null>(null);
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured());
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [active, setActive] = useState("Dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState("");
  const [queryText, setQueryText] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [dashboardResult, setDashboardResult] = useState<{ key: string; data?: DashboardData; error?: string } | null>(null);
  const [dashboardRefresh, setDashboardRefresh] = useState(0);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;
    return onAuthStateChanged(getFirebaseAuth(), async (nextUser) => {
      setUser(nextUser);
      setScope(null);
      setAuthError("");
      if (!nextUser) {
        setAuthLoading(false);
        return;
      }
      try {
        const token = await nextUser.getIdTokenResult();
        const nextScope = getScope(nextUser, token.claims);
        setScope(nextScope);
        if (!nextScope) {
          setAuthError("Akun belum memiliki role Jumantik yang valid. Minta admin menetapkan role dan wilayah, lalu masuk kembali.");
        } else if (nextScope.role !== "ADMIN_KELURAHAN" && !nextScope.regionId && !nextScope.rwId) {
          setAuthError("Role akun belum memiliki cakupan wilayah. Minta admin melengkapi regionId atau rwId.");
        }
      } catch (error) {
        setAuthError(error instanceof Error ? error.message : "Gagal memvalidasi sesi pengguna.");
      } finally {
        setAuthLoading(false);
      }
    });
  }, []);

  useEffect(() => {
    if (!scope) return;
    let cancelled = false;
    const key = `${scope.uid}:${scope.role}:${scope.regionId ?? ""}:${scope.rwId ?? ""}:${dashboardRefresh}`;
    Promise.all([
      loadJumantikData("jumantikReports", scope),
      loadJumantikData("properties", scope),
      loadJumantikData("dbdCases", scope),
      loadJumantikData("regions", scope)
    ]).then(([reports, properties, cases, regions]) => {
      if (!cancelled) setDashboardResult({ key, data: {
          reports,
          properties,
          cases,
          regions: regions as RegionRecord[]
        }
      });
    }).catch((error: unknown) => {
      if (!cancelled) {
        setDashboardResult({ key, error: error instanceof Error ? error.message : "Gagal memuat data wilayah dari Firestore." });
      }
    });
    return () => { cancelled = true; };
  }, [dashboardRefresh, scope]);

  useEffect(() => {
    const refreshDashboard = () => setDashboardRefresh((current) => current + 1);
    window.addEventListener("jumantik:data-changed", refreshDashboard);
    return () => window.removeEventListener("jumantik:data-changed", refreshDashboard);
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setAuthBusy(true);
    setAuthError("");
    try {
      await signInWithEmailAndPassword(
        getFirebaseAuth(),
        String(form.get("email")),
        String(form.get("password"))
      );
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Login Firebase gagal.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    await signOut(getFirebaseAuth());
    setActive("Dashboard");
  }

  function notify(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  }

  const menuGroups = useMemo(
    () => navGroups.map((group) => ({
      ...group,
      items: group.items.filter((item) => scope && item.roles.includes(scope.role))
    })).filter((group) => group.items.length),
    [scope]
  );

  const dashboardKey = scope
    ? `${scope.uid}:${scope.role}:${scope.regionId ?? ""}:${scope.rwId ?? ""}:${dashboardRefresh}`
    : "";
  const dashboardData = dashboardResult?.key === dashboardKey ? dashboardResult.data ?? null : null;
  const dataError = dashboardResult?.key === dashboardKey ? dashboardResult.error ?? "" : "";
  const dataLoading = Boolean(scope && dashboardResult?.key !== dashboardKey);
  const reports = dashboardData?.reports ?? [];
  const currentWeekStart = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    start.setHours(0, 0, 0, 0);
    return start;
  }, []);
  const weekReports = reports.filter((report) => {
    const date = parseDate(report.date);
    return date !== null && date >= currentWeekStart;
  });
  const totalChecked = weekReports.reduce((sum, report) => sum + Number(report.totalChecked ?? 0), 0);
  const totalPositive = weekReports.reduce((sum, report) => sum + Number(report.totalPositive ?? 0), 0);
  const totalNegative = weekReports.reduce((sum, report) => sum + Number(report.totalNegative ?? 0), 0);
  const abj = totalChecked ? (totalNegative / totalChecked) * 100 : null;
  const activeKaders = new Set(weekReports.map((report) => report.inspectorId).filter(Boolean)).size;
  const reportsByRegion = new globalThis.Map<string, FirestoreRecord[]>();
  for (const report of weekReports) {
    const id = String(report.regionId ?? "");
    reportsByRegion.set(id, [...(reportsByRegion.get(id) ?? []), report]);
  }
  const regionRows = (dashboardData?.regions ?? []).map((region) => {
    const regionReports = reportsByRegion.get(region.id) ?? [];
    const checked = regionReports.reduce((sum, report) => sum + Number(report.totalChecked ?? 0), 0);
    const negative = regionReports.reduce((sum, report) => sum + Number(report.totalNegative ?? 0), 0);
    const score = checked ? (negative / checked) * 100 : null;
    return {
      id: region.id,
      label: `${region.rt ? `RT ${region.rt}` : "Wilayah"} · RW ${region.rw}`,
      checked,
      score,
      state: score === null ? "Belum dilaporkan" : score >= 95 ? "Aman" : score >= 90 ? "Waspada" : "Bahaya"
    };
  }).filter((row) => `${row.label} ${row.id}`.toLowerCase().includes(queryText.toLowerCase()));
  const latestReports = [...reports].sort((a, b) =>
    (parseDate(String(b.date ?? ""))?.getTime() ?? 0) - (parseDate(String(a.date ?? ""))?.getTime() ?? 0)
  ).slice(0, 4);

  if (authLoading) {
    return <main className="grid min-h-screen place-items-center text-xs font-semibold text-emerald-800">Memverifikasi sesi Jumantik...</main>;
  }
  if (user && (!scope || authError)) {
    return <main className="grid min-h-screen place-items-center p-5"><section className="soft-card w-full max-w-md rounded-[24px] p-7"><Brand /><div role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">{authError || "Akun belum mempunyai cakupan wilayah."}</div><p className="mt-3 text-[10px] leading-relaxed text-slate-500">Administrator perlu menetapkan custom claim `role` dan `regionId` atau `rwId` untuk akun ini.</p><button onClick={() => void handleLogout()} className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600">Keluar</button></section></main>;
  }
  if (!user || !scope) {
    return <LoginScreen error={authError} busy={authBusy} onSubmit={handleLogin} />;
  }

  const regionLabel = scope.role === "ADMIN_KELURAHAN"
    ? scope.kelurahan ?? "Seluruh kelurahan"
    : scope.role === "KETUA_RW"
      ? `${scope.kelurahan ? `Kel. ${scope.kelurahan} · ` : ""}RW ${scope.rwId}`
      : `Wilayah ${scope.regionId}`;

  return (
    <div className="min-h-screen lg:flex">
      {mobileNav && <button aria-label="Tutup menu" className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden" onClick={() => setMobileNav(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[258px] flex-col border-r border-emerald-950/[0.04] bg-white/95 px-5 py-6 backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-1"><Brand /><button aria-label="Tutup navigasi" className="rounded-lg p-2 text-slate-400 lg:hidden" onClick={() => setMobileNav(false)}><X size={18} /></button></div>
        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50/90 to-white p-3 shadow-[0_5px_14px_rgba(16,95,66,.05)]">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-emerald-700 shadow-sm"><Home size={17} /></span>
          <span className="min-w-0 flex-1"><span className="block text-[9px] font-bold uppercase tracking-[1px] text-slate-400">Cakupan akun</span><span className="mt-0.5 block truncate text-[11px] font-bold text-slate-700">{regionLabel}</span></span>
          <CheckCircle2 size={14} className="text-emerald-600" />
        </div>
        <nav className="scrollbar-hide mt-8 flex-1 overflow-y-auto">
          {menuGroups.map((group) => <div key={group.label} className="mb-7">
            <p className="mb-3 px-3 text-[9px] font-bold tracking-[1.3px] text-slate-400">{group.label}</p>
            <div className="space-y-1">{group.items.map(({ label, icon: Icon }) => <button key={label} onClick={() => { setActive(label); setMobileNav(false); }} className={`sidebar-link flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold ${active === label ? "bg-emerald-50 text-emerald-800 shadow-[inset_3px_0_0_#10b981]" : "text-slate-500"}`}>
              <Icon size={17} strokeWidth={1.9} /><span className="flex-1">{label}</span>
            </button>)}</div>
          </div>)}
        </nav>
        <div className="mb-4 rounded-2xl border border-emerald-100/70 bg-gradient-to-br from-[#effaf3] to-white p-4">
          <div className="flex items-center justify-between"><span className="grid h-8 w-8 place-items-center rounded-xl bg-white text-emerald-600 shadow-sm"><Sparkles size={16} /></span><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${dataError ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{dataError ? "PERLU CEK" : "DATA FIRESTORE"}</span></div>
          <p className="mt-3 text-[12px] font-bold text-slate-700">Pantau lingkungan</p>
          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">Catat pemeriksaan rutin dan tindak lanjuti temuan jentik di wilayah Anda.</p>
        </div>
        <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 text-[11px] font-extrabold text-emerald-800">{scope.name.slice(0, 2).toUpperCase()}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-[11px] font-bold text-slate-700">{scope.name}</p><p className="mt-0.5 text-[9px] text-slate-400">{scope.role.replaceAll("_", " ")}</p></div>
          <button onClick={handleLogout} aria-label="Keluar dari akun" title="Keluar" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700"><LogOut size={16} /></button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-8 pt-5 sm:px-7 lg:px-9 lg:pt-7">
        <header className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3"><button aria-label="Buka menu" onClick={() => setMobileNav(true)} className="rounded-xl border border-white bg-white p-2.5 text-slate-600 shadow-sm lg:hidden"><Menu size={18} /></button><div className="min-w-0">
            <div className="hidden items-center gap-2 text-[10px] font-medium text-slate-400 sm:flex"><span>{regionLabel}</span><ChevronRight size={12} /><span className="text-emerald-700">{active}</span></div>
            <h1 className="font-display mt-1 truncate text-[19px] font-extrabold tracking-[-.6px] text-[#173a2b] sm:text-[23px]">{active}</h1>
          </div></div>
          <div className="flex items-center gap-2 sm:gap-3">
            <label className="hidden items-center gap-2 rounded-xl border border-white bg-white px-3 py-2.5 text-slate-400 shadow-sm md:flex"><Search size={14} /><input aria-label="Cari di halaman" value={queryText} onChange={(event) => setQueryText(event.target.value)} placeholder="Cari di halaman..." className="w-[125px] bg-transparent text-[10px] text-slate-600 outline-none placeholder:text-slate-400" /></label>
            <div className="hidden items-center gap-2 rounded-xl border border-white bg-white px-3 py-2.5 text-[10px] font-semibold text-slate-500 shadow-sm sm:flex">{new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date())}<ChevronDown size={13} /></div>
            <button onClick={() => setActive("Data Pemeriksaan")} aria-label="Buka laporan pemeriksaan" className="relative rounded-xl border border-white bg-white p-2.5 text-slate-500 shadow-sm hover:text-emerald-700"><Bell size={17} />{weekReports.some((report) => report.status === "SUBMITTED") && <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-amber-500" />}</button>
            <button onClick={() => notify("Hubungi administrator kelurahan jika membutuhkan bantuan.")} aria-label="Bantuan" className="hidden rounded-xl border border-white bg-white p-2.5 text-slate-500 shadow-sm sm:block"><CircleHelp size={17} /></button>
          </div>
        </header>

        {dataError && <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] leading-relaxed text-rose-800"><AlertTriangle className="mt-0.5 shrink-0" size={15} /><span>Gagal memuat data Firestore: {dataError}. Periksa koneksi, rules, dan indeks Firebase.</span></div>}

        {active === "Dashboard" ? (
          <>
            <section className="mt-6 grid gap-4 overflow-hidden rounded-[24px] bg-gradient-to-br from-[#087b56] via-[#08724f] to-[#07553f] px-6 py-6 text-white shadow-[0_18px_42px_rgba(5,95,70,.18)] sm:px-8 sm:py-7 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="relative z-10 max-w-[590px]"><div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[1.1px] text-emerald-50/90 backdrop-blur"><Sparkles size={11} /> Pemantauan wilayah</div>
                <h2 className="font-display mt-3 text-[21px] font-extrabold leading-tight tracking-[-.6px] sm:text-[26px]">Halo, {scope.name.split(" ")[0]} <span>👋</span></h2>
                <p className="mt-2 max-w-[480px] text-[11px] leading-relaxed text-emerald-50/75 sm:text-[12px]">Ringkasan pemeriksaan jentik dan kesehatan lingkungan yang tersimpan untuk {regionLabel}.</p>
                <div className="mt-4 flex flex-wrap items-center gap-2.5">
                  {scope.role !== "WARGA" && <button onClick={() => setReportOpen(true)} className="rounded-xl bg-white px-4 py-2.5 text-[10px] font-bold text-emerald-800 shadow-lg transition hover:-translate-y-0.5">+ Buat pemeriksaan</button>}
                  <button onClick={() => setActive("Rekapitulasi")} className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2.5 text-[10px] font-bold text-white backdrop-blur hover:bg-white/15">Lihat rekap <ArrowRight size={13} /></button>
                </div>
              </div>
              <div className="relative hidden h-[125px] w-[190px] items-center justify-center lg:flex"><div className="absolute h-[105px] w-[105px] rounded-full bg-emerald-300/10 blur-2xl" /><div className="absolute right-4 top-0 h-[90px] w-[90px] rotate-12 rounded-[26px] border border-white/20 bg-white/[.12] shadow-xl backdrop-blur-sm" /><div className="relative z-10 grid h-[86px] w-[86px] place-items-center rounded-[27px] border border-white/25 bg-gradient-to-br from-emerald-300/40 to-emerald-800/50 shadow-[0_18px_34px_rgba(0,0,0,.2)] backdrop-blur"><Waves size={39} strokeWidth={1.5} /></div></div>
            </section>

            <section className="mt-5 grid grid-cols-2 gap-3.5 xl:grid-cols-4">
              <MetricCard label="Angka Bebas Jentik" value={abj === null ? "—" : `${abj.toFixed(1).replace(".", ",")}%`} note={weekReports.length ? `Dihitung dari ${formatCount(totalChecked)} pemeriksaan minggu ini` : "Belum ada pemeriksaan minggu ini"} icon={ShieldCheck} />
              <MetricCard label="Pemeriksaan minggu ini" value={formatCount(totalChecked)} note={`${formatCount(weekReports.length)} laporan tersimpan`} icon={Home} tone="blue" />
              <MetricCard label="Temuan jentik positif" value={formatCount(totalPositive)} note={`${formatCount(totalNegative)} hasil negatif`} icon={Waves} tone={totalPositive ? "amber" : "green"} />
              <MetricCard label="Kader yang sudah melapor" value={formatCount(activeKaders)} note="Berdasarkan laporan minggu ini" icon={Users} tone="blue" />
            </section>

            <section className="mt-5 grid gap-4 xl:grid-cols-[1.45fr_1fr]">
              <article className="soft-card min-w-0 rounded-[20px] p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-display text-[13px] font-extrabold text-slate-800">Status pemeriksaan per RT</h3><p className="mt-1 text-[10px] text-slate-400">Rekap hasil laporan pada minggu berjalan.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-bold text-slate-500">{dataLoading ? "Memuat..." : `${regionRows.length} wilayah`}</span></div>
                {regionRows.length ? <div className="mt-4 space-y-2">{regionRows.slice(0, 6).map((row) => <div key={row.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-100 px-3 py-3 sm:gap-4">
                  <span className="min-w-[120px] flex-1 text-[10px] font-bold text-slate-700">{row.label}</span><span className="text-[9px] text-slate-400">{formatCount(row.checked)} diperiksa</span>
                  <span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${row.state === "Aman" ? "bg-emerald-50 text-emerald-700" : row.state === "Waspada" ? "bg-amber-50 text-amber-700" : row.state === "Bahaya" ? "bg-rose-50 text-rose-700" : "bg-slate-100 text-slate-500"}`}>{row.score === null ? row.state : `${row.score.toFixed(1).replace(".", ",")}% · ${row.state}`}</span>
                </div>)}</div> : dataLoading ? <div className="mt-5 animate-pulse rounded-xl bg-slate-100 py-12" /> : <div className="mt-4"><EmptyState message={dashboardData?.regions.length ? "Belum ada hasil pemeriksaan" : "Wilayah belum terdaftar"} /></div>}
                <button onClick={() => setActive("Peta Sebaran")} className="mt-4 flex items-center gap-1 text-[10px] font-bold text-emerald-700">Buka peta dan wilayah <ArrowRight size={12} /></button>
              </article>

              <article className="soft-card rounded-[20px] p-5 sm:p-6">
                <div className="flex items-start justify-between"><div><h3 className="font-display text-[13px] font-extrabold text-slate-800">Laporan terbaru</h3><p className="mt-1 text-[10px] text-slate-400">Aktivitas yang tercatat di Firestore.</p></div><ClipboardCheck size={16} className="text-emerald-700" /></div>
                {latestReports.length ? <div className="mt-4 space-y-3">{latestReports.map((report) => <div key={report.id} className="flex gap-3 border-b border-slate-50 pb-3 last:border-0 last:pb-0">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><Check size={14} /></span><div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold text-slate-700">{String(report.inspectorName ?? "Petugas Jumantik")}</p><p className="mt-1 text-[9px] text-slate-400">{`RT ${String(report.rt ?? "—")} · ${parseDate(report.date)?.toLocaleDateString("id-ID") ?? "Tanggal tidak tersedia"}`}</p></div><span className="text-[9px] font-bold text-emerald-700">{Number(report.abjScore ?? 0).toFixed(1)}%</span>
                </div>)}</div> : dataLoading ? <div className="mt-5 animate-pulse rounded-xl bg-slate-100 py-12" /> : <div className="mt-4"><EmptyState message="Belum ada laporan masuk" /></div>}
                <button onClick={() => setActive("Data Pemeriksaan")} className="mt-4 flex w-full items-center justify-center gap-1 rounded-xl border border-slate-100 py-2.5 text-[9px] font-bold text-slate-500 hover:bg-emerald-50">Buka daftar pemeriksaan <ArrowRight size={12} /></button>
              </article>
            </section>

            <section className="soft-card mt-4 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
              <div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600"><Activity size={16} /></span><div><p className="text-xs font-extrabold text-slate-700">Kasus DBD terpantau</p><p className="mt-1 text-[10px] text-slate-500">{formatCount(dashboardData?.cases.length ?? 0)} catatan kasus dalam cakupan akun.</p></div></div>
              {scope.role !== "KADER" && scope.role !== "WARGA" && <button onClick={() => setActive("Kasus DBD")} className="text-left text-[10px] font-bold text-emerald-700">Tinjau tindak lanjut <ArrowRight size={12} className="ml-1 inline" /></button>}
            </section>
          </>
        ) : (
          <SectionPages
            active={active}
            query={queryText}
            scope={scope}
            onCreateReport={() => setReportOpen(true)}
            notify={notify}
          />
        )}

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 px-1 text-[9px] text-slate-400"><span>© {new Date().getFullYear()} Jumantik Online · Sistem Digitalisasi Kelurahan</span><span className={`flex items-center gap-1.5 ${dataError ? "text-rose-600" : "text-emerald-700"}`}><span className={`h-1.5 w-1.5 rounded-full ${dataError ? "bg-rose-500" : "bg-emerald-500"}`} />{dataError ? "Sinkronisasi bermasalah" : "Data dibatasi sesuai wilayah akun"}</span></footer>
      </main>
      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[11px] font-semibold text-white shadow-xl"><Check size={14} className="shrink-0 text-emerald-400" />{notice}</div>}
          {reportOpen && <ReportCapture open={reportOpen} onClose={() => setReportOpen(false)} scope={scope} onSaved={() => setDashboardRefresh((current) => current + 1)} />}
    </div>
  );
}
