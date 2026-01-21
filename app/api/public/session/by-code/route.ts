import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = String(searchParams.get("code") ?? "").trim();
  if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

  // ✅ 중요: 너 sessions 테이블에 "code 컬럼명이 다름"
  // 그래서 아래 줄에서 'code'를 실제 컬럼명으로 바꿔줘야 함.
  // 예: session_code / public_code / join_code / slug ...
  const CODE_COL = "code"; // <-- 여기만 너 DB에 맞게 변경

  const { data, error } = await supabaseService
    .from("sessions")
    .select("id, title, is_closed")
    // @ts-expect-error dynamic column
    .eq(CODE_COL, code)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ session: data });
}
