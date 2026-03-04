"use client";

import {
  Box,
  Flex,
  Heading,
  Text,
  Stack,
  Container,
  Button,
  useDisclosure,
} from "@chakra-ui/react";
import { doctorInfo } from "@/data/services";
import { MotionBox, fadeInUp, staggerContainer } from "./MotionBox";
import heroImg from "@/images/eldoctour.svg";
import NextImage from "next/image";
import OnlineBookingModal from "@/components/OnlineBookingModal";

const BRAND = {
  color: "#5d562c",
  colorMuted: "#6b6540",
  bg: "#5d562c",
  bgHover: "#4a4528",
};

export default function HeroSection() {
  const { open: isOpen, onOpen, onClose } = useDisclosure();

  return (
    <>
      <Box
        bg="linear-gradient(to bottom, #FAFAF9 0%, #F5F5F0 100%)"
        dir="rtl"
        position="relative"
        overflow="hidden"
        minH={{ base: "auto", md: "65vh", lg: "70vh" }}
        py={{ base: 10, sm: 12, md: 14, lg: 16 }}
        px={{ base: 3, sm: 4 }}
        display="flex"
        alignItems={{ base: "stretch", lg: "flex-end" }}
      >
        <Box
          position="absolute"
          bottom="0"
          left="0"
          w="100%"
          h="120px"
          bg="linear-gradient(to top, rgba(0,0,0,0.04), transparent)"
          zIndex={0}
          pointerEvents="none"
        />

        <Container
          maxW="7xl"
          position="relative"
          zIndex={1}
          px={{ base: 2, sm: 4, md: 6 }}
        >
          <Flex
            justify="space-between"
            direction={{ base: "column-reverse", lg: "row" }}
            gap={{ base: 8, sm: 10, md: 12, lg: 10 }}
            alignItems={{ base: "flex-start", lg: "flex-end" }}
            h="100%"
          >
            {/* النص — يبدأ من اليمين في كل الشاشات */}
            <MotionBox
              flex={1.4}
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              textAlign="right"
              mb={{ base: 2, sm: 4, lg: 28 }}
              minW={0}
            >
              <Stack gap={{ base: 2, sm: 3, md: 4 }}>
                <MotionBox variants={fadeInUp}>
                  <Heading
                    as="h1"
                    fontSize={{
                      base: "2.2rem",
                      sm: "2.6rem",
                      md: "3.2rem",
                      lg: "3.8rem",
                    }}
                    fontWeight="700"
                    color={BRAND.color}
                    lineHeight="1.15"
                    letterSpacing="tight"
                    whiteSpace={{ lg: "nowrap" }}
                  >
                    {doctorInfo.name}
                  </Heading>
                </MotionBox>

                <MotionBox variants={fadeInUp}>
                  <Stack
                    gap={{ base: 1, sm: 1.5 }}
                    fontSize={{
                      base: "xs",
                      sm: "sm",
                      md: "md",
                      lg: "lg",
                      xl: "xl",
                    }}
                    color={BRAND.colorMuted}
                    fontWeight="600"
                  >
                    {[
                      doctorInfo.title_1,
                      doctorInfo.title_2,
                      doctorInfo.title_3,
                    ].map((title) => (
                      <Text key={title}>{title}</Text>
                    ))}
                  </Stack>
                </MotionBox>

                <MotionBox variants={fadeInUp}>
                  <Flex
                    justifyContent={{ base: "space-between", md: "flex-start" }}
                    width="100%"
                    gap={{ base: 3, md: 4 }}
                    pt={{ base: 2, md: 3 }}
                    pb={{ base: 2, lg: 0 }}
                    flexWrap={{ base: "nowrap", md: "wrap" }}
                  >
                    <Box flex={1} minW={0}>
                      <Button
                        onClick={onOpen}
                        size="lg"
                        bg={BRAND.bg}
                        color="white"
                        w="100%"
                        px={{ base: 4, sm: 5, md: 8, lg: 10 }}
                        py={{ base: 3, sm: 3.5, md: 4 }}
                        minH={{ base: "40px", sm: "42px", md: "44px" }}
                        rounded="xl"
                        fontSize={{ base: "md", sm: "lg", md: "xl" }}
                        fontWeight="bold"
                        _hover={{
                          bg: BRAND.bgHover,
                          transform: "translateY(-2px)",
                          boxShadow: "xl",
                        }}
                        transition="all 0.3s"
                      >
                        حجز موعد اونلاين
                      </Button>
                    </Box>
                    <Box
                      as="a"
                      href={doctorInfo.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      flex={1}
                      minW={0}
                    >
                      <Button
                        size="lg"
                        variant="outline"
                        color={BRAND.color}
                        borderWidth="2px"
                        borderColor={BRAND.bg}
                        bg="transparent"
                        w="100%"
                        px={{ base: 4, sm: 5, md: 8, lg: 10 }}
                        py={{ base: 3, sm: 3.5, md: 4 }}
                        minH={{ base: "40px", sm: "42px", md: "44px" }}
                        rounded="xl"
                        fontSize={{ base: "md", sm: "lg", md: "xl" }}
                        fontWeight="bold"
                        _hover={{
                          bg: BRAND.bg,
                          color: "white",
                          transform: "translateY(-2px)",
                          boxShadow: "xl",
                        }}
                        transition="all 0.3s"
                      >
                        تواصل واتساب
                      </Button>
                    </Box>
                  </Flex>
                </MotionBox>
              </Stack>
            </MotionBox>

            {/* صورة الدكتورة — الكارد يلتف حول حجم الصورة */}
            <MotionBox
              flex={1}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7 }}
              position="relative"
              display="flex"
              justifyContent="center"
              alignItems="flex-end"
              w="100%"
              minW={0}
            >
              <Box
                position="relative"
                w="100%"
                maxW={{
                  base: "260px",
                  sm: "320px",
                  md: "380px",
                  lg: "440px",
                  xl: "520px",
                }}
                mx={{ base: "auto", lg: "0" }}
                borderRadius={{ base: "2xl", sm: "3xl", md: "3xl" }}
                overflow="hidden"
                boxShadow="0 20px 40px -12px rgba(93, 86, 44, 0.2), 0 8px 20px -8px rgba(0,0,0,0.1)"
                borderWidth="1px"
                borderColor="rgba(93, 86, 44, 0.12)"
                bg="white"
                lineHeight={0}
              >
                <NextImage
                  alt={doctorInfo.name}
                  src={heroImg}
                  priority
                  unoptimized
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                  }}
                />
              </Box>
              <Box
                display={{ base: "block", lg: "none" }}
                position="absolute"
                bottom={{ base: "-6px", sm: "-8px" }}
                left="50%"
                transform="translateX(-50%)"
                w="50%"
                h="10px"
                borderRadius="full"
                bg="blackAlpha.06"
                zIndex={-1}
              />
            </MotionBox>
          </Flex>
        </Container>
      </Box>

      <OnlineBookingModal isOpen={isOpen} onClose={onClose} />
    </>
  );
}
