import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: Request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 401 });
  }

  const { sessionId } = await req.json();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId 필요" }, { status: 400 });
  }

  const sb = supabaseService();

  // ✅ 핵심: 실제 삭제가 아니라 soft delete
  const { error } = await sb
    .from("sessions")
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
