import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function supabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY (service role) is missing");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function requireAdmin(req: Request) {
  const expected = process.env.ADMIN_PIN || "";
  if (!expected) return true; // ADMIN_PIN 미사용이면 통과(원하면 false로 바꿔도 됨)

  const pin = req.headers.get("x-admin-pin") ?? "";
  return pin === expected;
}

export async function POST(req: Request) {
  try {
    if (!requireAdmin(req)) return bad("unauthorized", 401);

    const body = await req.json().catch(() => ({}));
    const orderId = String(body?.orderId ?? "").trim();
    if (!orderId) return bad("orderId is required");

    const sb = supabaseService();

    // ✅ soft delete: deleted_at 찍기
    const { error } = await sb
      .from("orders")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", orderId);

    if (error) return bad(error.message, 500);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}
