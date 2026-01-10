import { NextResponse } from "next/server";
import { clearAdminCookie } from "@/lib/adminAuth";

export async function GET(req: Request) {
  clearAdminCookie();
  const url = new URL(req.url);
  return NextResponse.redirect(new URL("/admin/login", url.origin));
}
