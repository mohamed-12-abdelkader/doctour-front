import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Next.js 16+: استخدم proxy بدل middleware (انظر nextjs.org/docs/messages/middleware-to-proxy) */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isProtected =
    path.startsWith("/admin") && !path.startsWith("/admin/login");
  const isLoginPage = path === "/admin/login";

  const token = request.cookies.get("admin-token")?.value;

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (isLoginPage && token) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
