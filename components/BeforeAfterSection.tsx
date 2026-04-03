"use client";

import { useRef, useState, useEffect } from "react";
import { Box, Container, Flex, Heading, Text } from "@chakra-ui/react";
import { beforeAfterImages } from "@/data/beforeAfterImages";

const BRAND = "#5d562c";

/** سرعة التمرير الأفقي (بكسل لكل إطار ≈ 60fps) — زِد القيمة لحركة أسرع */
const SCROLL_PX_PER_FRAME = 2.25;

function renderCards(
  images: string[],
  keyPrefix: string,
) {
  return images.map((img, i) => (
    <Box
      key={`${keyPrefix}-${i}`}
      flexShrink={0}
      w={{ base: "280px", sm: "320px", md: "360px" }}
      h={{ base: "380px", sm: "420px", md: "460px" }}
      borderRadius="2xl"
      overflow="hidden"
      bg="#5d562c"
      boxShadow="0 10px 30px -10px rgba(93, 86, 44, 0.2)"
      borderWidth="1px"
      borderColor="rgba(93, 86, 44, 0.2)"
    >
      <img
        src={img}
        alt={`قبل وبعد ${i + 1}`}
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

export default function BeforeAfterSection() {
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
      id="before-after"
      py={16}
      bg="linear-gradient(to bottom, #FAFAF9 0%, #F5F5F0 100%)"
      dir="rtl"
      fontFamily="var(--font-tajawal), Tajawal, sans-serif"
      overflow="hidden"
    >
      <Container maxW="7xl" mb={10}>
        <Flex align="center" justify="center" gap={2} mb={3}>
          <Box h="1px" w="40px" bg={BRAND} />
          <Text color={BRAND} fontWeight="bold" letterSpacing="wider">
            حالات حقيقية
          </Text>
          <Box h="1px" w="40px" bg={BRAND} />
        </Flex>
        <Heading
          fontSize={{ base: "2xl", md: "4xl" }}
          fontWeight="800"
          color={BRAND}
          textAlign="center"
          fontFamily="var(--font-tajawal), Tajawal, sans-serif"
        >
          قبل وبعد
        </Heading>
        <Text
          textAlign="center"
          color="gray.600"
          fontSize="lg"
          mt={2}
          maxW="xl"
          mx="auto"
        >
          كل صورة تعرض حالة قبل وبعد من عيادة د/ ريم عاطف
        </Text>
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
          {renderCards(beforeAfterImages, "a")}
          {renderCards(beforeAfterImages, "b")}
        </Box>
      </Box>
    </Box>
  );
}
