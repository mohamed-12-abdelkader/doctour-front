'use client'

import { Dialog, Button, Input, Text, VStack, Box, Portal, Flex } from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import api from '@/lib/axios'
import { toaster } from '@/components/ui/toaster'

interface OnlineBookingModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function OnlineBookingModal({ isOpen, onClose }: OnlineBookingModalProps) {
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (isOpen) {
            setName('')
            setPhone('')
        }
    }, [isOpen])

    const handleSave = async () => {
        if (!name.trim() || !phone.trim()) {
            toaster.create({ title: 'أدخل الاسم ورقم الهاتف', type: 'warning', duration: 2000 })
            return
        }

        setSaving(true)
        try {
            // تاريخ اليوم يتبعت تلقائياً كـ preferredDate
            const todayDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD

            await api.post('/bookings/online', {
                name: name.trim(),
                phone: phone.trim(),
                preferredDate: todayDate,
            })

            toaster.create({
                title: 'تم تقديم طلب الحجز بنجاح',
                description: 'سيتواصل معك الفريق لتأكيد الموعد',
                type: 'success',
                duration: 4000,
            })
            onClose()
        } catch (error: any) {
            toaster.create({
                title: 'خطأ في تقديم الحجز',
                description: error.response?.data?.message || 'حدث خطأ، حاول لاحقاً',
                type: 'error',
                duration: 3000,
            })
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog.Root open={isOpen} onOpenChange={(e) => !e.open && onClose()}>
            <Portal>
                <Dialog.Backdrop
                    bg="blackAlpha.600"
                    backdropFilter="blur(4px)"
                    zIndex="1400"
                    position="fixed"
                    inset="0"
                />
                <Dialog.Positioner
                    zIndex="1401"
                    position="fixed"
                    inset="0"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    padding={4}
                >
                    <Dialog.Content
                        dir="rtl"
                        bg="white"
                        borderRadius="2xl"
                        overflow="hidden"
                        boxShadow="2xl"
                        width={{ base: '95%', md: '400px' }}
                        outline="none"
                    >
                        {/* Header */}
                        <Box
                            bg="#fdfbf7"
                            px={6} py={4}
                            borderBottom="1px solid" borderColor="#eee"
                            display="flex" justifyContent="space-between" alignItems="center"
                        >
                            <Text fontSize="xl" color="#615b36" fontWeight="bold">
                                حجز موعد أونلاين
                            </Text>
                            <Dialog.CloseTrigger asChild>
                                <Button
                                    size="sm" variant="ghost" color="gray.500"
                                    _hover={{ bg: 'blackAlpha.50', color: 'red.500' }}
                                    rounded="full" w={8} h={8} minW={0} p={0}
                                >✕</Button>
                            </Dialog.CloseTrigger>
                        </Box>

                        <Box p={6}>
                            <VStack gap={4} align="stretch">

                                {/* Name */}
                                <Box>
                                    <Text fontSize="sm" color="gray.600" mb={2}>
                                        الاسم الكامل <Text as="span" color="red.400">*</Text>
                                    </Text>
                                    <Input
                                        placeholder="محمد أحمد"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        bg="gray.50" borderColor="gray.200"
                                        _focus={{ borderColor: '#615b36', bg: 'white' }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                    />
                                </Box>

                                {/* Phone */}
                                <Box>
                                    <Text fontSize="sm" color="gray.600" mb={2}>
                                        رقم الهاتف <Text as="span" color="red.400">*</Text>
                                    </Text>
                                    <Input
                                        placeholder="01xxxxxxxxx"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        dir="ltr" textAlign="left"
                                        bg="gray.50" borderColor="gray.200"
                                        _focus={{ borderColor: '#615b36', bg: 'white' }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                    />
                                    <Text fontSize="xs" color="gray.400" mt={1}>
                                        رقم مصري: 010 / 011 / 012 / 015
                                    </Text>
                                </Box>

                                {/* Actions */}
                                <Flex gap={3} mt={2}>
                                    <Button
                                        flex={1}
                                        onClick={handleSave}
                                        bg="#615b36" color="white"
                                        _hover={{ bg: '#4a452a' }}
                                        loading={saving}
                                        disabled={!name.trim() || !phone.trim()}
                                    >
                                        إرسال طلب الحجز
                                    </Button>
                                    <Button flex={1} onClick={onClose} variant="outline" colorPalette="gray">
                                        إلغاء
                                    </Button>
                                </Flex>

                            </VStack>
                        </Box>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    )
}
