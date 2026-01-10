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
  lines: z.array(z.object({ product_id: z.string().min(1), qty: z.number().int().positive() })).min(1),
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const sb = supabaseService();

    const { data: session, error: sErr } = await sb.from("sessions").select("id,is_closed").eq("id", body.sessionId).single();
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 400 });
    if (session.is_closed) return NextResponse.json({ error: "이미 마감된 방송이에요." }, { status: 400 });

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
      .single();

    if (oErr) return NextResponse.json({ error: oErr.message }, { status: 400 });

    const items = body.lines.map((l) => ({ order_id: order.id, product_id: l.product_id, qty: l.qty }));
    const { error: iErr } = await sb.from("order_items").insert(items);
    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 400 });

    return NextResponse.json({ editToken });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "요청 오류" }, { status: 400 });
  }
}
