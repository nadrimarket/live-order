import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { supabaseAnon } from "@/lib/supabase";

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const sb = supabaseAnon();

  const { data: cur, error: e1 } = await sb.from("products").select("id,is_active").eq("id", id).single();
  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

  const next = !Boolean(cur?.is_active);

  const { data, error } = await sb.from("products").update({ is_active: next }).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ item: data });
}
