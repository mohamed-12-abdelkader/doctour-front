'use client';

import { Box } from "@chakra-ui/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import ReviewsSection from "@/components/ReviewsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";

function getIsAdmin(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes("admin-token=");
}

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (getIsAdmin()) {
      router.replace("/admin/dashboard");
    }
  }, [mounted, router]);

  // إذا أدمن، نعرض لا شيء حتى يتم التوجيه (تجنب وميض المحتوى)
  if (mounted && getIsAdmin()) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <Box className="animate-pulse" color="gray.500">
          جاري التحويل...
        </Box>
      </Box>
    );
  }

  return (
    <Box minH="100vh">
      <Box pt={0}>
        <HeroSection />
        <ServicesSection />
        <ReviewsSection />
        <ContactSection />
      </Box>
      <Footer />
    </Box>
  );
}
