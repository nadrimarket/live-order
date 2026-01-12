// app/api/sessions/route.ts (또는 세션 목록을 담당하는 route.ts)

export const dynamic = "force-dynamic"; // ✅ 캐시 방지 (중요)

import { NextResponse } from "next/server";
import { createClient } from "@/supabase/server";

export async function GET() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .is("deleted_at", null) // ✅ 여기!!!
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    sessions: data ?? [],
  });
}
