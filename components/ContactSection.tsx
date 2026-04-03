"use client";

import {
  Box,
  Flex,
  Heading,
  Stack,
  Text,
  Container,
  Button,
  Link,
} from "@chakra-ui/react";
import { doctorInfo } from "@/data/services";
import { MapPin, ExternalLink, MessageCircle } from "lucide-react";

const BRAND = "#5d562c";

export default function ContactSection() {
  return (
    <Box
      id="contact"
      bg="linear-gradient(to bottom, #FAFAF9 0%, #F5F5F0 100%)"
      py={24}
      px={{ base: 4, md: 6 }}
      dir="rtl"
      fontFamily="var(--font-tajawal), Tajawal, sans-serif"
    >
      <Container maxW="7xl">
        <Box
          maxW="3xl"
          mx="auto"
          bg="white"
          borderRadius="3xl"
          p={{ base: 8, md: 14 }}
          boxShadow="0 25px 50px -12px rgba(93, 86, 44, 0.15)"
          borderWidth="1px"
          borderColor="rgba(93, 86, 44, 0.1)"
          position="relative"
          overflow="hidden"
        >
          {/* زخرفة خفيفة */}
          <Box
            position="absolute"
            top={0}
            right={0}
            w="250px"
            h="250px"
            bg={BRAND}
            opacity={0.03}
            borderRadius="full"
            transform="translate(30%, -30%)"
          />
          <Box
            position="absolute"
            bottom={0}
            left={0}
            w="200px"
            h="200px"
            bg={BRAND}
            opacity={0.03}
            borderRadius="full"
            transform="translate(-30%, 30%)"
          />

          <Flex align="center" justify="center" gap={3} mb={6} position="relative" zIndex={1}>
            <Box h="2px" w="40px" bg={BRAND} borderRadius="full" />
            <Text
              color={BRAND}
              fontWeight="bold"
              fontSize="sm"
              letterSpacing="wider"
            >
              العيادة والأفرع
            </Text>
            <Box h="2px" w="40px" bg={BRAND} borderRadius="full" />
          </Flex>

          <Heading
            fontSize={{ base: "3xl", md: "4xl" }}
            fontWeight="900"
            color={BRAND}
            mb={5}
            textAlign="center"
            fontFamily="var(--font-tajawal), Tajawal, sans-serif"
            position="relative"
            zIndex={1}
          >
            تواصل معنا
          </Heading>

          <Text
            textAlign="center"
            color="gray.600"
            fontSize={{ base: "md", md: "lg" }}
            mb={12}
            maxW="2xl"
            mx="auto"
            fontFamily="var(--font-tajawal), Tajawal, sans-serif"
            position="relative"
            zIndex={1}
            lineHeight="1.8"
          >
            نسعد باستقبال استفساراتكم وحجز مواعيدكم في عيادات دكتورة ريم عاطف. زورونا في أقرب فرع لكم.
          </Text>

          <Stack gap={5} mb={12} position="relative" zIndex={1}>
            {doctorInfo.locations.map((loc, i) => {
              const mapUrl = doctorInfo.locationMapUrls?.[i];
              const box = (
                <Flex
                  align="flex-start"
                  gap={{ base: 3, md: 5 }}
                  p={{ base: 5, md: 6 }}
                  borderRadius="2xl"
                  bg="gray.50"
                  borderWidth="1px"
                  borderColor="gray.100"
                  _hover={
                    mapUrl
                      ? {
                        bg: "white",
                        borderColor: BRAND,
                        transform: "translateY(-3px)",
                        boxShadow: "0 10px 30px -10px rgba(93, 86, 44, 0.2)",
                      }
                      : undefined
                  }
                  cursor={mapUrl ? "pointer" : "default"}
                  transition="all 0.3s ease"
                >
                  <Flex
                    flexShrink={0}
                    w={{ base: "40px", md: "50px" }}
                    h={{ base: "40px", md: "50px" }}
                    borderRadius="xl"
                    bg="white"
                    color={BRAND}
                    align="center"
                    justify="center"
                    boxShadow="sm"
                    borderWidth="1px"
                    borderColor="gray.100"
                  >
                    <MapPin size={24} strokeWidth={2} />
                  </Flex>
                  <Box flex="1" mt={{ base: 0, md: 1 }}>
                    <Text
                      color="gray.800"
                      fontSize={{ base: "sm", md: "md" }}
                      fontWeight="600"
                      lineHeight="1.7"
                      fontFamily="var(--font-tajawal), Tajawal, sans-serif"
                    >
                      {loc}
                    </Text>
                    {mapUrl && (
                      <Flex
                        align="center"
                        gap={1.5}
                        mt={3}
                        color={BRAND}
                        fontSize="sm"
                        fontWeight="700"
                      >
                        <Text>عرض الموقع على الخريطة</Text>
                        <ExternalLink size={16} strokeWidth={2.5} />
                      </Flex>
                    )}
                  </Box>
                </Flex>
              );

              if (mapUrl) {
                return (
                  <Link
                    key={i}
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    _hover={{ textDecoration: "none" }}
                    display="block"
                  >
                    {box}
                  </Link>
                );
              }
              return <Box key={i}>{box}</Box>;
            })}
          </Stack>

          <Box textAlign="center" position="relative" zIndex={1}>
            <Button
              as="a"
              // @ts-ignore
              href={doctorInfo.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              h="auto"
              bg={BRAND}
              color="white"
              px={{ base: 8, md: 12 }}
              py={{ base: 5, md: 6 }}
              borderRadius="2xl"
              fontSize={{ base: "lg", md: "xl" }}
              fontWeight="bold"
              fontFamily="var(--font-tajawal), Tajawal, sans-serif"
              _hover={{
                bg: "#4a4528",
                transform: "translateY(-3px)",
                boxShadow: "0 20px 40px -15px rgba(93, 86, 44, 0.4)",
              }}
              _active={{
                transform: "translateY(0)",
              }}
              transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
              display="inline-flex"
              alignItems="center"
              gap={3}
            >
              <MessageCircle size={26} strokeWidth={2.5} />
              تواصل معنا عبر واتساب
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

