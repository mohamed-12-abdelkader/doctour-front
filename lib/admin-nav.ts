import {
  Calendar,
  Stethoscope,
  Globe,
  Calculator,
  Home,
  Users,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type AdminPageLink = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  group: string;
  permission: string | string[] | null;
  showOnlyForFullAdmin?: boolean;
};

/** صلاحية مطلوبة للرابط. showOnlyForFullAdmin: يظهر فقط للأدمن اللي الـ permissions عندهم فاضية. */
export const PAGE_LINKS: AdminPageLink[] = [
  {
    href: "/today-bookings",
    title: "حجوزات اليوم",
    description: "عرض وإدارة حجوزات اليوم وتفاصيل العملاء",
    icon: Calendar,
    color: "#615b36",
    bg: "#fdfbf7",
    group: "الحجوزات",
    permission: "manage_daily_bookings",
  },
  {
    href: "/doctor-appointments",
    title: "عيادة الدكتورة",
    description: "جدول المواعيد وحالة الكشف للدكتورة",
    icon: Stethoscope,
    color: "#2d6a4f",
    bg: "#e8f5e9",
    group: "الحجوزات",
    permission: "manage_daily_bookings",
    showOnlyForFullAdmin: true,
  },
  {
    href: "/admin/working-days",
    title: "ساعات العمل",
    description: "جدولة أيام وأوقات قبول الحجوزات بنظام المواعيد (Slots)",
    icon: Clock,
    color: "#2d6a4f",
    bg: "#f0faf5",
    group: "الحجوزات",
    permission: "manage_daily_bookings",
    showOnlyForFullAdmin: true,
  },
  {
    href: "/online-bookings",
    title: "الحجوزات أونلاين",
    description: "إدارة الحجوزات القادمة من الموقع",
    icon: Globe,
    color: "#1e40af",
    bg: "#eff6ff",
    group: "الحجوزات",
    permission: "manage_online_bookings",
  },
  {
    href: "/monthly-accounts",
    title: "الحسابات الشهرية",
    description: "إيرادات ومصروفات الشهر والتقارير",
    icon: Calculator,
    color: "#7c3aed",
    bg: "#f5f3ff",
    group: "الإدارة",
    permission: "manage_accounts",
  },
  {
    href: "/admin/accounts",
    title: "إدارة الحسابات",
    description:
      "الموظفين والصلاحيات (عرض للجميع، إنشاء/تعديل/حذف للسوبر أدمن فقط)",
    icon: Users,
    color: "#b45309",
    bg: "#fff7ed",
    group: "الإدارة",
    permission: "manage_accounts",
  },
];

const ALL_DASHBOARD_PERMISSIONS = [
  "manage_online_bookings",
  "manage_daily_bookings",
  "manage_accounts",
] as const;

export function getCurrentUserPermissions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return [];
    const data = JSON.parse(raw) as Record<string, unknown>;
    const perms = (data.permissions ??
      (data.user as Record<string, unknown>)?.permissions) as
      | string[]
      | Array<{ name: string }>
      | undefined;
    const list = Array.isArray(perms)
      ? perms
          .map((p) => (typeof p === "string" ? p : (p?.name ?? "")))
          .filter(Boolean)
      : [];
    if (list.length === 0) return [...ALL_DASHBOARD_PERMISSIONS];
    return list;
  } catch {
    return [];
  }
}

export function getIsFullAdmin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return false;
    const data = JSON.parse(raw) as Record<string, unknown>;
    const perms = (data.permissions ??
      (data.user as Record<string, unknown>)?.permissions) as
      | string[]
      | Array<{ name: string }>
      | undefined;
    return !Array.isArray(perms) || perms.length === 0;
  } catch {
    return false;
  }
}

/**
 * سوبر أدمن: `role === "admin"` ومصفوفة `permissions` فارغة `[]`
 * (نفس شكل الاستجابة بعد تسجيل الدخول — صلاحيات كاملة من السيرفر دون قائمة صلاحيات).
 */
export function isSuperAdminUser(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return false;
    const data = JSON.parse(raw) as Record<string, unknown>;
    const role = (data.role ??
      (data.user as Record<string, unknown>)?.role) as string | undefined;
    const perms = (data.permissions ??
      (data.user as Record<string, unknown>)?.permissions) as
      | string[]
      | Array<{ name: string }>
      | undefined;
    if (role !== "admin") return false;
    if (!Array.isArray(perms)) return false;
    return perms.length === 0;
  } catch {
    return false;
  }
}

export function canSeeLink(
  linkPermission: string | string[] | null,
  userPermissions: string[],
): boolean {
  if (linkPermission == null) return true;
  const required = Array.isArray(linkPermission)
    ? linkPermission
    : [linkPermission];
  return required.some((p) => userPermissions.includes(p));
}

export function getVisibleNavLinks(
  permissions: string[],
  isFullAdmin: boolean,
): AdminPageLink[] {
  return PAGE_LINKS.filter((link) => {
    if (!canSeeLink(link.permission, permissions)) return false;
    if (link.showOnlyForFullAdmin && !isFullAdmin) return false;
    return true;
  });
}

/** هل يوجد يوزر مسجل دخول (أدمن)؟ */
export function isAdminLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!(localStorage.getItem("token") || localStorage.getItem("user"));
}
