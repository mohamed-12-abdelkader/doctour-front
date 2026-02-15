'use client'

import { Box, Flex, Heading, Text, Stack, Container, Avatar, Card, SimpleGrid } from '@chakra-ui/react'
import { reviews } from '@/data/services'
import { MotionBox, fadeInUp, staggerContainer } from './MotionBox'

const Star = () => (
    <Box as="span" color="yellow.400" fontSize="lg">★</Box>
)

export default function ReviewsSection() {
    return (
        <Box id="reviews" bg="white" py={20} dir="rtl">
            <Container maxW={'7xl'}>
                <MotionBox
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeInUp}
                >
                    <Stack gap={0} align={'center'} mb={10}>
                        <Heading fontSize={'4xl'} color="#615b36">آراء عملائنا</Heading>
                        <Text fontSize={'lg'} color={'gray.500'}>
                            سعداء دائماً بخدمتكم ورضاكم هو هدفنا
                        </Text>
                    </Stack>
                </MotionBox>
                <MotionBox
                    variants={staggerContainer}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                >
                    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={6} w="full">
                        {reviews.slice(0, 4).map((review) => ( // Show only first 4 for cleaner look
                            <MotionBox key={review.id} variants={fadeInUp} h="full">
                                <Card.Root
                                    h="full"
                                    bg="white"
                                    boxShadow="md"
                                    rounded="2xl"
                                    border="1px solid"
                                    borderColor="gray.100"
                                    transition="all 0.3s"
                                    _hover={{ transform: 'translateY(-5px)', boxShadow: 'xl', borderColor: '#615b36' }}
                                    position="relative"
                                    overflow="hidden"
                                >
                                    {/* Quote Mark Decoration */}
                                    <Box position="absolute" top={4} left={4} fontSize="6xl" color="gray.100" lineHeight={0} fontFamily="serif">
                                        &rdquo;
                                    </Box>

                                    <Card.Body p={6} display="flex" flexDirection="column" gap={4}>
                                        <Flex justify="center" mb={2}>
                                            <Avatar.Root size="lg" ring="2px" ringColor="#615b36">
                                                <Avatar.Fallback name={review.name} bg="#615b36" color="white" />
                                            </Avatar.Root>
                                        </Flex>

                                        <Stack gap={1} align="center" textAlign="center">
                                            <Heading size="md">{review.name}</Heading>
                                            <Text fontSize="sm" color="gray.500">{review.date}</Text>
                                        </Stack>

                                        <Flex justify="center" gap={1}>
                                            {Array(5).fill('').map((_, i) => (
                                                <Box key={i} color={i < review.rating ? 'yellow.400' : 'gray.200'}>
                                                    <Star />
                                                </Box>
                                            ))}
                                        </Flex>

                                        <Text textAlign="center" color="gray.600" fontSize="md" fontStyle="italic" position="relative" zIndex={1}>
                                            {review.comment}
                                        </Text>
                                    </Card.Body>
                                </Card.Root>
                            </MotionBox>
                        ))}
                    </SimpleGrid>
                </MotionBox>
            </Container>
        </Box>
    )
}
