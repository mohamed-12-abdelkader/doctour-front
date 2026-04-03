import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Next.js 16+: استخدم proxy بدل middleware (انظر nextjs.org/docs/messages/middleware-to-proxy) */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isAdminArea = path.startsWith("/admin");
  const isDoctorAppointments = path.startsWith("/doctor-appointments");
  const isPatientHistory = path.startsWith("/patient-history");
  const isProtected =
    (isAdminArea && !path.startsWith("/admin/login")) ||
    isDoctorAppointments ||
    isPatientHistory;
  const isLoginPage = path === "/admin/login";

  const token = request.cookies.get("admin-token")?.value;
  const role = request.cookies.get("admin-role")?.value;
  const isDoctor = role === "doctor";

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Doctor accounts are restricted to doctor appointments + patient history only.
  if (token && isDoctor) {
    const doctorAllowed = isDoctorAppointments || isPatientHistory;
    if (!doctorAllowed && !isLoginPage) {
      return NextResponse.redirect(new URL("/doctor-appointments", request.url));
    }
  }

  if (isLoginPage && token) {
    return NextResponse.redirect(
      new URL(isDoctor ? "/doctor-appointments" : "/admin/dashboard", request.url),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/doctor-appointments", "/patient-history/:path*"],
};
