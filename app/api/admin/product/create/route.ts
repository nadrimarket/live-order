import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { supabaseAnon } from "@/lib/supabase";

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const sessionId = String(body?.sessionId ?? "").trim();
  const name = String(body?.name ?? "").trim();
  const price = Number(body?.price ?? 0);

  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ error: "invalid price" }, { status: 400 });

  const sb = supabaseAnon();

  // sort_order: 같은 세션 내에서 마지막 값 + 1
  const { data: lastRow, error: e1 } = await sb
    .from("products")
    .select("sort_order")
    .eq("session_id", sessionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

  const nextSort = Number(lastRow?.sort_order ?? 0) + 1;

  const { data: item, error: e2 } = await sb
    .from("products")
    .insert({
      session_id: sessionId,
      name,
      price,
      image_url: null,
      sort_order: nextSort,
      // is_active 기본 true, is_soldout 있으면 기본 false (DB default가 있으면 자동)
    })
    .select("*")
    .single();

  if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

  return NextResponse.json({ ok: true, item });
}
