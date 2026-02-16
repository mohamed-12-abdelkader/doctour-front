'use client'

import { Box, Flex, Button, Stack, Link as ChakraLink, useDisclosure, Container, IconButton, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { AlignJustify, X } from 'lucide-react'
import BookingModal from '@/components/BookingModal'
import { Booking } from '@/types/booking'

// Custom Logo Component
const Logo = () => (
    <Box>
        <Text
            fontFamily="heading"
            fontSize="2xl"
            fontWeight="bold"
            color="#615b36"
            letterSpacing="tighter"
        >
            R<Text as="span" fontSize="lg" verticalAlign="top">E</Text>
        </Text>
    </Box>
)

export default function Navbar() {
    // Existing menu state
    const { open, onToggle } = useDisclosure()

    // Booking modal state
    const { open: isBookingOpen, onOpen: onBookingOpen, onClose: onBookingClose } = useDisclosure()

    const handleSaveBooking = (bookingData: Omit<Booking, 'id' | 'createdAt'>) => {
        console.log("New Booking from Navbar:", bookingData)
        // Implementation for saving booking would go here
        onBookingClose()
    }

    const Links = [
        { name: 'الرئيسية', href: '/' },
        { name: 'خدماتنا', href: '/#services' },
        { name: 'آراء العملاء', href: '/#reviews' },
        { name: 'تواصل معنا', href: '/#contact' },
    ]

    return (
        <Box
            as="nav"
            position="fixed"
            w="100%"
            zIndex={1000}
            top={4} // Move it down a bit to float
            dir="rtl"
            px={4}
        >
            <Container maxW={"6xl"}>
                <Box
                    bg="rgba(255, 255, 255, 0.8)"
                    backdropFilter="blur(10px)"
                    border="1px solid"
                    borderColor="#b6b299" // Matches the border in the image
                    borderRadius="2xl" // Rounded corners like the image
                    px={6}
                    py={3}
                    shadow="sm"
                >
                    <Flex alignItems={'center'} justifyContent={'space-between'}>
                        {/* Desktop Menu - Right Side in RTL */}
                        <Stack direction={'row'} gap={8} display={{ base: 'none', md: 'flex' }} alignItems="center">
                            {Links.map((link) => (
                                <ChakraLink
                                    key={link.name}
                                    href={link.href}
                                    fontSize="lg"
                                    fontWeight="bold"
                                    color="#615b36"
                                    _hover={{
                                        textDecoration: 'none',
                                        opacity: 0.8
                                    }}
                                >
                                    {link.name}
                                </ChakraLink>
                            ))}
                        </Stack>

                        {/* Mobile Menu Button */}
                        <Box display={{ base: 'flex', md: 'none' }}>
                            <IconButton
                                onClick={onToggle}
                                variant="ghost"
                                aria-label="Toggle Navigation"
                                // @ts-ignore
                                icon={open ? <X size={24} /> : <AlignJustify size={24} />}
                                color="#615b36"
                            />
                        </Box>

                        {/* Logo & Call to Action - Left Side in RTL */}
                        <Flex align="center" gap={4}>
                            <Button
                                display={{ base: 'none', md: 'inline-flex' }}
                                onClick={onBookingOpen}
                                variant="solid"
                                bg="#615b36"
                                color="white"
                                _hover={{ bg: "#4a452a" }}
                                size="sm"
                                fontFamily="var(--font-tajawal)"
                                borderRadius="full"
                                px={6}
                            >
                                حجز موعد
                            </Button>

                            {/* Logo */}
                            <Box border="1px solid #615b36" p={1} borderRadius="md">
                                <Text fontWeight="bold" color="#615b36" fontSize="sm" lineHeight="1">R<br />E</Text>
                            </Box>
                        </Flex>
                    </Flex>

                    {/* Mobile Menu Dropdown */}
                    {open && (
                        <Box pb={4} pt={4} display={{ md: 'none' }}>
                            <Stack as={'nav'} gap={4} align="center">
                                {Links.map((link) => (
                                    <ChakraLink
                                        key={link.name}
                                        href={link.href}
                                        onClick={onToggle}
                                        fontSize="xl"
                                        fontWeight="medium"
                                        color="#615b36"
                                        w="full"
                                        textAlign="center"
                                        py={2}
                                        _hover={{
                                            bg: 'blackAlpha.50'
                                        }}
                                        rounded="md"
                                    >
                                        {link.name}
                                    </ChakraLink>
                                ))}
                                <Button
                                    w="full"
                                    onClick={() => { onBookingOpen(); onToggle(); }}
                                    bg="#615b36"
                                    color="white"
                                    _hover={{ bg: "#4a452a" }}
                                    fontFamily="var(--font-tajawal)"
                                >
                                    حجز موعد
                                </Button>
                            </Stack>
                        </Box>
                    )}
                </Box>
            </Container>

            <BookingModal
                isOpen={isBookingOpen}
                onClose={onBookingClose}
                onSave={handleSaveBooking}
            />
        </Box>
    )
}
