import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token 필요" }, { status: 400 });

  const sb = supabaseService();

  const { data: order, error: oErr } = await sb
    .from("orders")
    .select("id,session_id,nickname,shipping,phone,postal_code,address1,address2")
    .eq("edit_token", token)
    .single();

  if (oErr) return NextResponse.json({ error: "주문을 찾을 수 없어요." }, { status: 404 });

  const { data: session, error: sErr } = await sb
    .from("sessions")
    .select("ship_threshold,ship_fee_normal,ship_fee_jeju")
    .eq("id", order.session_id)
    .single();

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });

  const { data: items, error: iErr } = await sb
    .from("order_items")
    .select("product_id,qty")
    .eq("order_id", order.id);

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 400 });

  const { data: products, error: pErr } = await sb
    .from("products")
    .select("id,name,price")
    .eq("session_id", order.session_id);

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

  const pById = new Map((products ?? []).map((p) => [p.id, p] as const));
  const agg = new Map<string, number>();
  for (const it of items ?? []) agg.set(it.product_id, (agg.get(it.product_id) ?? 0) + it.qty);

  const lines = Array.from(agg.entries()).map(([pid, qty]) => {
    const p = pById.get(pid);
    const price = p?.price ?? 0;
    return { name: p?.name ?? "(삭제된 상품)", qty, amount: qty * price };
  });

  const goodsTotal = lines.reduce((s, l) => s + l.amount, 0);

  let shippingFee = 0;
  if (goodsTotal > 0 && goodsTotal < session.ship_threshold) {
    if (order.shipping === "픽업") shippingFee = 0;
    else if (order.shipping === "제주/도서") shippingFee = session.ship_fee_jeju;
    else shippingFee = session.ship_fee_normal;
  }

  const { data: noticeRow } = await sb.from("session_notices").select("notice").eq("session_id", order.session_id).single();

  const address = `${order.postal_code ? `[${order.postal_code}] ` : ""}${order.address1 ?? ""}${order.address2 ? " " + order.address2 : ""}`.trim();

  return NextResponse.json({
    receipt: {
      sessionId: order.session_id,
      nickname: order.nickname,
      shipping: order.shipping,
      phone: order.phone ?? "",
      address,
      goodsTotal,
      shippingFee,
      finalTotal: goodsTotal + shippingFee,
      lines,
    },
    notice: noticeRow?.notice ?? "",
  });
}
