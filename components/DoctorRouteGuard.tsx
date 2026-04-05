"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

function isDoctorAllowedPath(pathname: string): boolean {
  if (pathname === "/admin/login") return true;
  return (
    pathname.startsWith("/doctor-appointments") ||
    pathname.startsWith("/patient-history")
  );
}

/** يمنع حساب الطبيب من البقاء خارج مواعيد العيادة وتاريخ المريض (نسخة احتياطية مع الـ proxy). */
export function DoctorRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    if (!token) return;

    let role = "";
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const u = JSON.parse(raw) as {
          role?: string;
          user?: { role?: string };
        };
        role = String(u.role ?? u.user?.role ?? "").toLowerCase();
      }
    } catch {
      return;
    }
    if (role !== "doctor") return;
    if (isDoctorAllowedPath(pathname)) return;

    router.replace("/doctor-appointments");
  }, [pathname, router]);

  return null;
}
