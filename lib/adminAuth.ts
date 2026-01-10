import { cookies } from "next/headers";

const COOKIE = "live_admin";

export function isAdmin() {
  const c = cookies().get(COOKIE)?.value;
  return c === "1";
}

export function setAdminCookie() {
  cookies().set(COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/" });
}

export function clearAdminCookie() {
  cookies().set(COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}
