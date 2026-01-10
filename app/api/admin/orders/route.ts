import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/adminAuth";
import { supabaseService } from "@/lib/supabase";

export async function GET(req: Request) {
  if (!isAdmin()) return NextResponse.json({ error: "관리자 권한 필요" }, { status: 401 });
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "sessionId 필요" }, { status: 400 });

  const sb = supabaseService();
  const { data, error } = await sb
    .from("orders")
    .select("id,session_id,nickname,shipping,phone,postal_code,address1,address2,edit_token,created_at")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false })
    .limit(5000);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ orders: data ?? [] });
}
