"use client";

import { useMemo, useState, useEffect } from "react";
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  SimpleGrid,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Stethoscope,
  Globe,
  Calculator,
  Home,
  ChevronLeft,
  Users,
  LogOut,
} from "lucide-react";

/** صلاحية مطلوبة للرابط. showOnlyForFullAdmin: يظهر فقط للأدمن اللي الـ permissions عندهم فاضية. */
const PAGE_LINKS: Array<{
  href: string;
  title: string;
  description: string;
  icon: typeof Calendar;
  color: string;
  bg: string;
  group: string;
  permission: string | string[] | null;
  showOnlyForFullAdmin?: boolean;
}> = [
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
    description: "الموظفين والصلاحيات (عرض للجميع، إنشاء/تعديل/حذف للسوبر أدمن فقط)",
    icon: Users,
    color: "#b45309",
    bg: "#fff7ed",
    group: "الإدارة",
    permission: "manage_accounts",
  },
  {
    href: "/",
    title: "الموقع الرئيسي",
    description: "الصفحة الرئيسية للموقع للزوار",
    icon: Home,
    color: "#0f766e",
    bg: "#f0fdfa",
    group: "أخرى",
    permission: null,
  },
];

const ALL_DASHBOARD_PERMISSIONS = [
  "manage_online_bookings",
  "manage_daily_bookings",
  "manage_accounts",
] as const;

function getCurrentUserPermissions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return [];
    const data = JSON.parse(raw) as Record<string, unknown>;
    const perms = (data.permissions ?? (data.user as Record<string, unknown>)?.permissions) as
      | string[]
      | Array<{ name: string }>
      | undefined;
    const list = Array.isArray(perms)
      ? perms.map((p) => (typeof p === "string" ? p : p?.name ?? "")).filter(Boolean)
      : [];
    // أدمن مسجّل دخول وبدون صلاحيات محددة = يملك كل الصلاحيات
    if (list.length === 0) return [...ALL_DASHBOARD_PERMISSIONS];
    return list;
  } catch {
    return [];
  }
}

/** هل المستخدم أدمن كامل (الـ permissions المخزنة فاضية أو غير موجودة)؟ */
function getIsFullAdmin(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return false;
    const data = JSON.parse(raw) as Record<string, unknown>;
    const perms = (data.permissions ?? (data.user as Record<string, unknown>)?.permissions) as
      | string[]
      | Array<{ name: string }>
      | undefined;
    return !Array.isArray(perms) || perms.length === 0;
  } catch {
    return false;
  }
}

function canSeeLink(linkPermission: string | string[] | null, userPermissions: string[]): boolean {
  if (linkPermission == null) return true;
  const required = Array.isArray(linkPermission) ? linkPermission : [linkPermission];
  return required.some((p) => userPermissions.includes(p));
}

export default function AdminDashboard() {
  const router = useRouter();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isFullAdmin, setIsFullAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setPermissions(getCurrentUserPermissions());
    setIsFullAdmin(getIsFullAdmin());
    setMounted(true);
  }, []);

  const visibleLinks = useMemo(
    () =>
      PAGE_LINKS.filter((link) => {
        if (!canSeeLink(link.permission, permissions)) return false;
        if (link.showOnlyForFullAdmin && !isFullAdmin) return false;
        return true;
      }),
    [permissions, isFullAdmin]
  );
  const groups = useMemo(
    () => [...new Set(visibleLinks.map((l) => l.group))],
    [visibleLinks]
  );

  const welcomeName = useMemo(() => {
    if (typeof window === "undefined") return "الأدمن";
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return "الأدمن";
      const data = JSON.parse(raw) as Record<string, unknown>;
      const name = (data.name ?? (data.user as Record<string, unknown>)?.name) as string | undefined;
      return name || "الأدمن";
    } catch {
      return "الأدمن";
    }
  }, [mounted]);

  const handleLogout = async () => {
    // حذف كل بيانات المستخدم من اللوكال استوريج والكوكيز أولاً (كانه مش مسجل)
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      // إزالة كوكي الأدمن بأي path مستخدم
      const expire = "expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/";
      document.cookie = `admin-token=; ${expire}`;
      document.cookie = `admin-token=; ${expire}; path=/admin`;
    }
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    }
    router.push("/admin/login");
  };

  return (
    <Box minH="100vh" bg="gray.50" dir="rtl" fontFamily="var(--font-tajawal)">
      {/* Main Content */}
      <Container maxW="7xl" py={10}>
        {/* Welcome */}
        <Box
          bg="white"
          p={8}
          borderRadius="2xl"
          boxShadow="sm"
          mb={10}
          borderRight="4px solid"
          borderRightColor="#615b36"
        >
          <Flex justify="space-between" align="flex-start" gap={4} flexWrap="wrap">
            <Box flex={1} minW={0}>
              <Heading
                size="lg"
                mb={2}
                fontFamily="var(--font-cairo)"
                color="#544f30"
              >
                {mounted ? `أهلاً بك، ${welcomeName}` : "أهلاً بك، الأدمن"}
              </Heading>
              <Text color="gray.600" fontSize="md">
                {visibleLinks.length > 0
                  ? "من هنا يمكنك الوصول لصفحات التطبيق حسب صلاحياتك."
                  : mounted
                    ? "لا توجد لديك صلاحيات لعرض أي صفحة. تواصل مع المسؤول."
                    : "جاري التحميل..."}
              </Text>
            </Box>
            <Button
              variant="outline"
              colorScheme="red"
              size="sm"
              onClick={handleLogout}
              flexShrink={0}
              gap={2}
            >
              <LogOut size={18} />
              تسجيل خروج
            </Button>
          </Flex>
        </Box>

        {/* Page Links by Group */}
        {mounted && visibleLinks.length === 0 && (
          <Box p={6} bg="orange.50" borderRadius="xl" borderWidth="1px" borderColor="orange.200" textAlign="center">
            <Text color="orange.800" fontWeight="medium">لا توجد صلاحيات</Text>
            <Text color="orange.700" fontSize="sm" mt={1}>لم يتم تعيين أي صلاحية لحسابك. راجع المسؤول لإدارة الحسابات.</Text>
          </Box>
        )}
        {groups.map((group) => (
          <Box key={group} mb={10}>
            <Flex align="center" gap={2} mb={5}>
              <Box w="4px" h="24px" bg="#615b36" borderRadius="full" />
              <Heading size="md" fontFamily="var(--font-cairo)" color="#544f30">
                {group}
              </Heading>
            </Flex>
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={5}>
              {visibleLinks.filter((link) => link.group === group).map((link) => {
                const IconComp = link.icon;
                return (
                  <Box
                    key={link.href}
                    as="button"
                    onClick={() => router.push(link.href)}
                    w="full"
                    textAlign="right"
                    p={6}
                    bg="white"
                    borderRadius="xl"
                    boxShadow="sm"
                    border="1px solid"
                    borderColor="gray.100"
                    transition="all 0.25s ease"
                    _hover={{
                      transform: "translateY(-4px)",
                      boxShadow: "lg",
                      borderColor: link.color,
                      bg: link.bg,
                    }}
                    _active={{ transform: "translateY(-1px)" }}
                  >
                    <Flex align="start" justify="space-between" gap={4}>
                      <Box
                        p={3}
                        borderRadius="xl"
                        bg={link.bg}
                        color={link.color}
                        flexShrink={0}
                      >
                        <IconComp size={28} />
                      </Box>
                      <Box flex={1} minW={0}>
                        <Text
                          fontWeight="bold"
                          fontSize="lg"
                          color="#2d3748"
                          mb={1}
                        >
                          {link.title}
                        </Text>
                        <Text
                          fontSize="sm"
                          color="gray.500"
                          lineHeight="tall"
                          noOfLines={2}
                        >
                          {link.description}
                        </Text>
                      </Box>
                      <Box
                        color={link.color}
                        opacity={0.8}
                        _groupHover={{ transform: "translateX(-4px)" }}
                        transition="transform 0.2s"
                        flexShrink={0}
                        mt={1}
                      >
                        <ChevronLeft size={20} />
                      </Box>
                    </Flex>
                  </Box>
                );
              })}
            </SimpleGrid>
          </Box>
        ))}

        {/* Seed hint - optional */}
        <Box
          mt={8}
          p={4}
          bg="orange.50"
          borderRadius="xl"
          border="1px solid"
          borderColor="orange.100"
        >
          <Text fontSize="sm" color="orange.800">
            <Text as="span" fontWeight="bold">
              ملاحظة:
            </Text>{" "}
            في حال الحاجة لتهيئة قاعدة البيانات، يمكنك تشغيل{" "}
            <Text
              as="a"
              href="/api/seed"
              target="_blank"
              rel="noopener"
              color="orange.600"
              textDecoration="underline"
              _hover={{ color: "orange.700" }}
              fontWeight="bold"
            >
              نقطة الـ seed
            </Text>
            .
          </Text>
        </Box>
      </Container>
    </Box>
  );
}
