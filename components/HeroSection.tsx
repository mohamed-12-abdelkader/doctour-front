'use client'

import {
    Box, Flex, Heading, Text, Stack, Container, Button,
    useDisclosure
} from '@chakra-ui/react'
import { doctorInfo } from '@/data/services'
import { MotionBox, fadeInUp, staggerContainer } from './MotionBox'
import img from '@/images/ream.png'
import NextImage from 'next/image'
import OnlineBookingModal from '@/components/OnlineBookingModal'

export default function HeroSection() {
    const { open: isOpen, onOpen, onClose } = useDisclosure()

    return (
        <>
            <Box
                bg="linear-gradient(to bottom, #FAFAF9 0%, #F5F5F0 100%)"
                dir="rtl"
                position="relative"
                overflow="hidden"
                minH="70vh"
                display="flex"
                alignItems="flex-end"
            >
                {/* Bottom Shadow Overlay */}
                <Box
                    position="absolute"
                    bottom="0"
                    left="0"
                    w="100%"
                    h="150px"
                    bg="linear-gradient(to top, rgba(0,0,0,0.05), transparent)"
                    zIndex={0}
                    pointerEvents="none"
                />

                <Container maxW={'7xl'} position="relative" zIndex={1} h="100%">
                    <Flex
                        justify={'space-between'}
                        direction={{ base: 'column-reverse', lg: 'row' }}
                        gap={{ base: 12, lg: 10 }}
                        alignItems="flex-end"
                        h="100%"
                    >

                        {/* Text Content */}
                        <MotionBox
                            flex={1.4}
                            initial="hidden"
                            animate="visible"
                            variants={staggerContainer}
                            textAlign={{ base: 'center', lg: 'right' }}
                            mb={{ base: 10, lg: 28 }}
                        >
                            <Stack gap={{ base: 6, md: 8 }}>
                                <MotionBox variants={fadeInUp}>
                                    <Heading
                                        as="h1"
                                        fontSize={{ base: '4xl', md: '4xl', lg: '7xl' }}
                                        fontWeight="700"
                                        color="#544f30"
                                        lineHeight="1.1"
                                        letterSpacing="tight"
                                        fontFamily="var(--font-cairo)"
                                        whiteSpace={{ lg: "nowrap" }}
                                    >
                                        {doctorInfo.name}
                                    </Heading>
                                </MotionBox>

                                <MotionBox variants={fadeInUp}>
                                    <Stack gap={4} fontSize={{ base: "xl", md: "2xl" }} color="gray.600" fontWeight="600">
                                        <Stack gap={3}>
                                            <Flex alignItems="center" gap={3} justifyContent={{ base: 'center', lg: 'flex-start' }}>
                                                <Box w="6px" h="6px" bg="black" rounded="full" mt={1} />
                                                <Text fontFamily="var(--font-tajawal)">{doctorInfo.title_1}</Text>
                                            </Flex>
                                            <Flex alignItems="center" gap={3} justifyContent={{ base: 'center', lg: 'flex-start' }}>
                                                <Box w="6px" h="6px" bg="black" rounded="full" mt={1} />
                                                <Text fontFamily="var(--font-tajawal)">{doctorInfo.title_2}</Text>
                                            </Flex>
                                            <Flex alignItems="center" gap={3} justifyContent={{ base: 'center', lg: 'flex-start' }}>
                                                <Box w="6px" h="6px" bg="black" rounded="full" mt={1} />
                                                <Text fontFamily="var(--font-tajawal)">{doctorInfo.title_3}</Text>
                                            </Flex>
                                        </Stack>
                                    </Stack>
                                </MotionBox>

                                <MotionBox variants={fadeInUp}>
                                    <Box mt={4} display="flex" justifyContent="center" width="100%">
                                        <Button
                                            onClick={onOpen}
                                            size="lg"
                                            bg="#615b36"
                                            color="white"
                                            px={14}
                                            py={8}
                                            rounded="md"
                                            fontSize="2xl"
                                            fontWeight="bold"
                                            fontFamily="var(--font-tajawal)"
                                            _hover={{
                                                bg: "#4a452a",
                                                transform: "translateY(-2px)",
                                                boxShadow: "lg"
                                            }}
                                            transition="all 0.3s"
                                        >
                                            حجز موعد
                                        </Button>
                                    </Box>
                                </MotionBox>
                            </Stack>
                        </MotionBox>

                        {/* Image Content */}
                        <MotionBox
                            flex={1}
                            initial={{ opacity: 0, x: -50 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                            position="relative"
                            display="flex"
                            justifyContent="center"
                            alignItems="flex-end"
                        >
                            <Box
                                position="relative"
                                w={{ base: "300px", md: "500px", lg: "650px" }}
                                h={{ base: "350px", md: "550px", lg: "700px" }}
                            >
                                <NextImage
                                    alt={doctorInfo.name}
                                    src={img}
                                    fill
                                    style={{ objectFit: 'contain', objectPosition: 'bottom' }}
                                    priority
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                />
                            </Box>
                        </MotionBox>
                    </Flex>
                </Container>
            </Box>

            {/* حجز موعد أونلاين — POST /api/bookings/online */}
            <OnlineBookingModal isOpen={isOpen} onClose={onClose} />
        </>
    )
}
