"use client";

import {
  Box,
  Container,
  Heading,
  Grid,
  Text,
  Stack,
  Flex,
} from "@chakra-ui/react";
import { MotionBox, fadeInUp } from "./MotionBox";
import { ArrowLeft } from "lucide-react";
import { AnimatePresence } from "framer-motion";

const BRAND = "#5d562c";

const SERVICES_LIST = [
  "Botox",
  "filler",
  "تنعيم علاجي للشعر",
  "Skin booster",
  "جلسة أوكسجينو",
  "تقشير بارد",
  "تقشير كيميائي",
  "ديرما بن بلازما أو ميزو",
  "جلسة تساقط الشعر",
  "إزالة الزوائد الجلدية",
  "توريد علاجي للشفايف",
  "تنضيف بشرة Basic",
  "تنضيف بشرة عميق",
];

export default function ServicesSection() {
  return (
    <Box
      id="services"
      py={16}
      bg="white"
      dir="rtl"
      position="relative"
      overflow="hidden"
      fontFamily="var(--font-tajawal), Tajawal, sans-serif"
    >
      <Container maxW="7xl">
        <Stack textAlign="center" align="center" mb={16}>
          <MotionBox
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <Flex align="center" justify="center" gap={2} mb={4}>
              <Box h="1px" w="40px" bg={BRAND} />
              <Text color={BRAND} fontWeight="bold" letterSpacing="wider">
                خدماتنا المتميزة
              </Text>
              <Box h="1px" w="40px" bg={BRAND} />
            </Flex>
            <Heading
              fontSize={{ base: "2.5xl", md: "4xl", lg: "5xl" }}
              fontWeight="800"
              color={BRAND}
              mb={6}
              fontFamily="var(--font-tajawal), Tajawal, sans-serif"
            >
              أمانه — ثقة — جودة
            </Heading>
            <Text
              color="gray.600"
              fontSize="lg"
              maxW="2xl"
              fontFamily="var(--font-tajawal), Tajawal, sans-serif"
            >
              نقدم أحدث الحلول التجميلية غير الجراحية لتعزيز جمالك الطبيعي وثقتك
              بنفسك
            </Text>
          </MotionBox>
        </Stack>

        <Box>
          <AnimatePresence mode="wait">
            <MotionBox
              key="all-services"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Grid
                templateColumns={{
                  base: "1fr",
                  sm: "1fr",
                  md: "repeat(2, 1fr)",
                  lg: "repeat(3, 1fr)",
                }}
                gap={{ base: 4, md: 6, lg: 8 }}
              >
                {SERVICES_LIST.map((name, index) => (
                  <MotionBox
                    key={name}
                    variants={fadeInUp}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: index * 0.05 }}
                  >
                    <Flex
                      bg="white"
                      p={{ base: 4, md: 5, lg: 6 }}
                      rounded="2xl"
                      border="1px solid"
                      borderColor="gray.100"
                      align="center"
                      justify="space-between"
                      transition="all 0.3s"
                      _hover={{
                        borderColor: BRAND,
                        boxShadow: "0 10px 30px -10px rgba(93, 86, 44, 0.2)",
                        transform: "translateY(-4px)",
                      }}
                      className="group"
                      role="group"
                      position="relative"
                      overflow="hidden"
                      fontFamily="var(--font-tajawal), Tajawal, sans-serif"
                    >
                      <Box position="relative" zIndex={1}>
                        <Heading
                          size="md"
                          mb={1}
                          color="gray.800"
                          _groupHover={{ color: BRAND }}
                          transition="color 0.2s"
                          fontFamily="var(--font-tajawal), Tajawal, sans-serif"
                        >
                          {name}
                        </Heading>
                      </Box>

                      <Box
                        w={10}
                        h={10}
                        rounded="full"
                        bg="gray.50"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        color="gray.400"
                        _groupHover={{ bg: BRAND, color: "white" }}
                        transition="all 0.3s"
                      >
                        <ArrowLeft size={18} />
                      </Box>
                    </Flex>
                  </MotionBox>
                ))}
              </Grid>
            </MotionBox>
          </AnimatePresence>
        </Box>
      </Container>
    </Box>
  );
}
