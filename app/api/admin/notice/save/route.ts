import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/adminAuth";
import { supabaseService } from "@/lib/supabase";

const schema = z.object({ sessionId: z.string().min(1), notice: z.string().optional() });

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 401 });
  const { sessionId, notice } = schema.parse(await req.json());
  const sb = supabaseService();

  const { error } = await sb.from("session_notices").upsert({ session_id: sessionId, notice: notice ?? "" }, { onConflict: "session_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
