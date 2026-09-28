import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifyToken } from "./lib/jwt";

const PUBLIC = ["/login", "/register"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE)?.value;
  const uid = token ? await verifyToken(token) : null;
  const isPublic = PUBLIC.includes(pathname);
  if (!uid && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (uid && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/today";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
