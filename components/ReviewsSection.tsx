"use client";

import { useRef, useState, useEffect } from "react";
import { Box, Heading, Text, Stack, Container, Flex } from "@chakra-ui/react";
import { reviewImages } from "@/data/reviewImages";
import { MotionBox, fadeInUp } from "./MotionBox";

const BRAND = "#5d562c";

/** نفس سرعة التمرير في BeforeAfterSection */
const SCROLL_PX_PER_FRAME = 2.25;

function renderReviewCards(images: string[], keyPrefix: string) {
  return images.map((src, i) => (
    <Box
      key={`${keyPrefix}-${i}`}
      flexShrink={0}
      w={{ base: "260px", sm: "300px", md: "340px" }}
      h={{ base: "280px", sm: "320px", md: "360px" }}
      borderRadius="2xl"
      overflow="hidden"
      bg="white"
      boxShadow="0 10px 30px -10px rgba(93, 86, 44, 0.15)"
      borderWidth="1px"
      borderColor="rgba(97, 91, 54, 0.12)"
    >
      <img
        src={src}
        alt={`ريفيو ${i + 1}`}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          objectFit: "contain",
        }}
        draggable={false}
      />
    </Box>
  ));
}

export default function ReviewsSection() {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const isHoverPausedRef = useRef(false);
  const [isHoverPaused, setIsHoverPaused] = useState(false);

  useEffect(() => {
    isHoverPausedRef.current = isHoverPaused;
  }, [isHoverPaused]);

  useEffect(() => {
    let rafId = 0;

    const tick = () => {
      const el = scrollerRef.current;
      if (el && !isHoverPausedRef.current) {
        el.scrollLeft += SCROLL_PX_PER_FRAME;
        const half = el.scrollWidth / 2;
        if (half > 2 && el.scrollLeft >= half - 1) {
          el.scrollLeft -= half;
        }
      }
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <Box
      id="reviews"
      py={16}
      bg="linear-gradient(to bottom, #FAFAF9 0%, #F5F5F0 100%)"
      dir="rtl"
      fontFamily="var(--font-tajawal), Tajawal, sans-serif"
      overflow="hidden"
    >
      <Container maxW="7xl" mb={10}>
        <MotionBox
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <Flex align="center" justify="center" gap={2} mb={3}>
            <Box h="1px" w="40px" bg={BRAND} />
            <Text color={BRAND} fontWeight="bold" letterSpacing="wider" fontSize="sm">
              آراء العملاء
            </Text>
            <Box h="1px" w="40px" bg={BRAND} />
          </Flex>
          <Stack gap={0} align="center" mb={2}>
            <Heading
              fontSize={{ base: "2xl", md: "4xl" }}
              fontWeight="800"
              color={BRAND}
              textAlign="center"
              fontFamily="var(--font-tajawal), Tajawal, sans-serif"
            >
              آراء عملائنا
            </Heading>
            <Text
              textAlign="center"
              color="gray.600"
              fontSize="lg"
              mt={2}
              maxW="xl"
              mx="auto"
            >
              سعداء دائماً بخدمتكم ورضاكم هو هدفنا
            </Text>
          </Stack>
        </MotionBox>
      </Container>

      <Box
        dir="ltr"
        position="relative"
        w="100%"
        onMouseEnter={() => setIsHoverPaused(true)}
        onMouseLeave={() => setIsHoverPaused(false)}
      >
        <Box
          ref={scrollerRef}
          display="flex"
          gap={{ base: 4, md: 6 }}
          w="100%"
          py={2}
          px={{ base: 4, md: 6 }}
          overflowX="auto"
          overflowY="hidden"
          touchAction="pan-x"
          css={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
            scrollSnapType: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          {renderReviewCards(reviewImages, "a")}
          {renderReviewCards(reviewImages, "b")}
        </Box>
      </Box>
    </Box>
  );
}
