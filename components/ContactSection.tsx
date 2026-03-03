'use client'

import { Box, Flex, Heading, Stack, Text, Container, Button, Link } from '@chakra-ui/react'
import { doctorInfo } from '@/data/services'

const BRAND = '#5d562c'

export default function ContactSection() {
  return (
    <Box
      id="contact"
      bg="linear-gradient(to bottom, #FAFAF9 0%, #F5F5F0 100%)"
      py={20}
      px={{ base: 4, md: 6 }}
      dir="rtl"
      fontFamily="var(--font-tajawal), Tajawal, sans-serif"
    >
      <Container maxW="7xl">
        <Box
          maxW="2xl"
          mx="auto"
          bg="white"
          borderRadius="2xl"
          p={{ base: 8, md: 14 }}
          boxShadow="0 20px 50px -15px rgba(93, 86, 44, 0.12)"
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
            w="200px"
            h="200px"
            bg={BRAND}
            opacity={0.04}
            borderRadius="full"
            transform="translate(30%, -30%)"
          />

          <Flex align="center" justify="center" gap={2} mb={4}>
            <Box h="1px" w="40px" bg={BRAND} />
            <Text color={BRAND} fontWeight="bold" fontSize="sm" letterSpacing="wider">
              العيادة
            </Text>
            <Box h="1px" w="40px" bg={BRAND} />
          </Flex>

          <Heading
            fontSize={{ base: '2xl', md: '3xl' }}
            fontWeight="800"
            color={BRAND}
            mb={4}
            textAlign="center"
            fontFamily="var(--font-tajawal), Tajawal, sans-serif"
          >
            تواصل معنا
          </Heading>

          <Text
            textAlign="center"
            color="gray.600"
            fontSize="lg"
            mb={10}
            fontFamily="var(--font-tajawal), Tajawal, sans-serif"
          >
            نسعد باستقبال استفساراتكم وحجز مواعيدكم في عيادات دكتورة ريم عاطف.
          </Text>

          <Stack gap={5} mb={10}>
            {doctorInfo.locations.map((loc, i) => {
              const mapUrl = doctorInfo.locationMapUrls?.[i]
              const box = (
                <Flex
                  align="flex-start"
                  gap={3}
                  p={4}
                  borderRadius="xl"
                  bg="gray.50"
                  borderWidth="1px"
                  borderColor="gray.100"
                  _hover={mapUrl ? { bg: 'gray.100', borderColor: BRAND } : undefined}
                  cursor={mapUrl ? 'pointer' : undefined}
                  transition="all 0.2s"
                >
                  <Box
                    flexShrink={0}
                    w="8px"
                    h="8px"
                    borderRadius="full"
                    bg={BRAND}
                    mt="6px"
                  />
                  <Box>
                    <Text
                      fontWeight="700"
                      color={BRAND}
                      fontSize="sm"
                      mb={1}
                      fontFamily="var(--font-tajawal), Tajawal, sans-serif"
                    >
                      الفرع {i + 1}
                    </Text>
                    <Text
                      color="gray.700"
                      fontSize="md"
                      lineHeight="1.6"
                      fontFamily="var(--font-tajawal), Tajawal, sans-serif"
                    >
                      {loc}
                    </Text>
                    {mapUrl && (
                      <Text fontSize="xs" color={BRAND} mt={1}>
                        انقر لفتح الموقع على الخريطة ↗
                      </Text>
                    )}
                  </Box>
                </Flex>
              )
              if (mapUrl) {
                return (
                  <Link
                    key={i}
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    _hover={{ textDecoration: 'none' }}
                  >
                    {box}
                  </Link>
                )
              }
              return <Box key={i}>{box}</Box>
            })}
          </Stack>

          <Box textAlign="center">
            <Button
              as="a"
              href={doctorInfo.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              bg={BRAND}
              color="white"
              px={10}
              py={6}
              borderRadius="xl"
              fontSize="lg"
              fontWeight="bold"
              fontFamily="var(--font-tajawal), Tajawal, sans-serif"
              _hover={{
                bg: '#4a4528',
                transform: 'translateY(-2px)',
                boxShadow: 'xl',
              }}
              transition="all 0.3s"
            >
              تواصل واتساب
            </Button>
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
