import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { isAdmin } from "@/lib/adminAuth";

export async function GET(req: Request) {
  if (!isAdmin()) return NextResponse.json({ ok: false, error: "관리자 권한 필요" }, { status: 401 });

  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ ok: false, error: "sessionId가 필요합니다." }, { status: 400 });

  const sb = supabaseService();
  const { count, error } = await sb
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, count: count ?? 0 });
}
