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
  Skeleton,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { ChevronLeft, LogOut } from "lucide-react";
import NotificationsBell from "@/components/NotificationsBell";
import {
  PAGE_LINKS,
  getCurrentUserPermissions,
  getIsFullAdmin,
  getVisibleNavLinks,
} from "@/lib/admin-nav";

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
    () => getVisibleNavLinks(permissions, isFullAdmin),
    [permissions, isFullAdmin],
  );
  const groups = useMemo(
    () => [...new Set(visibleLinks.map((l) => l.group))],
    [visibleLinks],
  );

  const welcomeName = useMemo(() => {
    if (typeof window === "undefined") return "الأدمن";
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return "الأدمن";
      const data = JSON.parse(raw) as Record<string, unknown>;
      const name = (data.name ??
        (data.user as Record<string, unknown>)?.name) as string | undefined;
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
    <Box minH="100vh" bg="gray.50" dir="rtl">
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
          <Flex
            justify="space-between"
            align="flex-start"
            gap={4}
            flexWrap="wrap"
          >
            <Box flex={1} minW={0}>
              {mounted ? (
                <>
                  <Heading size="lg" mb={2} color="#544f30">
                    أهلاً بك، {welcomeName}
                  </Heading>
                  <Text color="gray.600" fontSize="md">
                    {visibleLinks.length > 0
                      ? "من هنا يمكنك الوصول لصفحات التطبيق حسب صلاحياتك."
                      : "لا توجد لديك صلاحيات لعرض أي صفحة. تواصل مع المسؤول."}
                  </Text>
                </>
              ) : (
                <>
                  <Skeleton height="32px" width="220px" mb={3} borderRadius="md" />
                  <Skeleton height="20px" width="100%" maxW="320px" borderRadius="md" />
                </>
              )}
            </Box>
            <Flex gap={2} align="center" flexShrink={0}>
              <NotificationsBell />
              <Button
                variant="outline"
                colorScheme="red"
                size="sm"
                onClick={handleLogout}
                gap={2}
              >
                <LogOut size={18} />
                تسجيل خروج
              </Button>
            </Flex>
          </Flex>
        </Box>

        {/* Loading: skeleton cards */}
        {!mounted && (
          <>
            <Box mb={10}>
              <Flex align="center" gap={2} mb={5}>
                <Skeleton w="4px" h="24px" borderRadius="full" />
                <Skeleton height="24px" width="100px" borderRadius="md" />
              </Flex>
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={5}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <Box
                    key={i}
                    p={6}
                    bg="white"
                    borderRadius="xl"
                    boxShadow="sm"
                    border="1px solid"
                    borderColor="gray.100"
                  >
                    <Flex align="start" justify="space-between" gap={4}>
                      <Skeleton w="52px" h="52px" borderRadius="xl" flexShrink={0} />
                      <Box flex={1} minW={0}>
                        <Skeleton height="22px" width="70%" mb={2} borderRadius="md" />
                        <Skeleton height="16px" width="100%" borderRadius="md" />
                        <Skeleton height="16px" width="85%" mt={1.5} borderRadius="md" />
                      </Box>
                      <Skeleton w="20px" h="20px" borderRadius="md" flexShrink={0} mt={1} />
                    </Flex>
                  </Box>
                ))}
              </SimpleGrid>
            </Box>
            <Box mb={10}>
              <Flex align="center" gap={2} mb={5}>
                <Skeleton w="4px" h="24px" borderRadius="full" />
                <Skeleton height="24px" width="80px" borderRadius="md" />
              </Flex>
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={5}>
                {[1, 2, 3].map((i) => (
                  <Box
                    key={i}
                    p={6}
                    bg="white"
                    borderRadius="xl"
                    boxShadow="sm"
                    border="1px solid"
                    borderColor="gray.100"
                  >
                    <Flex align="start" justify="space-between" gap={4}>
                      <Skeleton w="52px" h="52px" borderRadius="xl" flexShrink={0} />
                      <Box flex={1} minW={0}>
                        <Skeleton height="22px" width="65%" mb={2} borderRadius="md" />
                        <Skeleton height="16px" width="90%" borderRadius="md" />
                      </Box>
                      <Skeleton w="20px" h="20px" borderRadius="md" flexShrink={0} mt={1} />
                    </Flex>
                  </Box>
                ))}
              </SimpleGrid>
            </Box>
          </>
        )}

        {/* Page Links by Group (when loaded) */}
        {mounted && visibleLinks.length === 0 && (
          <Box
            p={6}
            bg="orange.50"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="orange.200"
            textAlign="center"
          >
            <Text color="orange.800" fontWeight="medium">
              لا توجد صلاحيات
            </Text>
            <Text color="orange.700" fontSize="sm" mt={1}>
              لم يتم تعيين أي صلاحية لحسابك. راجع المسؤول لإدارة الحسابات.
            </Text>
          </Box>
        )}
        {mounted && groups.map((group) => (
          <Box key={group} mb={10}>
            <Flex align="center" gap={2} mb={5}>
              <Box w="4px" h="24px" bg="#615b36" borderRadius="full" />
              <Heading size="md" color="#544f30">
                {group}
              </Heading>
            </Flex>
            <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} gap={5}>
              {visibleLinks
                .filter((link) => link.group === group)
                .map((link) => {
                  const IconComp = link.icon;
                  return (
                    <Box
                      key={link.href}
                      as="button"
                      onClick={() => router.push(link.href)}
                      cursor="pointer"
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
      </Container>
    </Box>
  );
}
