import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ ok: false, error: "관리자 권한 필요" }, { status: 401 });

  const { sessionId } = await req.json();
  if (!sessionId) return NextResponse.json({ ok: false, error: "sessionId 필요" }, { status: 400 });

  const sb = supabaseService();

  const { error } = await sb
    .from("sessions")
    .update({ is_deleted: true })   // ✅ 핵심
    .eq("id", sessionId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
