import { NextResponse } from "next/server";
import { supabaseAnon } from "@/lib/supabase";

export async function GET(_: Request, { params }: { params: { sessionId: string } }) {
  const sb = supabaseAnon();

    const { data: session, error: e1 } = await sb
    .from("sessions")
    .select("*")
    .eq("id", params.sessionId)
    .eq("is_deleted", false)
    .single();
  
  if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

  const { data: products, error: e2 } = await sb
    .from("products")
    .select("*")
    .eq("session_id", params.sessionId)
    .order("sort_order", { ascending: true });

  if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

  return NextResponse.json({ session, products: products ?? [] });
}
