'use client'

import { Dialog, Button, Input, Text, VStack, Flex, Box, Portal } from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import api from '@/lib/axios'
import { toaster } from '@/components/ui/toaster'

const VISIT_TYPES = [
    { value: 'استشارة', label: 'استشارة' },
    { value: 'كشف', label: 'كشف' },
    { value: 'إعادة', label: 'إعادة' },
    { value: 'أخرى', label: 'أخرى' },
]

interface OnlineBookingModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function OnlineBookingModal({ isOpen, onClose }: OnlineBookingModalProps) {
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [age, setAge] = useState<string>('')
    const [visitType, setVisitType] = useState('استشارة')
    const [date, setDate] = useState('')
    const [time, setTime] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (isOpen) {
            const today = new Date()
            setDate(today.toISOString().split('T')[0])
            setTime(today.toTimeString().slice(0, 5))
            setName('')
            setPhone('')
            setAge('')
            setVisitType('استشارة')
        }
    }, [isOpen])

    const handleSave = async () => {
        if (!name.trim() || !phone.trim()) {
            toaster.create({ title: 'أدخل الاسم ورقم الهاتف', type: 'warning', duration: 2000 })
            return
        }
        const ageNum = parseInt(age, 10)
        if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
            toaster.create({ title: 'أدخل عمراً صحيحاً', type: 'warning', duration: 2000 })
            return
        }
        if (!date || !time) {
            toaster.create({ title: 'أدخل التاريخ والوقت', type: 'warning', duration: 2000 })
            return
        }

        const dateIso = new Date(`${date}T${time}`).toISOString()

        setSaving(true)
        try {
            await api.post('/bookings/online', {
                name: name.trim(),
                phone: phone.trim(),
                age: ageNum,
                visitType,
                date: dateIso,
            })
            toaster.create({
                title: 'تم تقديم طلب الحجز بنجاح',
                description: 'سيتم التواصل معك لتأكيد الموعد',
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
                        fontFamily="var(--font-tajawal)"
                        bg="white"
                        borderRadius="2xl"
                        overflow="hidden"
                        boxShadow="2xl"
                        width={{ base: '90%', md: '440px' }}
                        maxH="90vh"
                        overflowY="auto"
                        outline="none"
                    >
                        <Box
                            bg="#fdfbf7"
                            px={6}
                            py={4}
                            borderBottom="1px solid"
                            borderColor="#eee"
                            display="flex"
                            justifyContent="space-between"
                            alignItems="center"
                        >
                            <Text fontSize="xl" color="#615b36" fontWeight="bold">
                                حجز موعد أونلاين
                            </Text>
                            <Dialog.CloseTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    color="gray.500"
                                    _hover={{ bg: 'blackAlpha.50', color: 'red.500' }}
                                    rounded="full"
                                    w={8}
                                    h={8}
                                    minW={0}
                                    p={0}
                                >
                                    ✕
                                </Button>
                            </Dialog.CloseTrigger>
                        </Box>

                        <Box p={6}>
                            <VStack gap={4} align="stretch">
                                <Box>
                                    <Text fontSize="sm" color="gray.600" mb={2}>
                                        الاسم
                                    </Text>
                                    <Input
                                        placeholder="الاسم الكامل"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        bg="gray.50"
                                        borderColor="gray.200"
                                        _focus={{ borderColor: '#615b36', bg: 'white' }}
                                    />
                                </Box>

                                <Box>
                                    <Text fontSize="sm" color="gray.600" mb={2}>
                                        رقم الهاتف
                                    </Text>
                                    <Input
                                        placeholder="01xxxxxxxxx"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        dir="ltr"
                                        textAlign="left"
                                        bg="gray.50"
                                        borderColor="gray.200"
                                        _focus={{ borderColor: '#615b36', bg: 'white' }}
                                    />
                                </Box>

                                <Box>
                                    <Text fontSize="sm" color="gray.600" mb={2}>
                                        العمر
                                    </Text>
                                    <Input
                                        type="number"
                                        placeholder="مثال: 35"
                                        value={age}
                                        onChange={(e) => setAge(e.target.value)}
                                        min={1}
                                        max={120}
                                        bg="gray.50"
                                        borderColor="gray.200"
                                        _focus={{ borderColor: '#615b36', bg: 'white' }}
                                    />
                                </Box>

                                <Box>
                                    <Text fontSize="sm" color="gray.600" mb={2}>
                                        نوع الزيارة
                                    </Text>
                                    <Box
                                        as="select"
                                        value={visitType}
                                        // @ts-ignore
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setVisitType(e.target.value)}
                                        w="full"
                                        p={2}
                                        borderRadius="md"
                                        border="1px solid"
                                        borderColor="gray.200"
                                        bg="gray.50"
                                        _focus={{ borderColor: '#615b36', bg: 'white', outline: 'none' }}
                                        fontFamily="var(--font-tajawal)"
                                    >
                                        {VISIT_TYPES.map((opt) => (
                                            <option key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </option>
                                        ))}
                                    </Box>
                                </Box>

                                <Box>
                                    <Text fontSize="sm" color="gray.600" mb={2}>
                                        التاريخ والوقت
                                    </Text>
                                    <Flex gap={2}>
                                        <Input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            bg="gray.50"
                                            borderColor="gray.200"
                                            flex={1}
                                            _focus={{ borderColor: '#615b36', bg: 'white' }}
                                        />
                                        <Input
                                            type="time"
                                            value={time}
                                            onChange={(e) => setTime(e.target.value)}
                                            bg="gray.50"
                                            borderColor="gray.200"
                                            flex={1}
                                            _focus={{ borderColor: '#615b36', bg: 'white' }}
                                        />
                                    </Flex>
                                </Box>

                                <Flex gap={3} mt={4} w="full">
                                    <Button
                                        flex={1}
                                        onClick={handleSave}
                                        bg="#615b36"
                                        color="white"
                                        _hover={{ bg: '#4a452a' }}
                                        loading={saving}
                                        disabled={!name.trim() || !phone.trim() || !age || !date || !time}
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
