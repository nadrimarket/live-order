import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const orderId = String(body?.orderId ?? "").trim();
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const sb = supabaseService();

  const { data: cur, error: e0 } = await sb
    .from("orders")
    .select("id,shipped_at")
    .eq("id", orderId)
    .maybeSingle();

  if (e0) return NextResponse.json({ error: e0.message }, { status: 400 });
  if (!cur) return NextResponse.json({ error: "order not found" }, { status: 404 });

  const nextShippedAt = cur.shipped_at ? null : new Date().toISOString();

  const { error: e1 } = await sb.from("orders").update({ shipped_at: nextShippedAt }).eq("id", orderId);
  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

  return NextResponse.json({ ok: true, shipped_at: nextShippedAt });
}
