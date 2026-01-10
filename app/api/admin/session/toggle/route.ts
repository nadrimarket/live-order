import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/adminAuth";
import { supabaseService } from "@/lib/supabase";

const schema = z.object({ sessionId: z.string().min(1), is_closed: z.boolean() });

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 401 });
  const { sessionId, is_closed } = schema.parse(await req.json());
  const sb = supabaseService();

  const { data, error } = await sb.from("sessions").update({ is_closed }).eq("id", sessionId).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ session: data });
}
