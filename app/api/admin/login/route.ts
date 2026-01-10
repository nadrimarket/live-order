import { NextResponse } from "next/server";
import { z } from "zod";
import { setAdminCookie } from "@/lib/adminAuth";

const schema = z.object({ password: z.string().min(1) });

export async function POST(req: Request) {
  const { password } = schema.parse(await req.json());
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) return NextResponse.json({ error: "서버에 ADMIN_PASSWORD가 설정되지 않았어요." }, { status: 500 });
  if (password !== expected) return NextResponse.json({ error: "비밀번호가 틀렸습니다." }, { status: 401 });
  setAdminCookie();
  return NextResponse.json({ ok: true });
}
