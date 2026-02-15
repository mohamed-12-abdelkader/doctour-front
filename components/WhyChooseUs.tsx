'use client'

import { Box, SimpleGrid, Text } from '@chakra-ui/react'
import { MotionBox, fadeInUp, staggerContainer } from './MotionBox'

export default function WhyChooseUs() {
    // Simple feature list since we avoided icon libraries for simplicity.
    // In a real app we'd use react-icons/fa or lucide-react.
    const features = [
        {
            title: 'أطباء متخصصون',
            text: 'فريق طبي على أعلى مستوى بقيادة دكتورة ريم عاطف.',
            icon: '👩‍⚕️'
        },
        {
            title: 'أحدث الأجهزة',
            text: 'نستخدم أحدث التقنيات العالمية في مجال الجلدية والتجميل.',
            icon: '🔬'
        },
        {
            title: 'تعقيم كامل',
            text: 'نلتزم بأعلى معايير التعقيم والنظافة لسلامتكم.',
            icon: '✨'
        },
        {
            title: 'نتائج مضمونة',
            text: 'نسعى دائماً لتحقيق أفضل النتائج الطبيعية التي ترضيكم.',
            icon: '🏆'
        }
    ]
    return (
        <Box p={4} bg="#615b36" color="white" dir="rtl">
            <MotionBox
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={staggerContainer}
            >
                <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={10} maxW={'7xl'} mx={'auto'} py={10}>
                    {features.map((feature) => (
                        <MotionBox key={feature.title} variants={fadeInUp}>
                            <Box bg="whiteAlpha.100" p={6} rounded="md" textAlign="center" _hover={{ bg: 'whiteAlpha.200' }} transition="all 0.3s">
                                <Text fontSize={'4xl'} mb={4}>{feature.icon}</Text>
                                <Text fontWeight={600} fontSize={'xl'} mb={2}>{feature.title}</Text>
                                <Text color={'gray.100'}>{feature.text}</Text>
                            </Box>
                        </MotionBox>
                    ))}
                </SimpleGrid>
            </MotionBox>
        </Box>
    )
}
