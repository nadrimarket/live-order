import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseService } from "@/lib/supabase";

const schema = z.object({
  token: z.string().min(10),
  nickname: z.string().min(1),
  shipping: z.enum(["일반", "제주/도서", "픽업"]),
  phone: z.string().min(1),
  postal_code: z.string().optional().default(""),
  address1: z.string().optional().default(""),
  address2: z.string().optional().default(""),
  lines: z.array(z.object({ product_id: z.string().min(1), qty: z.number().int().positive() })).min(1),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const sb = supabaseService();

    const { data: order, error: oErr } = await sb.from("orders").select("id,session_id").eq("edit_token", body.token).single();
    if (oErr) return NextResponse.json({ error: "주문을 찾을 수 없어요." }, { status: 404 });

    const { data: session, error: sErr } = await sb.from("sessions").select("is_closed").eq("id", order.session_id).single();
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });
    if (session.is_closed) return NextResponse.json({ error: "방송이 마감되어 고객 수정이 불가합니다." }, { status: 400 });

    const { error: uErr } = await sb.from("orders").update({
      nickname: body.nickname.trim(),
      shipping: body.shipping,
      phone: body.phone.trim(),
      postal_code: body.postal_code ?? "",
      address1: body.address1 ?? "",
      address2: body.address2 ?? "",
      updated_at: new Date().toISOString()
    }).eq("id", order.id);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 });

    const { error: dErr } = await sb.from("order_items").delete().eq("order_id", order.id);
    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 400 });

    const items = body.lines.map((l) => ({ order_id: order.id, product_id: l.product_id, qty: l.qty }));
    const { error: iErr } = await sb.from("order_items").insert(items);
    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "요청 오류" }, { status: 400 });
  }
}
