import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Next.js 16+: استخدم proxy بدل middleware (انظر nextjs.org/docs/messages/middleware-to-proxy) */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const token = request.cookies.get("admin-token")?.value;
  const role = request.cookies.get("admin-role")?.value;
  const isDoctor = role === "doctor";
  const isLoginPage = path === "/admin/login";

  const isDoctorAllowedRoute =
    path.startsWith("/doctor-appointments") ||
    path.startsWith("/patient-history");

  // طبيب: يسمح فقط بصفحة المواعيد + تاريخ المريض (ومسار تسجيل الدخول قبل إعادة التوجيه)
  if (token && isDoctor && !isDoctorAllowedRoute && !isLoginPage) {
    return NextResponse.redirect(new URL("/doctor-appointments", request.url));
  }

  const isAdminArea = path.startsWith("/admin");
  const isDoctorAppointments = path.startsWith("/doctor-appointments");
  const isPatientHistory = path.startsWith("/patient-history");
  const isMonthlyAccounts = path.startsWith("/monthly-accounts");
  const isOnlineBookings = path.startsWith("/online-bookings");
  const isTodayBookings = path.startsWith("/today-bookings");

  const isProtected =
    (isAdminArea && !isLoginPage) ||
    isDoctorAppointments ||
    isPatientHistory ||
    isMonthlyAccounts ||
    isOnlineBookings ||
    isTodayBookings;

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (isLoginPage && token) {
    return NextResponse.redirect(
      new URL(isDoctor ? "/doctor-appointments" : "/admin/dashboard", request.url),
    );
  }

  return NextResponse.next();
}

/** يشمل `/` حتى يُعاد توجيه الطبيب من الرئيسية إلى عيادة الدكتورة */
export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/doctor-appointments",
    "/doctor-appointments/:path*",
    "/patient-history/:path*",
    "/monthly-accounts",
    "/monthly-accounts/:path*",
    "/online-bookings",
    "/online-bookings/:path*",
    "/today-bookings",
    "/today-bookings/:path*",
  ],
};
