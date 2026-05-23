"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Box,
  Flex,
  Button,
  Stack,
  useDisclosure,
  Container,
  Text,
  Collapsible,
  useBreakpointValue,
  MenuRoot,
  MenuTrigger,
  MenuContent,
  MenuItem,
  Separator,
} from "@chakra-ui/react";
import {
  AlignJustify,
  X,
  LogOut,
  ChevronDown,
  LayoutDashboard,
} from "lucide-react";
import SlotBookingModal from "@/components/SlotBookingModal";
import {
  isAdminLoggedIn,
  getCurrentUserPermissions,
  getIsFullAdmin,
  getVisibleNavLinks,
  type AdminPageLink,
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
      // @ts-ignore
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
] as const;

function isLinkActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  const base = href.split("#")[0];
  if (!base || base === "/") return pathname === "/";
  return pathname === base || pathname.startsWith(`${base}/`);
}

function NavLinkPill({
  href,
  children,
  active,
  size = "md",
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  size?: "sm" | "md";
  onClick?: () => void;
}) {
  const fontSize = size === "sm" ? "sm" : { base: "sm", lg: "md" };
  const py = size === "sm" ? 1.5 : 2;
  const px = size === "sm" ? 3 : { base: 3, lg: 4 };

  return (
    <Box
      as={Link}
      href={href}
      onClick={onClick}
      fontSize={fontSize}
      fontWeight={active ? "bold" : "semibold"}
      color={active ? "white" : BRAND.color}
      bg={active ? BRAND.color : "transparent"}
      py={py}
      px={px}
      borderRadius="full"
      whiteSpace="nowrap"
      transition="all 0.2s"
      _hover={{
        textDecoration: "none",
        bg: active ? BRAND.colorHover : "blackAlpha.50",
        color: active ? "white" : BRAND.colorHover,
      }}
    >
      {children}
    </Box>
  );
}

function AdminGroupMenu({
  group,
  links,
  pathname,
}: {
  group: string;
  links: AdminPageLink[];
  pathname: string;
}) {
  const hasActive = links.some((l) => isLinkActive(pathname, l.href));

  return (
    <MenuRoot positioning={{ placement: "bottom-end" }}>
      <MenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          fontWeight="semibold"
          color={hasActive ? "white" : BRAND.color}
          bg={hasActive ? BRAND.color : "transparent"}
          borderRadius="full"
          px={3}
          gap={1}
          _hover={{
            bg: hasActive ? BRAND.colorHover : "blackAlpha.50",
            color: hasActive ? "white" : BRAND.colorHover,
          }}
        >
          {group}
          <ChevronDown size={16} />
        </Button>
      </MenuTrigger>
      <MenuContent minW="220px" p={1}>
        {links.map((link) => {
          const Icon = link.icon;
          const active = isLinkActive(pathname, link.href);
          return (
            <MenuItem
              key={link.href}
              value={link.href}
              asChild
              bg={active ? "blackAlpha.50" : undefined}
            >
              <Link href={link.href}>
                <Flex align="center" gap={2} w="full" py={0.5}>
                  <Box
                    p={1.5}
                    borderRadius="md"
                    bg={link.bg}
                    color={link.color}
                    flexShrink={0}
                  >
                    <Icon size={16} />
                  </Box>
                  <Text fontWeight={active ? "bold" : "medium"} fontSize="sm">
                    {link.title}
                  </Text>
                </Flex>
              </Link>
            </MenuItem>
          );
        })}
      </MenuContent>
    </MenuRoot>
  );
}

function MobileAdminLink({
  link,
  active,
  onNavigate,
}: {
  link: AdminPageLink;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = link.icon;
  return (
    <Box
      as={Link}
      href={link.href}
      onClick={onNavigate}
      display="flex"
      alignItems="center"
      gap={3}
      py={3}
      px={4}
      mx={1}
      borderRadius="xl"
      bg={active ? "blackAlpha.50" : "transparent"}
      borderWidth={active ? "1px" : "0"}
      borderColor={active ? BRAND.border : "transparent"}
      fontWeight={active ? "bold" : "medium"}
      color={BRAND.color}
      _hover={{ bg: "blackAlpha.50", textDecoration: "none" }}
      transition="background 0.15s"
    >
      <Box p={2} borderRadius="lg" bg={link.bg} color={link.color} flexShrink={0}>
        <Icon size={18} />
      </Box>
      <Box flex={1} minW={0}>
        <Text fontSize="sm" lineHeight="short">
          {link.title}
        </Text>
        <Text fontSize="xs" color="gray.500" lineClamp={1}>
          {link.description}
        </Text>
      </Box>
    </Box>
  );
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { open, onToggle } = useDisclosure();
  const {
    open: isBookingOpen,
    onOpen: onBookingOpen,
    onClose: onBookingClose,
  } = useDisclosure();
  const isMobile = useBreakpointValue(
    { base: true, md: false },
    { fallback: "base" },
  );

  const [mounted, setMounted] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isFullAdmin, setIsFullAdmin] = useState(false);
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoggedIn(isAdminLoggedIn());
    setPermissions(getCurrentUserPermissions());
    setIsFullAdmin(getIsFullAdmin());
    try {
      const rawUser = localStorage.getItem("user");
      const parsed = rawUser ? JSON.parse(rawUser) : null;
      setRole(parsed?.role ?? parsed?.user?.role ?? "");
    } catch {
      setRole("");
    }
  }, [mounted]);

  const adminLinks = useMemo(
    () =>
      loggedIn ? getVisibleNavLinks(permissions, isFullAdmin) : [],
    [loggedIn, permissions, isFullAdmin],
  );

  const adminGroups = useMemo(
    () => [...new Set(adminLinks.map((l) => l.group))],
    [adminLinks],
  );

  const linksByGroup = useMemo(() => {
    const map = new Map<string, AdminPageLink[]>();
    for (const g of adminGroups) {
      map.set(
        g,
        adminLinks.filter((l) => l.group === g),
      );
    }
    return map;
  }, [adminLinks, adminGroups]);

  const isDoctorNav = mounted && loggedIn && role === "doctor";
  const isAdminNav = mounted && loggedIn && !isDoctorNav;

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("selectedDoctorId");
      const expire = "expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/";
      document.cookie = `admin-token=; ${expire}`;
      document.cookie = `admin-token=; ${expire}; path=/admin`;
      document.cookie = `admin-role=; ${expire}`;
    }
    router.push("/admin/login");
  };

  const closeMobile = () => {
    if (open) onToggle();
  };

  const renderDesktopLinks = () => {
    if (!mounted) {
      return PUBLIC_LINKS.map((link) => (
        <NavLinkPill key={link.name} href={link.href} size="md">
          {link.name}
        </NavLinkPill>
      ));
    }

    if (isDoctorNav) return null;

    if (isAdminNav) {
      return (
        <Flex align="center" gap={1} flexWrap="wrap" justify="flex-start">
          <NavLinkPill
            href="/admin/dashboard"
            active={isLinkActive(pathname, "/admin/dashboard")}
            size="sm"
          >
            <Flex align="center" gap={1.5} as="span">
              <LayoutDashboard size={16} />
              لوحة التحكم
            </Flex>
          </NavLinkPill>
          {adminGroups.map((group) => (
            <AdminGroupMenu
              key={group}
              group={group}
              links={linksByGroup.get(group) ?? []}
              pathname={pathname}
            />
          ))}
        </Flex>
      );
    }

    return PUBLIC_LINKS.map((link) => (
      <NavLinkPill
        key={link.name}
        href={link.href}
        active={isLinkActive(pathname, link.href)}
        size="md"
      >
        {link.name}
      </NavLinkPill>
    ));
  };

  const renderMobileLinks = () => {
    if (!mounted) {
      return PUBLIC_LINKS.map((link) => (
        <NavLinkPill
          key={link.name}
          href={link.href}
          onClick={closeMobile}
          size="md"
        >
          {link.name}
        </NavLinkPill>
      ));
    }

    if (isDoctorNav) return null;

    if (isAdminNav) {
      return (
        <Stack gap={2} align="stretch">
          <NavLinkPill
            href="/admin/dashboard"
            active={isLinkActive(pathname, "/admin/dashboard")}
            onClick={closeMobile}
            size="md"
          >
            <Flex align="center" gap={2} as="span">
              <LayoutDashboard size={18} />
              لوحة التحكم
            </Flex>
          </NavLinkPill>
          {adminGroups.map((group, gi) => (
            <Box key={group}>
              {gi > 0 && <Separator my={2} borderColor="gray.100" />}
              <Text
                fontSize="xs"
                fontWeight="bold"
                color="gray.500"
                px={4}
                py={1}
                letterSpacing="wide"
              >
                {group}
              </Text>
              <Stack gap={0.5} align="stretch">
                {(linksByGroup.get(group) ?? []).map((link) => (
                  <MobileAdminLink
                    key={link.href}
                    link={link}
                    active={isLinkActive(pathname, link.href)}
                    onNavigate={closeMobile}
                  />
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>
      );
    }

    return (
      <Stack gap={1} align="stretch">
        {PUBLIC_LINKS.map((link) => (
          <NavLinkPill
            key={link.name}
            href={link.href}
            active={isLinkActive(pathname, link.href)}
            onClick={closeMobile}
            size="md"
          >
            {link.name}
          </NavLinkPill>
        ))}
      </Stack>
    );
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
      <Box position="relative" zIndex={1001}>
        <Container maxW="6xl">
          <Box
            bg="rgba(255, 255, 255, 0.92)"
            backdropFilter="blur(12px)"
            // @ts-ignore
            WebkitBackdropFilter="blur(12px)"
            borderWidth="1px"
            borderColor={BRAND.border}
            borderRadius={{ base: "xl", md: "2xl" }}
            px={{ base: 4, md: 6 }}
            py={{ base: 2, md: 3 }}
            shadow="sm"
          >
            <Flex alignItems="center" justifyContent="space-between" gap={3}>
              <Flex
                align="center"
                gap={2}
                flex={1}
                minW={0}
                display={{ base: "none", md: "flex" }}
              >
                {renderDesktopLinks()}
              </Flex>

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
                  aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
                  _hover={{ bg: "blackAlpha.50", borderColor: BRAND.color }}
                  _active={{ bg: "blackAlpha.100" }}
                >
                  {open ? (
                    <X size={24} strokeWidth={2.5} />
                  ) : (
                    <AlignJustify size={24} strokeWidth={2.5} />
                  )}
                </Button>
              </Box>

              <Flex align="center" gap={{ base: 2, md: 4 }} flexShrink={0}>
                {mounted && loggedIn && (
                  <Button
                    display={{ base: "none", md: "inline-flex" }}
                    onClick={handleLogout}
                    variant="outline"
                    colorScheme="red"
                    size="sm"
                    borderRadius="full"
                    px={5}
                    gap={2}
                  >
                    <LogOut size={16} />
                    تسجيل خروج
                  </Button>
                )}
                <Box
                  as={Link}
                  href={
                    isDoctorNav
                      ? "/doctor-appointments"
                      : isAdminNav
                        ? "/admin/dashboard"
                        : "/"
                  }
                  _hover={{ opacity: 0.9 }}
                  transition="opacity 0.2s"
                >
                  <Logo />
                </Box>
              </Flex>
            </Flex>

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
                  <Stack as="nav" gap={2} align="stretch">
                    {renderMobileLinks()}
                    {mounted && loggedIn && (
                      <Box px={1} pt={2}>
                        <Button
                          w="full"
                          size="lg"
                          onClick={() => {
                            handleLogout();
                            closeMobile();
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
                    )}
                  </Stack>
                </Box>
              </Collapsible.Content>
            </Collapsible.Root>
          </Box>
        </Container>
      </Box>

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
