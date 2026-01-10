import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/adminAuth";
import { supabaseService } from "@/lib/supabase";

const schema = z.object({ title: z.string().min(1) });

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 401 });
  const { title } = schema.parse(await req.json());
  const sb = supabaseService();

  const { data, error } = await sb.from("sessions").insert({
    title,
    is_closed: false,
    ship_threshold: 100000,
    ship_fee_normal: 3500,
    ship_fee_jeju: 7000,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id });
}
