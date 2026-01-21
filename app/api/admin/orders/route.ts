import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { supabaseService } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const sessionId = String(searchParams.get("sessionId") ?? "").trim();
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  const includeDeleted = String(searchParams.get("includeDeleted") ?? "0") === "1";

  const sb = supabaseService();

  let q = sb
    .from("orders")
    .select(
      "id,session_id,nickname,phone,postal_code,address1,address2,shipping,edit_token,paid_at,shipped_at,deleted_at,created_at,is_manual"
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (!includeDeleted) q = q.is("deleted_at", null);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, orders: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
