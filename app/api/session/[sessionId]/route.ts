import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: { sessionId: string } }) {
  const sb = supabaseService();

  const { data: session, error: e1 } = await sb
    .from("sessions")
    .select("*")
    .eq("id", params.sessionId)
    .eq("is_deleted", false) // ✅ 핵심: 삭제된 세션 차단
    .single();

  if (e1 || !session) {
    return NextResponse.json({ error: "세션을 찾을 수 없음" }, { status: 404 });
  }

  const { data: products, error: e2 } = await sb
    .from("products")
    .select("*")
    .eq("session_id", params.sessionId)
    .order("sort_order", { ascending: true });

  if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

  const { data: noticeRow } = await sb
    .from("session_notices")
    .select("notice")
    .eq("session_id", params.sessionId)
    .single();

  return NextResponse.json({ session, products: products ?? [], notice: noticeRow?.notice ?? "" });
}
