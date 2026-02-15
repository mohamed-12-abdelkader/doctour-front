'use client'

import { Box, Container, Heading, Grid, Text, Stack, Card, Flex } from '@chakra-ui/react'
import { services } from '@/data/services'
import { MotionBox, fadeInUp, staggerContainer } from './MotionBox'
import { useState } from 'react'
import { Sparkles, Wand2, Syringe, Star, ArrowLeft } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'

export default function ServicesSection() {
    const [activeTab, setActiveTab] = useState(0)

    // Icons mapping
    const getIcon = (category: string) => {
        if (category.includes('البشرة')) return Sparkles;
        if (category.includes('ياج') || category.includes('تفتيح')) return Wand2;
        if (category.includes('شعر')) return Syringe;
        return Star;
    }

    return (
        <Box id="services" py={16} bg="white" dir="rtl" position="relative" overflow="hidden">
            <Container maxW={'7xl'}>
                <Stack textAlign={'center'} align={'center'} mb={16}>
                    <MotionBox variants={fadeInUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                        <Flex align="center" justify="center" gap={2} mb={4}>
                            <Box h="1px" w="40px" bg="#615b36" />
                            <Text color="#615b36" fontWeight="bold" letterSpacing="wider">خدماتنا المتميزة</Text>
                            <Box h="1px" w="40px" bg="#615b36" />
                        </Flex>
                        <Heading
                            fontSize={{ base: '3xl', md: '5xl' }}
                            fontWeight="800"
                            color="gray.900"
                            mb={6}
                        >
                            تألقي بجمال <Box as="span" color="#615b36">طبيعي</Box>
                        </Heading>
                        <Text color="gray.500" fontSize="lg" maxW="2xl">
                            نقدم أحدث الحلول التجميلية غير الجراحية لتعزيز جمالك الطبيعي وثقتك بنفسك
                        </Text>
                    </MotionBox>
                </Stack>

                {/* Custom Tabs */}
                <Flex
                    justify="center"
                    wrap="wrap"
                    gap={4}
                    mb={16}
                    position="relative"
                    zIndex={1}
                >
                    {services.map((category, index) => {
                        const Icon = getIcon(category.category);
                        const isActive = activeTab === index;
                        return (
                            <Box
                                key={index}
                                as="button"
                                onClick={() => setActiveTab(index)}
                                px={{ base: 6, md: 8 }}
                                py={{ base: 3, md: 4 }}
                                rounded="full"
                                bg={isActive ? '#615b36' : 'white'}
                                color={isActive ? 'white' : 'gray.600'}
                                border="1px solid"
                                borderColor={isActive ? '#615b36' : 'gray.200'}
                                transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                                _hover={{
                                    transform: 'translateY(-2px)',
                                    boxShadow: 'lg',
                                    borderColor: '#615b36',
                                    color: isActive ? 'white' : '#615b36'
                                }}
                                display="flex"
                                alignItems="center"
                                gap={3}
                                position="relative"
                            >
                                <Icon size={20} />
                                <Text fontWeight="bold">{category.category}</Text>
                                {isActive && (
                                    <MotionBox
                                        layoutId="activeTab"
                                        position="absolute"
                                        bottom="-10px"
                                        left="50%"
                                        transform="translateX(-50%)"
                                        w="6px"
                                        h="6px"
                                        bg="#615b36"
                                        rounded="full"
                                    />
                                )}
                            </Box>
                        )
                    })}
                </Flex>

                {/* Content Area */}
                <Box>
                    <AnimatePresence mode="wait">
                        <MotionBox
                            key={activeTab}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap={8}>
                                {services[activeTab].items.map((item, i) => (
                                    <MotionBox
                                        key={i}
                                        variants={fadeInUp}
                                        initial="hidden"
                                        animate="visible"
                                        transition={{ delay: i * 0.1 }}
                                    >
                                        <Flex
                                            bg="white"
                                            p={6}
                                            rounded="2xl"
                                            border="1px solid"
                                            borderColor="gray.100"
                                            align="center"
                                            justify="space-between"
                                            transition="all 0.3s"
                                            _hover={{
                                                borderColor: '#615b36',
                                                boxShadow: '0 10px 30px -10px rgba(97, 91, 54, 0.15)',
                                                transform: 'translateY(-4px)'
                                            }}
                                            className="group"
                                            role="group"
                                            position="relative"
                                            overflow="hidden"
                                        >
                                            <Box position="relative" zIndex={1}>
                                                <Heading size="md" mb={1} color="gray.800" _groupHover={{ color: '#615b36' }} transition="color 0.2s">
                                                    {item.name}
                                                </Heading>
                                                <Text fontSize="sm" color="gray.400">احجزي الآن</Text>
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
                                                _groupHover={{ bg: '#615b36', color: 'white' }}
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
    )
}
