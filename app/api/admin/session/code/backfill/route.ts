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

function getAdminPin(req: Request) {
  return req.headers.get("x-admin-pin") ?? "";
}

async function assertAdmin(req: Request) {
  const pin = getAdminPin(req);
  if (!pin) throw new Error("NO_PIN");
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function makeCode(len = 6) {
  let out = "";
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
    const sb = getServiceSupabase();

    // code가 null인 세션들 (필요하면 limit 걸어도 됨)
    const { data: rows, error } = await sb.from("sessions").select("id, code").is("code", null);
    if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });

    let updated = 0;
    for (const r of rows ?? []) {
      const code = await allocateUniqueCode(sb);
      const { error: e2 } = await sb.from("sessions").update({ code }).eq("id", r.id);
      if (!e2) updated++;
    }

    return NextResponse.json({ updated, total: (rows ?? []).length });
  } catch (e: any) {
    const msg = e?.message ?? "UNKNOWN";
    const status = msg === "NO_PIN" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
