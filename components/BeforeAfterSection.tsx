"use client";

import { Box, Container, Flex, Heading, Text } from "@chakra-ui/react";
import { beforeAfterImages } from "@/data/beforeAfterImages";

const BRAND = "#5d562c";

export default function BeforeAfterSection() {
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

      {/* كاروسيل يتحرك أفقياً تلقائياً */}
      <Box dir="ltr" position="relative" w="100%" overflow="hidden">
        <Box
          className="before-after-track"
          display="flex"
          gap={{ base: 4, md: 6 }}
          w="max-content"
          py={2}
          px={{ base: 4, md: 6 }}
        >
          {beforeAfterImages.map((img, i) => (
            <Box
              key={`a-${i}`}
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
              <Box
                as="img"
                src={img}
                alt={`قبل وبعد ${i + 1}`}
                w="100%"
                h="100%"
                display="block"
                objectFit="contain"
              />
            </Box>
          ))}
          {beforeAfterImages.map((img, i) => (
            <Box
              key={`b-${i}`}
              flexShrink={0}
              w={{ base: "280px", sm: "320px", md: "360px" }}
              h={{ base: "380px", sm: "420px", md: "460px" }}
              borderRadius="2xl"
              overflow="hidden"
              bg="#5d562c"
              boxShadow="0 10px 30px -10px rgba(93, 86, 44, 0.2)"
              borderWidth="1px"
              borderColor="rgba(93, 86, 44, 0.12)"
            >
              <Box
                as="img"
                src={img}
                alt={`قبل وبعد ${i + 1}`}
                w="100%"
                h="100%"
                display="block"
                objectFit="contain"
              />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
