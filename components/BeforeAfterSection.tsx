"use client";

import { useRef } from "react";
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  IconButton,
} from "@chakra-ui/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { beforeAfterImages } from "@/data/beforeAfterImages";

const BRAND = "#5d562c";

export default function BeforeAfterSection() {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);

  const scrollCards = (direction: "next" | "prev") => {
    const el = scrollerRef.current;
    if (!el) return;
    const cardWidth = window.innerWidth < 640 ? 296 : window.innerWidth < 768 ? 336 : 376;
    const offset = direction === "next" ? cardWidth : -cardWidth;
    el.scrollBy({ left: offset, behavior: "smooth" });
  };

  const handlePointerDown = (clientX: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    dragStartXRef.current = clientX;
    dragScrollLeftRef.current = el.scrollLeft;
  };

  const handlePointerMove = (clientX: number) => {
    const el = scrollerRef.current;
    if (!el || !isDraggingRef.current) return;
    const dx = clientX - dragStartXRef.current;
    el.scrollLeft = dragScrollLeftRef.current - dx;
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

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

      {/* كاروسيل يدوي بالسحب/اللمس + أزرار */}
      <Box dir="ltr" position="relative" w="100%">
        <Flex
          justify="center"
          gap={2}
          mb={4}
          display="flex"
        >
          <IconButton
            aria-label="السابق"
            onClick={() => scrollCards("prev")}
            rounded="full"
            variant="outline"
            color={BRAND}
            borderColor="rgba(93, 86, 44, 0.35)"
          >
            <ChevronLeft size={18} />
          </IconButton>
          <IconButton
            aria-label="التالي"
            onClick={() => scrollCards("next")}
            rounded="full"
            variant="solid"
            bg={BRAND}
            color="white"
            _hover={{ bg: "#4d4723" }}
          >
            <ChevronRight size={18} />
          </IconButton>
        </Flex>

        <Box
          ref={scrollerRef}
          display="flex"
          gap={{ base: 4, md: 6 }}
          w="100%"
          py={2}
          px={{ base: 4, md: 6 }}
          overflowX="auto"
          overflowY="hidden"
          scrollSnapType="x mandatory"
          touchAction="pan-x"
          css={{
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
          // eslint-disable-next-line react-hooks/refs
          cursor={isDraggingRef.current ? "grabbing" : "grab"}
          onMouseDown={(e) => handlePointerDown(e.clientX)}
          onMouseMove={(e) => handlePointerMove(e.clientX)}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={(e) => handlePointerDown(e.touches[0].clientX)}
          onTouchMove={(e) => handlePointerMove(e.touches[0].clientX)}
          onTouchEnd={handlePointerUp}
        >
          {beforeAfterImages.map((img, i) => (
            <Box
              key={`img-${i}`}
              flexShrink={0}
              w={{ base: "280px", sm: "320px", md: "360px" }}
              h={{ base: "380px", sm: "420px", md: "460px" }}
              scrollSnapAlign="center"
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
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
