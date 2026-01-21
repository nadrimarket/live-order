import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { supabaseAnon } from "@/lib/supabase";

export async function GET(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = String(searchParams.get("sessionId") ?? "").trim();
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const sb = supabaseAnon();

  const { data, error } = await sb
    .from("products")
    .select("*")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ items: data ?? [] });
}
