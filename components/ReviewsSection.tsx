'use client'

import { Box, Heading, Text, Stack, Container } from '@chakra-ui/react'
import { reviewImages } from '@/data/reviewImages'
import { MotionBox, fadeInUp } from './MotionBox'

export default function ReviewsSection() {
  return (
    <Box id="reviews" bg="white" py={20} dir="rtl">
      <Container maxW="7xl" mb={10}>
        <MotionBox
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <Stack gap={0} align="center" mb={10}>
            <Heading fontSize="4xl" color="#615b36">
              آراء عملائنا
            </Heading>
            <Text fontSize="lg" color="gray.500">
              سعداء دائماً بخدمتكم ورضاكم هو هدفنا
            </Text>
          </Stack>
        </MotionBox>
      </Container>

      {/* كاروسيل ريفيوهات — يتحرك أفقياً تلقائياً */}
      <Box dir="ltr" position="relative" w="100%" overflow="hidden">
        <Box
          className="reviews-track"
          display="flex"
          gap={{ base: 4, md: 6 }}
          w="max-content"
          py={2}
          px={{ base: 4, md: 6 }}
        >
          {reviewImages.map((src, i) => (
            <Box
              key={`a-${i}`}
              flexShrink={0}
              w={{ base: '260px', sm: '300px', md: '340px' }}
              h={{ base: '280px', sm: '320px', md: '360px' }}
              borderRadius="2xl"
              overflow="hidden"
              bg="white"
              boxShadow="0 10px 30px -10px rgba(93, 86, 44, 0.15)"
              borderWidth="1px"
              borderColor="rgba(97, 91, 54, 0.12)"
            >
              <Box
                as="img"
                // @ts-ignore
                src={src}
                alt={`ريفيو ${i + 1}`}
                w="100%"
                h="100%"
                display="block"
                objectFit="contain"
              />
            </Box>
          ))}
          {reviewImages.map((src, i) => (
            <Box
              key={`b-${i}`}
              flexShrink={0}
              w={{ base: '260px', sm: '300px', md: '340px' }}
              h={{ base: '280px', sm: '320px', md: '360px' }}
              borderRadius="2xl"
              overflow="hidden"
              bg="white"
              boxShadow="0 10px 30px -10px rgba(93, 86, 44, 0.15)"
              borderWidth="1px"
              borderColor="rgba(97, 91, 54, 0.12)"
            >
              <Box
                as="img"
                // @ts-ignore
                src={src}
                alt={`ريفيو ${i + 1}`}
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
  )
}
