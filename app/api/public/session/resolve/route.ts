import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = String(searchParams.get("key") ?? "").trim();
    if (!key) return NextResponse.json({ error: "NO_KEY" }, { status: 400 });

    const supabase = getServiceSupabase();

    // UUID면 id로 조회
    if (isUuid(key)) {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, code")
        .eq("id", key)
        .maybeSingle();

      if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
      if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

      return NextResponse.json({ sessionId: data.id, code: data.code });
    }

    // 코드면 code로 조회
    const { data, error } = await supabase
      .from("sessions")
      .select("id, code")
      .eq("code", key)
      .maybeSingle();

    if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
    if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({ sessionId: data.id, code: data.code });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "UNKNOWN" }, { status: 500 });
  }
}
