import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

function isUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = String(searchParams.get("key") ?? "").trim();
    if (!key) return NextResponse.json({ error: "NO_KEY" }, { status: 400 });

    // UUID면 id로 조회
    if (isUuid(key)) {
      const { data, error } = await supabaseService
        .from("sessions")
        .select("id, code")
        .eq("id", key)
        .maybeSingle();

      if (error) return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
      if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

      return NextResponse.json({ sessionId: data.id, code: data.code });
    }

    // 코드면 code로 조회
    const { data, error } = await supabaseService
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
