import { NextResponse } from "next/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import { supabaseService } from "@/lib/supabase";

const schema = z.object({
  sessionId: z.string().min(1),
  nickname: z.string().min(1),
  shipping: z.enum(["일반", "제주/도서", "픽업"]),
  phone: z.string().min(1),
  postal_code: z.string().optional().default(""),
  address1: z.string().optional().default(""),
  address2: z.string().optional().default(""),
  lines: z
    .array(z.object({ product_id: z.string().min(1), qty: z.number().int().positive() }))
    .min(1),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const sb = supabaseService();

    // 1) 세션 확인 + 마감 확인
    const { data: session, error: sErr } = await sb
      .from("sessions")
      .select("id,is_closed")
      .eq("id", body.sessionId)
      .maybeSingle();

    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });
    if (!session) return NextResponse.json({ error: "세션을 찾을 수 없어요." }, { status: 404 });
    if (session.is_closed) return NextResponse.json({ error: "이미 마감된 방송이에요." }, { status: 400 });

    // 2) 품절 상품 차단 (서버에서 최종 방어)
    const ids = Array.from(new Set(body.lines.map((l) => l.product_id)));

    const { data: prodRows, error: pErr } = await sb
      .from("products")
      .select("id,is_soldout,session_id")
      .in("id", ids);

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

    // 다른 세션 상품 섞임 방지 + 존재하지 않는 상품 방지
    const foundIds = new Set((prodRows ?? []).map((r: any) => r.id));
    const missing = ids.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      return NextResponse.json({ error: "존재하지 않는 상품이 포함되어 있어요." }, { status: 400 });
    }

    const wrongSession = (prodRows ?? []).some((r: any) => r.session_id !== body.sessionId);
    if (wrongSession) {
      return NextResponse.json({ error: "다른 세션의 상품이 포함되어 있어요." }, { status: 400 });
    }

    const soldout = (prodRows ?? []).filter((r: any) => !!r.is_soldout).map((r: any) => r.id);
    if (soldout.length > 0) {
      return NextResponse.json({ error: "품절된 상품이 포함되어 있어 주문할 수 없습니다." }, { status: 400 });
    }

    // 3) 주문 생성
    const editToken = nanoid(32);

    const { data: order, error: oErr } = await sb
      .from("orders")
      .insert({
        session_id: body.sessionId,
        nickname: body.nickname.trim(),
        shipping: body.shipping,
        phone: body.phone.trim(),
        postal_code: body.postal_code ?? "",
        address1: body.address1 ?? "",
        address2: body.address2 ?? "",
        edit_token: editToken,
      })
      .select("id,edit_token")
      .maybeSingle();

    if (oErr) return NextResponse.json({ error: oErr.message }, { status: 400 });
    if (!order) return NextResponse.json({ error: "주문 생성 실패" }, { status: 400 });

    // 4) 주문 아이템 생성
    const items = body.lines.map((l) => ({
      order_id: order.id,
      product_id: l.product_id,
      qty: l.qty,
    }));

    const { error: iErr } = await sb.from("order_items").insert(items);
    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 400 });

    return NextResponse.json({ editToken });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "요청 오류" }, { status: 400 });
  }
}
