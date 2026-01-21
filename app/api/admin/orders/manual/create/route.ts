import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function makeOrderToken() {
  // URL-safe 토큰 (order_token not-null 해결)
  // 24 bytes -> 32~ chars 정도
  return crypto.randomBytes(24).toString("base64url");
}

type LineIn = { product_id: string; qty: number };

function supabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE; // 혹시 다른 이름으로 쓰는 경우 대비

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY (service role) is missing");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ✅ 프로젝트에 이미 관리자 인증 로직이 있으면 여기만 네 방식으로 바꿔도 됨.
function requireAdmin(req: Request) {
  // 1) 환경변수 ADMIN_PIN을 쓰는 단순 방식
  const expected = process.env.ADMIN_PIN || "";
  if (!expected) return true; // ADMIN_PIN 안 쓰면 일단 통과(원하면 false로 바꿔도 됨)

  const pin = req.headers.get("x-admin-pin") ?? "";
  return pin === expected;
}

export async function POST(req: Request) {
  try {
    if (!requireAdmin(req)) return bad("unauthorized", 401);

    const body = await req.json().catch(() => ({}));

    const session_id = String(body?.session_id ?? "").trim();
    const nickname = String(body?.nickname ?? "").trim();

    const phone = String(body?.phone ?? "").trim();
    const postal_code = String(body?.postal_code ?? "").trim();
    const address1 = String(body?.address1 ?? "").trim();
    const address2 = String(body?.address2 ?? "").trim();
    const shipping = String(body?.shipping ?? "택배").trim(); // 기존 orders 컬럼과 맞춰야 함

    const lines: LineIn[] = Array.isArray(body?.lines) ? body.lines : [];

    if (!session_id) return bad("session_id is required");
    if (!nickname) return bad("nickname is required");
    if (lines.length === 0) return bad("lines is required");

    const normalized = lines
      .map((l) => ({
        product_id: String(l?.product_id ?? "").trim(),
        qty: Number(l?.qty ?? 0),
      }))
      .filter((l) => l.product_id && Number.isFinite(l.qty) && l.qty > 0);

    if (normalized.length === 0) return bad("valid lines required");

    const sb = supabaseService();

    // 세션 체크(삭제 세션 차단)
    const { data: sess, error: sErr } = await sb
      .from("sessions")
      .select("id, deleted_at, is_closed")
      .eq("id", session_id)
      .maybeSingle();

    if (sErr) return bad(sErr.message, 500);
    if (!sess) return bad("session not found", 404);
    if (sess.deleted_at) return bad("session is deleted", 403);

    // 상품 체크(세션 일치 + 품절/숨김/삭제 차단)
    const productIds = Array.from(new Set(normalized.map((l) => l.product_id)));

    const { data: products, error: pErr } = await sb
      .from("products")
      .select("id, session_id, price, is_soldout, deleted_at")
      .in("id", productIds);

    if (pErr) return bad(pErr.message, 500);

    const map = new Map<string, any>();
    (products ?? []).forEach((p) => map.set(p.id, p));

    for (const l of normalized) {
      const p = map.get(l.product_id);
      if (!p) return bad(`product not found: ${l.product_id}`, 404);
      if (p.session_id !== session_id) return bad("product session mismatch", 403);
      if (p.deleted_at) return bad("deleted product included", 400);
      if (p.is_soldout) return bad("sold out product included", 400);
      if (typeof p.price !== "number") return bad("invalid product price", 500);
    }

    const total_qty = normalized.reduce((a, l) => a + l.qty, 0);
    const total_amount = normalized.reduce((a, l) => {
      const p = map.get(l.product_id);
      return a + p.price * l.qty;
    }, 0);

    const order_token = makeOrderToken();

    // ✅ orders.insert 시 컬럼명이 네 테이블과 100% 일치해야 함
    // - 네 주문 목록에서 쓰는 필드들이: phone/postal_code/address1/address2/shipping/is_manual/order_token
    const { data: order, error: oErr } = await sb
      .from("orders")
      .insert({
        session_id,
        nickname,
        phone: phone || null,
        postal_code: postal_code || null,
        address1: address1 || null,
        address2: address2 || null,
        shipping: shipping || null,

        is_manual: true,
        order_token,

        total_qty,
        total_amount,
      })
      .select("id, order_token")
      .single();

    if (oErr) return bad(oErr.message, 500);

    const lineRows = normalized.map((l) => {
      const p = map.get(l.product_id);
      return {
        order_id: order.id,
        product_id: l.product_id,
        qty: l.qty,
        price: p.price,
        amount: p.price * l.qty,
      };
    });

    const { error: lErr } = await sb.from("order_lines").insert(lineRows);

    if (lErr) {
      // 롤백
      await sb.from("orders").delete().eq("id", order.id);
      return bad(lErr.message, 500);
    }

    return NextResponse.json({ ok: true, order_id: order.id, order_token: order.order_token });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e?.message ?? "unknown error" }, { status: 500 });
  }
}
