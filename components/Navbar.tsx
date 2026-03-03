"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Box,
  Flex,
  Button,
  Stack,
  Link as ChakraLink,
  useDisclosure,
  Container,
  Text,
  Collapsible,
  useBreakpointValue,
} from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { AlignJustify, X, LogOut } from "lucide-react";
import SlotBookingModal from "@/components/SlotBookingModal";
import {
  isAdminLoggedIn,
  getCurrentUserPermissions,
  getIsFullAdmin,
  getVisibleNavLinks,
} from "@/lib/admin-nav";
import logoImg from "@/images/logo.png";

const BRAND = { color: "#615b36", colorHover: "#4a452a", border: "#b6b299" };

const SITE_NAME = "";

const Logo = () => (
  <Flex align="center" gap={2} flexShrink={0}>
    <Box
      position="relative"
      h={{ base: "32px", md: "38px" }}
      w={{ base: "44px", md: "52px" }}
    >
      <Image
        src={logoImg}
        alt="Logo"
        fill
        style={{ objectFit: "contain" }}
        priority
      />
    </Box>
    <Text
      fontWeight="bold"
      color={BRAND.color}
      fontSize={{ base: "md", md: "lg" }}
      noOfLines={1}
    >
      {SITE_NAME}
    </Text>
  </Flex>
);

const PUBLIC_LINKS = [
  { name: "الرئيسية", href: "/" },
  { name: "خدماتنا", href: "/#services" },
  { name: "آراء العملاء", href: "/#reviews" },
  { name: "تواصل معنا", href: "/#contact" },
];

export default function Navbar() {
  const router = useRouter();
  const { open, onToggle } = useDisclosure();
  const {
    open: isBookingOpen,
    onOpen: onBookingOpen,
    onClose: onBookingClose,
  } = useDisclosure();
  const isMobile = useBreakpointValue({ base: true, md: false });

  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isFullAdmin, setIsFullAdmin] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setLoggedIn(isAdminLoggedIn());
    setPermissions(getCurrentUserPermissions());
    setIsFullAdmin(getIsFullAdmin());
  }, [mounted]);

  const adminLinks = useMemo(
    () =>
      loggedIn
        ? getVisibleNavLinks(permissions, isFullAdmin).map((l) => ({
            name: l.title,
            href: l.href,
          }))
        : [],
    [loggedIn, permissions, isFullAdmin],
  );

  const links = useMemo(() => {
    if (!mounted) return PUBLIC_LINKS;
    if (loggedIn) {
      return [{ name: "لوحة التحكم", href: "/admin/dashboard" }, ...adminLinks];
    }
    return PUBLIC_LINKS;
  }, [mounted, loggedIn, adminLinks]);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      const expire = "expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/";
      document.cookie = `admin-token=; ${expire}`;
      document.cookie = `admin-token=; ${expire}; path=/admin`;
    }
    router.push("/admin/login");
  };

  return (
    <Box
      as="nav"
      position="fixed"
      w="100%"
      zIndex={1000}
      top={{ base: 2, sm: 4 }}
      dir="rtl"
      px={{ base: 3, sm: 4 }}
    >
      {/* غلاف حتى يبقى النافبار فوق الستارة على الموبايل */}
      <Box position="relative" zIndex={1001}>
        <Container maxW="6xl">
          <Box
            bg="rgba(255, 255, 255, 0.92)"
            backdropFilter="blur(12px)"
            WebkitBackdropFilter="blur(12px)"
            borderWidth="1px"
            borderColor={BRAND.border}
            borderRadius={{ base: "xl", md: "2xl" }}
            px={{ base: 4, md: 6 }}
            py={{ base: 2, md: 3 }}
            shadow="sm"
          >
            <Flex alignItems="center" justifyContent="space-between" gap={3}>
              {/* Desktop: روابط | موبايل: زر القائمة */}
              <Stack
                direction="row"
                gap={loggedIn ? { md: 3, lg: 4 } : { md: 6, lg: 8 }}
                display={{ base: "none", md: "flex" }}
                alignItems="center"
              >
                {links.map((link) => (
                  <ChakraLink
                    key={link.name}
                    href={link.href}
                    fontSize={loggedIn ? "sm" : "lg"}
                    fontWeight="bold"
                    color={BRAND.color}
                    _hover={{
                      textDecoration: "none",
                      opacity: 0.85,
                      color: BRAND.colorHover,
                    }}
                    transition="color 0.2s"
                  >
                    {link.name}
                  </ChakraLink>
                ))}
              </Stack>

              {/* موبايل: أيقونة واضحة لفتح/إغلاق القائمة */}
              <Box display={{ base: "flex", md: "none" }} flexShrink={0}>
                <Button
                  onClick={onToggle}
                  variant="outline"
                  color={BRAND.color}
                  borderColor={BRAND.border}
                  bg={open ? "blackAlpha.50" : "white"}
                  size="lg"
                  minH={12}
                  px={4}
                  borderRadius="xl"
                  gap={2}
                  fontWeight="bold"
                  _hover={{ bg: "blackAlpha.50", borderColor: BRAND.color }}
                  _active={{ bg: "blackAlpha.100" }}
                >
                  {open ? (
                    <>
                      <X size={24} strokeWidth={2.5} />
                    </>
                  ) : (
                    <>
                      <AlignJustify size={24} strokeWidth={2.5} />
                    </>
                  )}
                </Button>
              </Box>

              {/* لوجو + زر حجز أو تسجيل خروج (ديسكتوب فقط) */}
              <Flex align="center" gap={{ base: 2, md: 4 }} flexShrink={0}>
                {mounted && loggedIn && (
                  <Button
                    display={{ base: "none", md: "inline-flex" }}
                    onClick={handleLogout}
                    variant="outline"
                    colorScheme="red"
                    size="sm"
                    borderRadius="full"
                    px={6}
                    gap={2}
                  >
                    <LogOut size={16} />
                    تسجيل خروج
                  </Button>
                )}
                <Logo />
              </Flex>
            </Flex>

            {/* قائمة الموبايل مع انيميشن (Chakra v3 Collapsible) */}
            <Collapsible.Root
              open={open}
              onOpenChange={(e) => {
                if (e.open !== open) onToggle();
              }}
            >
              <Collapsible.Content>
                <Box
                  display={{ md: "none" }}
                  pt={2}
                  pb={3}
                  mt={2}
                  borderTop="1px solid"
                  borderColor="gray.100"
                >
                  <Stack as="nav" gap={0} align="stretch">
                    {links.map((link) => (
                      <ChakraLink
                        key={link.name}
                        href={link.href}
                        onClick={onToggle}
                        fontSize={loggedIn ? "sm" : "md"}
                        fontWeight="medium"
                        color={BRAND.color}
                        py={3}
                        px={4}
                        borderRadius="lg"
                        mx={1}
                        _hover={{ bg: "blackAlpha.50", textDecoration: "none" }}
                        _active={{ bg: "blackAlpha.100" }}
                        transition="background 0.15s"
                      >
                        {link.name}
                      </ChakraLink>
                    ))}
                    {mounted && loggedIn ? (
                      <Box px={2} pt={2} pb={1}>
                        <Button
                          w="full"
                          size="lg"
                          onClick={() => {
                            handleLogout();
                            onToggle();
                          }}
                          variant="outline"
                          colorScheme="red"
                          borderRadius="xl"
                          fontWeight="bold"
                          gap={2}
                        >
                          <LogOut size={18} />
                          تسجيل خروج
                        </Button>
                      </Box>
                    ) : (
                      <Box px={2} pt={2} pb={1}>
                        <Button
                          w="full"
                          size="lg"
                          onClick={() => {
                            onBookingOpen();
                            onToggle();
                          }}
                          bg={BRAND.color}
                          color="white"
                          _hover={{ bg: BRAND.colorHover }}
                          borderRadius="xl"
                          fontWeight="bold"
                        >
                          حجز موعد
                        </Button>
                      </Box>
                    )}
                  </Stack>
                </Box>
              </Collapsible.Content>
            </Collapsible.Root>
          </Box>
        </Container>
      </Box>

      {/* ستارة خلفية على الموبايل عند فتح القائمة (الضغط عليها يغلق القائمة) */}
      {isMobile && open && (
        <Box
          position="fixed"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.400"
          zIndex={999}
          onClick={onToggle}
          aria-hidden
        />
      )}

      <SlotBookingModal
        isOpen={isBookingOpen}
        onClose={onBookingClose}
        bookingType="online"
      />
    </Box>
  );
}
