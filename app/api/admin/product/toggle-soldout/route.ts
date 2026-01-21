import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { supabaseService } from "@/lib/supabase"; // ✅ 너 프로젝트에 이미 쓰던 그거

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const sb = supabaseService();

  // 1) 존재 확인
  const { data: cur, error: e1 } = await sb
    .from("products")
    .select("id,is_soldout")
    .eq("id", id)
    .maybeSingle();

  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });
  if (!cur) return NextResponse.json({ error: "product not found" }, { status: 404 });

  const next = !Boolean((cur as any).is_soldout);

  // 2) 업데이트 + 반환
  const { data: updated, error: e2 } = await sb
    .from("products")
    .update({ is_soldout: next })
    .eq("id", id)
    .select("id,is_soldout")
    .maybeSingle();

  if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });
  if (!updated) return NextResponse.json({ error: "update failed (0 rows)" }, { status: 400 });

  return NextResponse.json({ ok: true, item: updated });
}
