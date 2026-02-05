import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE;

  if (!url) throw new Error("MISSING_NEXT_PUBLIC_SUPABASE_URL");
  if (!key) throw new Error("MISSING_SERVICE_ROLE_KEY");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// 네 프로젝트에서 쓰는 핀 인증 헤더명이 x-admin-pin 이었음
function getAdminPin(req: Request) {
  return req.headers.get("x-admin-pin") ?? "";
}

// TODO: 너 프로젝트의 실제 핀 검증 로직이 있으면 여기로 교체.
// 일단 "핀 존재"만 확인하는 최소 버전.
async function assertAdmin(req: Request) {
  const pin = getAdminPin(req);
  if (!pin) throw new Error("NO_PIN");
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode(len = 6) {
  let out = "";
  // Edge/Node 모두에서 동작
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

async function allocateUniqueCode(sb: ReturnType<typeof getServiceSupabase>) {
  for (let i = 0; i < 12; i++) {
    const code = makeCode(6);
    const { data, error } = await sb.from("sessions").select("id").eq("code", code).maybeSingle();
    if (error) throw error;
    if (!data) return code;
  }
  throw new Error("FAILED_TO_ALLOCATE_CODE");
}

export async function POST(req: Request) {
  try {
    await assertAdmin(req);

    const body = await req.json().catch(() => ({}));
    const sessionId = String(body?.sessionId ?? "").trim();
    if (!sessionId) return NextResponse.json({ error: "NO_SESSION_ID" }, { status: 400 });

    const sb = getServiceSupabase();

    // 이미 code가 있으면 그대로 반환
    const { data: s1, error: e1 } = await sb.from("sessions").select("id, code").eq("id", sessionId).maybeSingle();
    if (e1) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
    if (!s1) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    if (s1.code) return NextResponse.json({ code: s1.code });

    // 없으면 생성해서 업데이트
    const code = await allocateUniqueCode(sb);

    const { error: e2 } = await sb.from("sessions").update({ code }).eq("id", sessionId);
    if (e2) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });

    return NextResponse.json({ code });
  } catch (e: any) {
    const msg = e?.message ?? "UNKNOWN";
    const status = msg === "NO_PIN" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
