import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { supabaseAnon } from "@/lib/supabase";

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

  const sb = supabaseAnon();

  const { error } = await sb.from("products").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
