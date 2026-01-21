import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { supabaseService } from "@/lib/supabase";

export async function POST(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id ?? "").trim();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const patch: any = {};
  if (body?.name !== undefined) patch.name = String(body.name ?? "").trim();
  if (body?.price !== undefined) patch.price = Number(body.price ?? 0);
  if (body?.sort_order !== undefined) patch.sort_order = Number(body.sort_order ?? 1);
  if (body?.image_url !== undefined) patch.image_url = body.image_url ? String(body.image_url) : null;

  if (patch.name !== undefined && !patch.name) {
    return NextResponse.json({ error: "name required" }, { status: 400 });
  }
  if (patch.price !== undefined && (!Number.isFinite(patch.price) || patch.price <= 0)) {
    return NextResponse.json({ error: "invalid price" }, { status: 400 });
  }
  if (patch.sort_order !== undefined && (!Number.isFinite(patch.sort_order) || patch.sort_order <= 0)) {
    return NextResponse.json({ error: "invalid sort_order" }, { status: 400 });
  }

  const sb = supabaseService();

  // 1) 존재 확인 (0/다건 방지)
  const { data: cur, error: e0 } = await sb
    .from("products")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (e0) return NextResponse.json({ error: e0.message }, { status: 400 });
  if (!cur) return NextResponse.json({ error: "product not found" }, { status: 404 });

  // 2) 업데이트 + 반환 (maybeSingle)
  const { data: updated, error: e1 } = await sb
    .from("products")
    .update(patch)
    .eq("id", id)
    .select("id,name,price,image_url,sort_order,is_soldout,session_id,created_at")
    .maybeSingle();

  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });
  if (!updated) return NextResponse.json({ error: "update failed (0 rows)" }, { status: 400 });

  return NextResponse.json({ ok: true, item: updated });
}
