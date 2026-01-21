import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase/service";
import { makeOrderToken } from "@/lib/auth/orderToken";

// 입력 라인 타입
type LineIn = { product_id: string; qty: number };

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

// ✅ 프로젝트에 이미 관리자 인증 함수가 있다면 그걸로 교체해도 됨.
// 여기서는 "x-admin-pin" 헤더로 단순 체크하는 기본형 제공.
function requireAdmin(req: Request) {
  const pin = req.headers.get("x-admin-pin") ?? "";
  const expected = process.env.ADMIN_PIN ?? "";
  if (!expected) throw new Error("ADMIN_PIN env is not set");
  if (pin !== expected) return false;
  return true;
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

    const lines: LineIn[] = Array.isArray(body?.lines) ? body.lines : [];

    if (!session_id) return bad("session_id is required");
    if (!nickname) return bad("nickname is required");
    if (lines.length === 0) return bad("lines is required");

    // qty 정리
    const normalized = lines
      .map((l) => ({
        product_id: String(l?.product_id ?? "").trim(),
        qty: Number(l?.qty ?? 0),
      }))
      .filter((l) => l.product_id && Number.isFinite(l.qty) && l.qty > 0);

    if (normalized.length === 0) return bad("valid lines required");

    // 세션 존재/삭제/마감 체크 (마감이어도 수기주문 허용할지 정책 선택)
    // 보통 운영상 마감 후에도 관리자 수기 주문 추가가 필요할 수 있어
    // ✅ 여기서는 "삭제된 세션만 차단, 마감은 허용"으로 해둠.
    const { data: session, error: sErr } = await supabaseService
      .from("sessions")
      .select("id, deleted_at, is_closed")
      .eq("id", session_id)
      .maybeSingle();

    if (sErr) return bad(sErr.message, 500);
    if (!session) return bad("session not found", 404);
    if (session.deleted_at) return bad("session is deleted", 403);

    // 상품 유효성 + 세션 소속 + 품절 체크 + 가격 가져오기
    const productIds = Array.from(new Set(normalized.map((l) => l.product_id)));

    const { data: products, error: pErr } = await supabaseService
      .from("products")
      .select("id, session_id, price, is_sold_out, is_hidden, deleted_at")
      .in("id", productIds);

    if (pErr) return bad(pErr.message, 500);

    const map = new Map<string, any>();
    (products ?? []).forEach((p) => map.set(p.id, p));

    for (const l of normalized) {
      const p = map.get(l.product_id);
      if (!p) return bad(`product not found: ${l.product_id}`, 404);
      if (p.session_id !== session_id) return bad("product session mismatch", 403);
      if (p.deleted_at) return bad("deleted product included", 400);
      if (p.is_hidden) return bad("hidden product included", 400);
      if (p.is_sold_out) return bad("sold out product included", 400);
      if (typeof p.price !== "number") return bad("invalid product price", 500);
    }

    const total_qty = normalized.reduce((a, l) => a + l.qty, 0);
    const total_amount = normalized.reduce((a, l) => {
      const p = map.get(l.product_id);
      return a + p.price * l.qty;
    }, 0);

    // ✅ order_token을 반드시 생성해서 not-null 에러 방지
    const order_token = makeOrderToken(); // 기존 util 사용

    // orders 생성
    const { data: order, error: oErr } = await supabaseService
      .from("orders")
      .insert({
        session_id,
        nickname,
        phone: phone || null,
        postal_code: postal_code || null,
        address1: address1 || null,
        address2: address2 || null,

        is_manual: true,
        order_token,

        total_qty,
        total_amount,
      })
      .select("id, order_token")
      .single();

    if (oErr) return bad(oErr.message, 500);

    // order_lines 생성
    const lineRows = normalized.map((l) => {
      const p = map.get(l.product_id);
      return {
        order_id: order.id,
        product_id: l.product_id,
        qty: l.qty,
        price: p.price, // 주문 당시 가격 스냅샷
        amount: p.price * l.qty,
      };
    });

    const { error: lErr } = await supabaseService.from("order_lines").insert(lineRows);

    if (lErr) {
      // 간단 롤백
      await supabaseService.from("orders").delete().eq("id", order.id);
      return bad(lErr.message, 500);
    }

    return NextResponse.json({
      ok: true,
      order_id: order.id,
      order_token: order.order_token,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message ?? "unknown error" },
      { status: 500 }
    );
  }
}
