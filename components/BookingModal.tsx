'use client'

import {
    Dialog, Button, Input, Text, VStack, Flex, Box, Portal
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { Booking, VisitType } from '@/types/booking'

interface BookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (booking: any) => void;
    initialData?: Booking | null;
}

export default function BookingModal({ isOpen, onClose, onSave, initialData }: BookingModalProps) {
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [time, setTime] = useState('')
    const [date, setDate] = useState('')
    const [amountPaid, setAmountPaid] = useState('')
    const [visitType, setVisitType] = useState<VisitType>('checkup')

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.customerName || '')
                setPhone(initialData.customerPhone || '')
                setVisitType(initialData.visitType || 'checkup')

                const amount = typeof initialData.amountPaid === 'string'
                    ? initialData.amountPaid
                    : initialData.amountPaid?.toString() || '0'
                setAmountPaid(amount)

                const timeString = initialData.appointmentDate || '';

                if (timeString && timeString.includes('T')) {
                    const d = new Date(timeString);
                    setDate(d.toISOString().split('T')[0]);
                    setTime(d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
                } else {
                    setDate(new Date().toISOString().split('T')[0]);
                    setTime('');
                }
            } else {
                // Reset for new entry
                setName('')
                setPhone('')
                setDate(new Date().toISOString().split('T')[0])
                setTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }))
                setAmountPaid('0')
                setVisitType('checkup')
            }
        }
    }, [isOpen, initialData])

    const handleSave = () => {
        if (!name || !date || !time || !phone) {
            alert('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        // Combine date and time to ISO string
        const bookingDateTime = new Date(`${date}T${time}:00.000Z`).toISOString();

        const bookingData = {
            customerName: name,
            customerPhone: phone,
            appointmentDate: bookingDateTime,
            amountPaid: parseFloat(amountPaid) || 0,
            visitType: visitType
        };

        onSave(bookingData);
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
                        width={{ base: "90%", md: "500px" }}
                        maxH="90vh"
                        outline="none"
                    >
                        <Box bg="#fdfbf7" px={6} py={4} borderBottom="1px solid" borderColor="#eee" display="flex" justifyContent="space-between" alignItems="center">
                            <Text fontSize="xl" color="#615b36" fontWeight="bold">
                                {initialData ? 'تعديل الحجز' : 'إضافة حجز جديد'}
                            </Text>
                            <Dialog.CloseTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    color="gray.500"
                                    _hover={{ bg: "blackAlpha.50", color: "red.500" }}
                                    rounded="full"
                                    w={8}
                                    h={8}
                                    minW={0}
                                    p={0}
                                    onClick={onClose}
                                >
                                    ✕
                                </Button>
                            </Dialog.CloseTrigger>
                        </Box>

                        <Box p={6}>
                            <VStack gap={4} align="stretch">
                                <Box>
                                    <Text fontSize="sm" color="gray.600" mb={2}>اسم العميل</Text>
                                    <Input
                                        placeholder="الاسم ثلاثي"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        bg="gray.50"
                                        borderColor="gray.200"
                                        _focus={{ borderColor: "#615b36", bg: "white" }}
                                    />
                                </Box>

                                <Box>
                                    <Text fontSize="sm" color="gray.600" mb={2}>رقم الهاتف</Text>
                                    <Input
                                        placeholder="01xxxxxxxxx"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        textAlign="right"
                                        bg="gray.50"
                                        borderColor="gray.200"
                                        _focus={{ borderColor: "#615b36", bg: "white" }}
                                    />
                                </Box>

                                <Box>
                                    <Text fontSize="sm" color="gray.600" mb={2}>وقت الحجز</Text>
                                    <Flex gap={2}>
                                        <Input
                                            type="date"
                                            value={date}
                                            onChange={(e) => setDate(e.target.value)}
                                            bg="gray.50"
                                            borderColor="gray.200"
                                            flex={1}
                                            _focus={{ borderColor: "#615b36", bg: "white" }}
                                        />
                                        <Input
                                            type="time"
                                            value={time}
                                            onChange={(e) => setTime(e.target.value)}
                                            bg="gray.50"
                                            borderColor="gray.200"
                                            flex={1}
                                            _focus={{ borderColor: "#615b36", bg: "white" }}
                                        />
                                    </Flex>
                                </Box>

                                <Box>
                                    <Text fontSize="sm" color="gray.600" mb={2}>المبلغ المدفوع (EGP)</Text>
                                    <Input
                                        type="number"
                                        placeholder="0.00"
                                        value={amountPaid}
                                        onChange={(e) => setAmountPaid(e.target.value)}
                                        bg="gray.50"
                                        borderColor="gray.200"
                                        _focus={{ borderColor: "#615b36", bg: "white" }}
                                        step="0.01"
                                        min="0"
                                    />
                                </Box>

                                <Box>
                                    <Text fontSize="sm" color="gray.600" mb={2}>نوع الزيارة</Text>
                                    <select
                                        value={visitType}
                                        onChange={(e) => setVisitType(e.target.value as VisitType)}
                                        style={{
                                            width: '100%',
                                            padding: '0.5rem',
                                            borderRadius: '0.375rem',
                                            border: '1px solid',
                                            borderColor: '#E2E8F0',
                                            backgroundColor: '#F7FAFC',
                                            fontSize: '1rem',
                                            fontFamily: 'var(--font-tajawal)',
                                            outline: 'none',
                                        }}
                                        onFocus={(e) => {
                                            e.target.style.borderColor = '#615b36';
                                            e.target.style.backgroundColor = 'white';
                                        }}
                                        onBlur={(e) => {
                                            e.target.style.borderColor = '#E2E8F0';
                                            e.target.style.backgroundColor = '#F7FAFC';
                                        }}
                                    >
                                        <option value="checkup">كشف</option>
                                        <option value="followup">إعادة</option>
                                    </select>
                                </Box>

                                <Flex gap={3} mt={4}>
                                    <Button
                                        flex={1}
                                        onClick={handleSave}
                                        bg="#615b36"
                                        color="white"
                                        _hover={{ bg: "#4a452a" }}
                                    >
                                        حفظ
                                    </Button>
                                    <Button
                                        flex={1}
                                        onClick={onClose}
                                        variant="outline"
                                        colorPalette="gray"
                                    >
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
