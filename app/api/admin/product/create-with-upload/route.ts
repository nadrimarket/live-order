import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { supabaseService } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeExt(name: string) {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = m?.[1] ?? "jpg";
  return ext.replace(/[^a-z0-9]/g, "");
}

export async function POST(req: Request) {
  try {
    if (!isAdmin()) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 401 });

    const form = await req.formData();
    const sessionId = String(form.get("sessionId") ?? "").trim();
    const name = String(form.get("name") ?? "").trim();
    const price = Number(String(form.get("price") ?? "0").replace(/[^0-9]/g, ""));
    const file = form.get("file");

    if (!sessionId) return NextResponse.json({ error: "sessionId 필요" }, { status: 400 });
    if (!name) return NextResponse.json({ error: "물품명 필요" }, { status: 400 });
    if (!Number.isFinite(price) || price <= 0) return NextResponse.json({ error: "가격이 올바르지 않아요." }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "이미지 파일이 필요합니다." }, { status: 400 });

    const sb = supabaseService();

    // 1) Upload image to Supabase Storage (public bucket: product-images)
    const ext = safeExt(file.name);
    const path = `${sessionId}/${crypto.randomUUID()}.${ext}`;
    const arr = new Uint8Array(await file.arrayBuffer());

    const { error: upErr } = await sb.storage.from("product-images").upload(path, arr, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });
    if (upErr) return NextResponse.json({ error: `이미지 업로드 실패: ${upErr.message}` }, { status: 400 });

    const { data: pub } = sb.storage.from("product-images").getPublicUrl(path);
    const image_url = pub.publicUrl;

    // 2) Create product row
    const { data: maxRow } = await sb
      .from("products")
      .select("sort_order")
      .eq("session_id", sessionId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxRow?.sort_order ?? 0) + 1;

    const { error: insErr } = await sb.from("products").insert({
      session_id: sessionId,
      name,
      price,
      image_url,
      is_active: true,
      sort_order: nextOrder,
    });

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

    const { data: products, error: pErr } = await sb
      .from("products")
      .select("*")
      .eq("session_id", sessionId)
      .order("sort_order", { ascending: true });

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });
    return NextResponse.json({ products: products ?? [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "요청 오류" }, { status: 400 });
  }
}
