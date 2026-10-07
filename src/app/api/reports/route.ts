import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { DecodedIdToken } from "firebase-admin/auth";
import { FieldValue } from "firebase-admin/firestore";
import {
  getAdminAuth,
  getFirestoreDb,
  isFirebaseAdminConfigured
} from "@/lib/firebase-admin";

export const runtime = "nodejs";

const ALLOWED_ROLES = ["KADER", "KETUA_RW", "ADMIN_KELURAHAN", "WARGA"];
const CATEGORY_NAMES = [
  "permukiman",
  "institusi",
  "tempatKerja",
  "ttu",
  "tpm",
  "sarana"
] as const;

type CategoryName = (typeof CATEGORY_NAMES)[number];
type ReportBody = {
  localId: string;
  regionId: string;
  weekNumber: number;
  date: string;
  categories: Partial<Record<CategoryName, { checked: number; positive: number }>>;
  coordinates?: { latitude: number; longitude: number };
};

async function authorize(request: NextRequest): Promise<DecodedIdToken | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(header.slice(7));
    return ALLOWED_ROLES.includes(String(decoded.role)) ? decoded : null;
  } catch {
    return null;
  }
}

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function validBody(body: unknown): body is ReportBody {
  if (!body || typeof body !== "object") return false;
  const report = body as Partial<ReportBody>;
  if (
    typeof report.localId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(report.localId) ||
    typeof report.regionId !== "string" ||
    report.regionId.length < 1 ||
    report.regionId.length > 150 ||
    !Number.isInteger(report.weekNumber) ||
    Number(report.weekNumber) < 1 ||
    Number(report.weekNumber) > 53 ||
    typeof report.date !== "string" ||
    Number.isNaN(Date.parse(report.date)) ||
    !report.categories ||
    typeof report.categories !== "object" ||
    Object.keys(report.categories).some((key) => !CATEGORY_NAMES.includes(key as CategoryName))
  ) return false;

  const coordinates = report.coordinates;
  if (coordinates && (
    !Number.isFinite(coordinates.latitude) ||
    coordinates.latitude < -90 ||
    coordinates.latitude > 90 ||
    !Number.isFinite(coordinates.longitude) ||
    coordinates.longitude < -180 ||
    coordinates.longitude > 180
  )) return false;

  return CATEGORY_NAMES.every((name) => {
    const values = report.categories?.[name];
    return values === undefined || (
      isCount(values.checked) &&
      isCount(values.positive) &&
      values.positive <= values.checked
    );
  }) && CATEGORY_NAMES.some((name) => (report.categories?.[name]?.checked ?? 0) > 0);
}

export async function GET(request: NextRequest) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "Layanan Firebase belum dikonfigurasi." }, { status: 503 });
  }
  let user: DecodedIdToken | null;
  try {
    user = await authorize(request);
  } catch (error) {
    console.error("Firebase authentication is not configured:", error);
    return NextResponse.json({ error: "Layanan Firebase belum dikonfigurasi." }, { status: 503 });
  }
  if (!user) return NextResponse.json({ error: "Autentikasi diperlukan." }, { status: 401 });

  const regionId = request.nextUrl.searchParams.get("regionId");
  const isAdmin = user.role === "ADMIN_KELURAHAN";
  if (!regionId && !isAdmin) {
    return NextResponse.json({ error: "regionId wajib diisi." }, { status: 400 });
  }
  if (regionId && !isAdmin && user.regionId !== regionId) {
    return NextResponse.json({ error: "Tidak memiliki akses ke wilayah ini." }, { status: 403 });
  }

  try {
    const firestore = getFirestoreDb();
    let query = firestore.collection("jumantikReports").orderBy("createdAt", "desc").limit(100);
    if (regionId) query = query.where("regionId", "==", regionId).orderBy("createdAt", "desc").limit(100);
    const snapshot = await query.get();
    return NextResponse.json({
      reports: snapshot.docs.map((document) => ({ id: document.id, ...document.data() }))
    });
  } catch (error) {
    console.error("Unable to read Firestore reports:", error);
    return NextResponse.json({ error: "Gagal mengambil laporan dari Firestore." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "Layanan Firebase belum dikonfigurasi." }, { status: 503 });
  }
  let user: DecodedIdToken | null;
  try {
    user = await authorize(request);
  } catch (error) {
    console.error("Firebase authentication is not configured:", error);
    return NextResponse.json({ error: "Layanan Firebase belum dikonfigurasi." }, { status: 503 });
  }
  if (!user) return NextResponse.json({ error: "Autentikasi dengan role yang valid diperlukan." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format JSON tidak valid." }, { status: 400 });
  }
  if (!validBody(body)) return NextResponse.json({ error: "Data laporan tidak valid." }, { status: 400 });
  if (user.role !== "ADMIN_KELURAHAN" && user.regionId !== body.regionId) {
    return NextResponse.json({ error: "Tidak memiliki akses untuk melaporkan wilayah ini." }, { status: 403 });
  }

  const checked = CATEGORY_NAMES.reduce((sum, key) => sum + (body.categories[key]?.checked ?? 0), 0);
  const positive = CATEGORY_NAMES.reduce((sum, key) => sum + (body.categories[key]?.positive ?? 0), 0);
  const negative = checked - positive;
  const abjScore = checked === 0 ? 0 : Number(((negative / checked) * 100).toFixed(2));

  try {
    const firestore = getFirestoreDb();
    const document = firestore.collection("jumantikReports").doc(body.localId);
    const payloadHash = createHash("sha256").update(JSON.stringify({
      regionId: body.regionId,
      weekNumber: body.weekNumber,
      date: body.date,
      categories: body.categories,
      coordinates: body.coordinates ?? null
    })).digest("hex");
    const result = await firestore.runTransaction(async (transaction) => {
      const existing = await transaction.get(document);
      if (existing.exists) {
        const previous = existing.data();
        return previous?.inspectorId === user.uid && previous?.payloadHash === payloadHash
          ? "duplicate"
          : "conflict";
      }
      transaction.create(document, {
      inspectorId: user.uid,
      inspectorName: user.name ?? user.email ?? user.uid,
      regionId: body.regionId,
      weekNumber: body.weekNumber,
      date: new Date(body.date),
      categories: body.categories,
      totalChecked: checked,
      totalPositive: positive,
      totalNegative: negative,
      abjScore,
      status: "SUBMITTED",
      coordinates: body.coordinates ?? null,
      payloadHash,
      capturedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
      });
      return "created";
    });
    if (result === "conflict") {
      return NextResponse.json({ error: "ID antrean sudah digunakan oleh laporan lain." }, { status: 409 });
    }
    return NextResponse.json(
      { id: document.id, status: "SUBMITTED", abjScore, duplicate: result === "duplicate" },
      { status: result === "created" ? 201 : 200 }
    );
  } catch (error) {
    console.error("Unable to save Firestore report:", error);
    return NextResponse.json({ error: "Gagal menyimpan laporan ke Firestore." }, { status: 500 });
  }
}
