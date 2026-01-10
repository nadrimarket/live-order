import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 401 });
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId 필요" }, { status: 400 });

  const sb = supabaseService();

  // Get products for the session
  const { data: products, error: pErr } = await sb.from("products").select("id,name,price").eq("session_id", sessionId);
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

  // Get all orders in the session
  const { data: orders, error: oErr } = await sb.from("orders").select("id").eq("session_id", sessionId).limit(5000);
  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 400 });

  const orderIds = (orders ?? []).map(o => o.id);
  if (orderIds.length === 0) {
    const rows = (products ?? []).map(p => ({ product_id: p.id, name: p.name, price: p.price, sold_qty: 0, revenue: 0 }));
    return NextResponse.json({ rows });
  }

  const { data: items, error: iErr } = await sb.from("order_items").select("product_id,qty,order_id").in("order_id", orderIds);
  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 400 });

  const soldByProduct = new Map<string, number>();
  for (const it of items ?? []) soldByProduct.set(it.product_id, (soldByProduct.get(it.product_id) ?? 0) + it.qty);

  const rows = (products ?? []).map(p => {
    const sold_qty = soldByProduct.get(p.id) ?? 0;
    const revenue = sold_qty * (p.price ?? 0);
    return { product_id: p.id, name: p.name, price: p.price, sold_qty, revenue };
  }).sort((a,b)=> (b.revenue - a.revenue));

  return NextResponse.json({ rows });
}
