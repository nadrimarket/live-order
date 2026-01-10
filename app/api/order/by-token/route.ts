import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token 필요" }, { status: 400 });

  const sb = supabaseService();

  const { data: order, error: oErr } = await sb
    .from("orders")
    .select("id,session_id,nickname,shipping,phone,postal_code,address1,address2,edit_token,created_at")
    .eq("edit_token", token)
    .single();

  if (oErr) return NextResponse.json({ error: "주문을 찾을 수 없어요." }, { status: 404 });

  const { data: session, error: sErr } = await sb.from("sessions").select("*").eq("id", order.session_id).single();
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });

  const { data: products, error: pErr } = await sb.from("products").select("*").eq("session_id", order.session_id).order("sort_order", { ascending: true });
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

  const { data: items, error: iErr } = await sb.from("order_items").select("product_id,qty").eq("order_id", order.id);
  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 400 });

  const qtyById: Record<string, number> = {};
  for (const it of items ?? []) qtyById[it.product_id] = (qtyById[it.product_id] ?? 0) + it.qty;

  return NextResponse.json({ order, session, products: products ?? [], qtyById });
}
