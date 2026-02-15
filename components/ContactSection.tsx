'use client'

import {
    Box,
    Heading,
    Stack,
    Text,
    Container,
    Input,
    Textarea,
    Button
} from '@chakra-ui/react'
import { doctorInfo } from '@/data/services'

export default function ContactSection() {
    return (
        <Box id="contact" bg="gray.100" borderRadius="lg" m={{ base: 5, md: 16, lg: 10 }} p={{ base: 5, lg: 16 }} dir="rtl">
            <Container maxW="7xl">
                <Box display={{ md: 'flex' }} gap={10}>
                    <Box flex={1} bg="#615b36" borderRadius="2xl" p={{ base: 8, md: 10 }} color="white" mb={{ base: 10, md: 0 }} boxShadow="xl" position="relative" overflow="hidden">
                        {/* Decorative Circle */}
                        <Box position="absolute" top={-10} right={-10} w={40} h={40} bg="whiteAlpha.100" rounded="full" blur="2xl" />
                        <Box position="absolute" bottom={-10} left={-10} w={40} h={40} bg="whiteAlpha.100" rounded="full" blur="2xl" />
                        <Heading mb={6}>تواصل معنا</Heading>
                        <Text mb={8} fontSize="lg">
                            نسعد باستقبال استفساراتكم وحجز مواعيدكم في عيادات دكتورة ريم عاطف.
                        </Text>

                        <Stack gap={6}>
                            {doctorInfo.locations.map((loc, i) => (
                                <Box key={i}>
                                    <Heading size="md" mb={2} display="flex" alignItems="center">📍 الفرع {i + 1}</Heading>
                                    <Text>{loc}</Text>
                                </Box>
                            ))}

                            <Box>
                                <Heading size="md" mb={2}>📞 الهاتف</Heading>
                                <Text>01xxxxxxxxx (رقم الهاتف)</Text>
                            </Box>

                            <Box>
                                <Heading size="md" mb={2}>📧 البريد الإلكتروني</Heading>
                                <Text>contact@dr-reematef.com</Text>
                            </Box>
                        </Stack>
                    </Box>

                    <Box flex={1} bg="white" borderRadius="2xl" p={{ base: 6, md: 10 }} boxShadow="xl" border="1px solid" borderColor="gray.100">
                        <form onSubmit={(e: React.FormEvent) => { e.preventDefault(); alert("شكراً لتواصلك معنا! سيتم الرد قريباً."); }}>
                            <Stack gap={6}>
                                <Box>
                                    <Text mb={2} fontWeight="bold" fontSize="sm" color="gray.700">الاسم</Text>
                                    <Input
                                        placeholder="الاسم ثلاثي"
                                        size="lg"
                                        bg="gray.50"
                                        borderRadius="xl"
                                        border="1px solid"
                                        borderColor="gray.200"
                                        _focus={{ borderColor: "#615b36", ring: "2px", ringColor: "#615b36" }}
                                        required
                                    />
                                </Box>

                                <Box>
                                    <Text mb={2} fontWeight="bold" fontSize="sm" color="gray.700">رقم الهاتف</Text>
                                    <Input
                                        type="tel"
                                        placeholder="01xxxxxxxxx"
                                        size="lg"
                                        bg="gray.50"
                                        borderRadius="xl"
                                        border="1px solid"
                                        borderColor="gray.200"
                                        _focus={{ borderColor: "#615b36", ring: "2px", ringColor: "#615b36" }}
                                        required
                                    />
                                </Box>

                                <Box>
                                    <Text mb={2} fontWeight="bold" fontSize="sm" color="gray.700">الرسالة</Text>
                                    <Textarea
                                        placeholder="كيف يمكننا مساعدتك؟"
                                        rows={5}
                                        size="lg"
                                        bg="gray.50"
                                        borderRadius="xl"
                                        border="1px solid"
                                        borderColor="gray.200"
                                        _focus={{ borderColor: "#615b36", ring: "2px", ringColor: "#615b36" }}
                                        resize="none"
                                    />
                                </Box>

                                <Button
                                    type="submit"
                                    size="lg"
                                    w="full"
                                    bg="#615b36"
                                    color="white"
                                    borderRadius="xl"
                                    fontSize="lg"
                                    _hover={{ bg: "#4a4529", transform: "translateY(-2px)", boxShadow: "lg" }}
                                    transition="all 0.3s"
                                >
                                    إرسال الرسالة
                                </Button>
                            </Stack>
                        </form>
                    </Box>
                </Box>
            </Container>
        </Box>
    )
}
