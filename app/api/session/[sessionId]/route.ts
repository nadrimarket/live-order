import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { supabaseService } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: { sessionId: string } }) {
  if (!isAdmin()) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 401 });
  const sb = supabaseService();

  // ✅ 삭제된 세션 제외
  const { data: session, error: e1 } = await sb
    .from("sessions")
    .select("*")
    .eq("id", params.sessionId)
    .is("deleted_at", null)
    .single();

  // 삭제된 세션이거나 없는 세션이면 404 느낌으로 처리
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
