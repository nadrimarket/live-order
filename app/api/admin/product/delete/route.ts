import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/adminAuth";
import { supabaseService } from "@/lib/supabase";

const schema = z.object({ productId: z.string().min(1) });

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 401 });
  const { productId } = schema.parse(await req.json());
  const sb = supabaseService();

  const { data: p, error: pErr } = await sb.from("products").select("session_id").eq("id", productId).single();
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

  const { error } = await sb.from("products").delete().eq("id", productId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const { data: products } = await sb.from("products").select("*").eq("session_id", p.session_id).order("sort_order", { ascending: true });
  return NextResponse.json({ products: products ?? [] });
}
