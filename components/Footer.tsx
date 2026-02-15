'use client'

import { Box, Container, Stack, Text, Link, Flex } from '@chakra-ui/react'

export default function Footer() {
    return (
        <Box
            bg="#615b36"
            color="white"
            dir="rtl"
            mt={10}
        >
            <Container as={Stack} maxW={'6xl'} py={10}>
                <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align="center" gap={6}>
                    <Stack align={{ base: 'center', md: 'flex-start' }}>
                        <Text fontSize="lg" fontWeight="bold">دكتورة ريم عاطف</Text>
                        <Text fontSize="sm">ماجستير الجلدية والتجميل والليزر</Text>
                    </Stack>

                    <Stack direction={'row'} gap={6}>
                        <Link href={'#'}>الرئيسية</Link>
                        <Link href={'#services'}>الخدمات</Link>
                        <Link href={'#contact'}>تواصل معنا</Link>
                    </Stack>
                </Flex>
                <Box borderTopWidth={1} borderStyle={'solid'} borderColor={'whiteAlpha.300'} pt={6} mt={6} textAlign="center">
                    <Text fontSize="sm">© {new Date().getFullYear()} جميع الحقوق محفوظة لدكتورة ريم عاطف. تم التطوير بواسطة DocTour.</Text>
                </Box>
            </Container>
        </Box>
    )
}
