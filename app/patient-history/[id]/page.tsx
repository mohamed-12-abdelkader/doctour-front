'use client'

import {
    Box, Container, Flex, Heading, Text, Button, Badge, Spinner, Card, Stack, SimpleGrid,
    Dialog, Input, Textarea, IconButton, useDisclosure, Avatar
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowRight, Calendar, Phone, User, DollarSign, Clock, FileText, Plus, Trash2, Activity } from 'lucide-react'
import { BookingHistoryResponse, Booking, BookingStatus, VisitType, PatientReport, Medication, CreateReportData } from '@/types/booking'
import api from '@/lib/axios'
import { toaster } from '@/components/ui/toaster'

function getIsAdmin(): boolean {
    if (typeof document === 'undefined') return false
    return document.cookie.includes('admin-token=')
}

export default function PatientHistoryPage() {
    const router = useRouter()
    const params = useParams()
    const id = params.id as string
    const [data, setData] = useState<BookingHistoryResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    const [reportLoading, setReportLoading] = useState(false)
    const { open: isReportOpen, onOpen: onReportOpen, onClose: onReportClose } = useDisclosure()

    const [reportForm, setReportForm] = useState<CreateReportData>({
        medicalCondition: '',
        notes: '',
        medications: [{ medicationName: '', dosage: '', frequency: '', notes: '' }],
    })

    useEffect(() => {
        if (!id) return
        fetchPatientHistory()
    }, [id])

    useEffect(() => {
        setIsAdmin(getIsAdmin())
    }, [])

    const fetchPatientHistory = async () => {
        if (!id) return
        setIsLoading(true)
        try {
            const response = await api.get(`/bookings/${id}/history`)
            setData(response.data)
        } catch (error: any) {
            toaster.create({
                title: 'خطأ في جلب البيانات',
                description: error.response?.data?.message || 'حدث خطأ أثناء جلب تاريخ المريض',
                type: 'error',
                duration: 3000,
            })
            router.push('/today-bookings')
        } finally {
            setIsLoading(false)
        }
    }

    const openReportModal = (report?: PatientReport) => {
        if (report) {
            setReportForm({
                medicalCondition: report.medicalCondition || '',
                notes: report.notes || '',
                medications:
                    report.medications?.length > 0
                        ? report.medications.map((m) => ({
                              medicationName: m.medicationName || '',
                              dosage: m.dosage || '',
                              frequency: m.frequency || '',
                              notes: m.notes || '',
                          }))
                        : [{ medicationName: '', dosage: '', frequency: '', notes: '' }],
            })
        } else {
            setReportForm({
                medicalCondition: '',
                notes: '',
                medications: [{ medicationName: '', dosage: '', frequency: '', notes: '' }],
            })
        }
        onReportOpen()
    }

    const addMedication = () => {
        setReportForm((prev) => ({
            ...prev,
            medications: [...prev.medications, { medicationName: '', dosage: '', frequency: '', notes: '' }],
        }))
    }

    const removeMedication = (index: number) => {
        setReportForm((prev) => ({
            ...prev,
            medications: prev.medications.filter((_, i) => i !== index),
        }))
    }

    const updateMedication = (index: number, field: keyof Medication, value: string) => {
        setReportForm((prev) => ({
            ...prev,
            medications: prev.medications.map((m, i) => (i === index ? { ...m, [field]: value } : m)),
        }))
    }

    const handleSaveReport = async () => {
        if (!id) return
        if (!reportForm.medicalCondition.trim()) {
            toaster.create({ title: 'أدخل الحالة المرضية', type: 'warning', duration: 2000 })
            return
        }
        setReportLoading(true)
        try {
            const payload = {
                medicalCondition: reportForm.medicalCondition.trim(),
                notes: reportForm.notes?.trim() || undefined,
                medications: reportForm.medications
                    .filter((m) => m.medicationName.trim() || m.dosage.trim())
                    .map((m) => ({
                        medicationName: m.medicationName.trim(),
                        dosage: m.dosage.trim(),
                        frequency: m.frequency?.trim() || undefined,
                        notes: m.notes?.trim() || undefined,
                    })),
            }
            const hasReport = data?.currentBooking?.PatientReport?.id ?? data?.currentBooking?.report?.id
            if (hasReport) {
                await api.put(`/bookings/${id}/report`, payload)
                toaster.create({ title: 'تم تحديث التقرير بنجاح', type: 'success', duration: 2000 })
            } else {
                await api.post(`/bookings/${id}/report`, payload)
                toaster.create({ title: 'تم إنشاء التقرير بنجاح', type: 'success', duration: 2000 })
            }
            onReportClose()
            fetchPatientHistory()
        } catch (error: any) {
            toaster.create({
                title: 'خطأ في حفظ التقرير',
                description: error.response?.data?.message || 'غير مصرح (Admin فقط)',
                type: 'error',
                duration: 3000,
            })
        } finally {
            setReportLoading(false)
        }
    }

    const getStatusBadge = (status: BookingStatus) => {
        switch (status) {
            case 'confirmed': return <Badge colorScheme="green" variant="subtle" px={2} py={0.5} rounded="full">مؤكد</Badge>
            case 'cancelled': return <Badge colorScheme="red" variant="subtle" px={2} py={0.5} rounded="full">ملغي</Badge>
            case 'rejected': return <Badge colorScheme="orange" variant="subtle" px={2} py={0.5} rounded="full">مرفوض</Badge>
            default: return <Badge colorScheme="yellow" variant="subtle" px={2} py={0.5} rounded="full">قيد الانتظار</Badge>
        }
    }

    const getVisitTypeBadge = (visitType?: VisitType) => {
        if (!visitType) return <Badge>-</Badge>
        return (
            <Badge colorScheme={visitType === 'checkup' ? 'purple' : 'orange'} variant="subtle" px={2} py={0.5} rounded="full">
                {visitType === 'checkup' ? 'كشف' : 'إعادة'}
            </Badge>
        )
    }

    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const formatAmount = (amount: string | number) => {
        const num = typeof amount === 'string' ? parseFloat(amount) : amount
        return num.toFixed(2)
    }

    const ReportBlock = ({ report }: { report: PatientReport; bookingId?: number }) => (
        <Box p={4} bg="gray.50" borderRadius="lg" border="1px solid" borderColor="gray.200">
            <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={2} textTransform="uppercase">الحالة المرضية</Text>
            <Text fontSize="md" color="#2d3748" whiteSpace="pre-wrap">{report.medicalCondition}</Text>
            {report.notes && (
                <>
                    <Text fontSize="xs" fontWeight="bold" color="gray.500" mt={3} mb={1} textTransform="uppercase">ملاحظات</Text>
                    <Text fontSize="sm" color="#2d3748" whiteSpace="pre-wrap">{report.notes}</Text>
                </>
            )}
            {report.medications && report.medications.length > 0 && (
                <>
                    <Text fontSize="xs" fontWeight="bold" color="gray.500" mt={3} mb={2} textTransform="uppercase">الأدوية</Text>
                    <Stack gap={2}>
                        {report.medications.map((med, i) => (
                            <Box key={med.id ?? i} p={2} bg="white" borderRadius="md" border="1px solid" borderColor="gray.100">
                                <Text fontWeight="medium" color="#615b36" fontSize="sm">{med.medicationName}</Text>
                                <Text fontSize="xs" color="gray.600">الجرعة: {med.dosage}{(med.frequency ?? '') ? ` — ${med.frequency}` : ''}</Text>
                                {(med.notes ?? '') && <Text fontSize="xs" color="gray.500" mt={0.5}>{med.notes}</Text>}
                            </Box>
                        ))}
                    </Stack>
                </>
            )}
        </Box>
    )

    if (isLoading) {
        return (
            <Box minH="100vh" bg="#f8f9fa" display="flex" alignItems="center" justifyContent="center">
                <Spinner size="xl" color="#615b36" />
            </Box>
        )
    }

    if (!data) {
        return null
    }

    const { currentBooking, patientHistory } = data
    const currentReport = currentBooking.PatientReport ?? currentBooking.report

    return (
        <Box minH="100vh" bg="#f0f1f3" dir="rtl" fontFamily="var(--font-tajawal)">
            {/* Profile Header */}
            <Box bg="linear-gradient(135deg, #615b36 0%, #7a7350 50%, #8a8260 100%)" pt={8} pb={24} px={4}>
                <Container maxW="4xl">
                    <Button
                        variant="ghost"
                        color="white"
                        _hover={{ bg: 'whiteAlpha.200' }}
                        onClick={() => router.push('/today-bookings')}
                        size="sm"
                        mb={6}
                        gap={2}
                    >
                        <ArrowRight size={18} />
                        رجوع
                    </Button>
                    <Flex align="center" gap={6} flexWrap="wrap">
                        <Avatar.Root
                            size="2xl"
                            border="4px solid"
                            borderColor="whiteAlpha.400"
                            boxShadow="lg"
                            bg="whiteAlpha.300"
                        >
                            <Avatar.Fallback fontSize="3xl" color="white" fontWeight="bold">
                                {currentBooking.customerName?.charAt(0) || '?'}
                            </Avatar.Fallback>
                        </Avatar.Root>
                        <Box flex={1} minW={0}>
                            <Heading size="xl" color="white" mb={1} fontFamily="var(--font-tajawal)">
                                {currentBooking.customerName}
                            </Heading>
                            <Flex align="center" gap={2} color="whiteAlpha.900" fontSize="md">
                                <Phone size={18} />
                                <Text>{currentBooking.customerPhone}</Text>
                            </Flex>
                            <Flex gap={2} mt={3} flexWrap="wrap">
                                {getVisitTypeBadge(currentBooking.visitType)}
                                {getStatusBadge(currentBooking.status)}
                                <Badge colorScheme={currentBooking.bookingType === 'online' ? 'green' : 'blue'} variant="subtle" px={2} py={0.5} rounded="full">
                                    {currentBooking.bookingType === 'online' ? 'أونلاين' : 'في العيادة'}
                                </Badge>
                            </Flex>
                        </Box>
                    </Flex>
                </Container>
            </Box>

            {/* Content */}
            <Container maxW="4xl" mt={-12} pb={12} position="relative" zIndex={1}>
                {/* Stats Cards */}
                <SimpleGrid columns={{ base: 1, sm: 3 }} gap={4} mb={8}>
                    <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
                        <Card.Body p={5} display="flex" flexDirection="row" alignItems="center" gap={4}>
                            <Box p={3} bg="#fdfbf7" borderRadius="xl">
                                <Activity size={24} color="#615b36" />
                            </Box>
                            <Box>
                                <Text fontSize="xs" color="gray.500" fontWeight="medium">إجمالي الزيارات</Text>
                                <Text fontSize="2xl" fontWeight="bold" color="#615b36">{patientHistory.totalPastVisits + 1}</Text>
                            </Box>
                        </Card.Body>
                    </Card.Root>
                    <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
                        <Card.Body p={5} display="flex" flexDirection="row" alignItems="center" gap={4}>
                            <Box p={3} bg="green.50" borderRadius="xl">
                                <DollarSign size={24} color="#2d6a4f" />
                            </Box>
                            <Box>
                                <Text fontSize="xs" color="gray.500" fontWeight="medium">إجمالي المدفوع</Text>
                                <Text fontSize="2xl" fontWeight="bold" color="#2d6a4f">{formatAmount(patientHistory.totalAmountPaid)} EGP</Text>
                            </Box>
                        </Card.Body>
                    </Card.Root>
                    <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
                        <Card.Body p={5} display="flex" flexDirection="row" alignItems="center" gap={4}>
                            <Box p={3} bg="blue.50" borderRadius="xl">
                                <Calendar size={24} color="#2b6cb0" />
                            </Box>
                            <Box>
                                <Text fontSize="xs" color="gray.500" fontWeight="medium">آخر زيارة</Text>
                                {patientHistory.lastVisit ? (
                                    <Text fontSize="lg" fontWeight="bold" color="#2b6cb0">
                                        {new Date(patientHistory.lastVisit.date).toLocaleDateString('ar-EG')}
                                    </Text>
                                ) : (
                                    <Text fontSize="sm" color="gray.400">—</Text>
                                )}
                            </Box>
                        </Card.Body>
                    </Card.Root>
                </SimpleGrid>

                <SimpleGrid columns={{ base: 1, lg: 2 }} gap={8}>
                    {/* Left: Current Visit + Report */}
                    <Stack gap={6}>
                        <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
                            <Card.Header bg="white" borderBottom="1px solid" borderColor="gray.100" py={4}>
                                <Heading size="md" color="#615b36" display="flex" alignItems="center" gap={2}>
                                    <Clock size={20} />
                                    الزيارة الحالية
                                </Heading>
                            </Card.Header>
                            <Card.Body p={5}>
                                <Stack gap={4}>
                                    <Flex justify="space-between" align="center">
                                        <Text fontSize="sm" color="gray.500">موعد الحجز</Text>
                                        <Text fontWeight="bold">{formatDate(currentBooking.appointmentDate)}</Text>
                                    </Flex>
                                    <Flex justify="space-between" align="center">
                                        <Text fontSize="sm" color="gray.500">المبلغ</Text>
                                        <Text fontWeight="bold" color="#615b36">{formatAmount(currentBooking.amountPaid)} EGP</Text>
                                    </Flex>
                                    <Flex justify="space-between" align="center">
                                        <Text fontSize="sm" color="gray.500">نوع الزيارة</Text>
                                        {getVisitTypeBadge(currentBooking.visitType)}
                                    </Flex>
                                    <Flex justify="space-between" align="center">
                                        <Text fontSize="sm" color="gray.500">الحالة</Text>
                                        {getStatusBadge(currentBooking.status)}
                                    </Flex>
                                </Stack>
                            </Card.Body>
                        </Card.Root>

                        <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
                            <Card.Header bg="white" borderBottom="1px solid" borderColor="gray.100" py={4}>
                                <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
                                    <Heading size="md" color="#615b36" display="flex" alignItems="center" gap={2}>
                                        <FileText size={20} />
                                        تقرير الزيارة
                                    </Heading>
                                    {isAdmin && (
                                        <Button
                                            size="sm"
                                            bg="#615b36"
                                            color="white"
                                            _hover={{ bg: '#4a452a' }}
                                            // @ts-ignore
                                            onClick={() => openReportModal(currentReport)}
                                            // @ts-ignore
                                            leftIcon={<FileText size={16} />}
                                        >
                                            {currentReport ? 'تعديل التقرير' : 'إضافة تقرير'}
                                        </Button>
                                    )}
                                </Flex>
                            </Card.Header>
                            <Card.Body p={5}>
                                {currentReport ? (
                                    <ReportBlock report={currentReport} bookingId={currentBooking.id} />
                                ) : (
                                    <Box py={8} textAlign="center" bg="gray.50" borderRadius="lg">
                                        <FileText size={40} color="#cbd5e0" style={{ margin: '0 auto 8px' }} />
                                        <Text color="gray.500" fontSize="sm">لا يوجد تقرير لهذه الزيارة</Text>
                                        {isAdmin && (
                                            <Button size="sm" mt={3} variant="outline" colorScheme="blue" onClick={() => openReportModal()}>
                                                إضافة تقرير
                                            </Button>
                                        )}
                                    </Box>
                                )}
                            </Card.Body>
                        </Card.Root>
                    </Stack>

                    {/* Right: Visit History Timeline */}
                    <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden" height="fit-content">
                        <Card.Header bg="white" borderBottom="1px solid" borderColor="gray.100" py={4}>
                            <Heading size="md" color="#615b36">سجل الزيارات</Heading>
                        </Card.Header>
                        <Card.Body p={5}>
                            {patientHistory.pastBookings.length === 0 ? (
                                <Box py={10} textAlign="center">
                                    <Activity size={40} color="#e2e8f0" style={{ margin: '0 auto 8px' }} />
                                    <Text color="gray.500" fontSize="sm">لا توجد زيارات سابقة</Text>
                                </Box>
                            ) : (
                                <Stack gap={0} position="relative">
                                    {patientHistory.pastBookings.map((booking, index) => (
                                        <Box key={booking.id} position="relative">
                                            {index > 0 && (
                                                <Box
                                                    position="absolute"
                                                    right="11px"
                                                    top="-8px"
                                                    bottom="-8px"
                                                    w="2px"
                                                    bg="gray.200"
                                                />
                                            )}
                                            <Flex gap={4} py={4} align="start">
                                                <Box
                                                    w={6}
                                                    h={6}
                                                    borderRadius="full"
                                                    bg="#615b36"
                                                    flexShrink={0}
                                                    mt={0.5}
                                                    position="relative"
                                                    zIndex={1}
                                                />
                                                <Box flex={1} minW={0}>
                                                    <Text fontWeight="bold" color="#2d3748" fontSize="sm">
                                                        {formatDate(booking.appointmentDate)}
                                                    </Text>
                                                    <Flex gap={2} mt={2} flexWrap="wrap">
                                                        {getVisitTypeBadge(booking.visitType)}
                                                        {getStatusBadge(booking.status)}
                                                        <Badge colorScheme={booking.bookingType === 'online' ? 'green' : 'blue'} variant="subtle" fontSize="xs">
                                                            {booking.bookingType === 'online' ? 'أونلاين' : 'عيادة'}
                                                        </Badge>
                                                    </Flex>
                                                    <Text fontSize="sm" color="#615b36" fontWeight="bold" mt={2}>
                                                        {formatAmount(booking.amountPaid)} EGP
                                                    </Text>
                                                    {(booking.PatientReport ?? booking.report) && (
                                                        <Box mt={3}>
                                                            <ReportBlock report={booking.PatientReport ?? booking.report!} bookingId={booking.id} />
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Flex>
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                        </Card.Body>
                    </Card.Root>
                </SimpleGrid>
            </Container>

            {/* Report Create/Edit Modal */}
            <Dialog.Root open={isReportOpen} onOpenChange={(e) => !e.open && onReportClose()} size="xl" scrollBehavior="inside">
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content dir="rtl" fontFamily="var(--font-tajawal)">
                        <Dialog.CloseTrigger />
                        <Dialog.Header fontSize="lg" fontWeight="bold">تقرير المريض</Dialog.Header>
                        <Dialog.Body>
                            <Stack gap={4}>
                                <Box>
                                    <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>الحالة المرضية / التشخيص *</Text>
                                    <Textarea
                                        value={reportForm.medicalCondition}
                                        onChange={(e) => setReportForm((p) => ({ ...p, medicalCondition: e.target.value }))}
                                        placeholder="وصف الحالة المرضية والتشخيص"
                                        rows={4}
                                        resize="vertical"
                                    />
                                </Box>
                                <Box>
                                    <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>ملاحظات</Text>
                                    <Textarea
                                        value={reportForm.notes || ''}
                                        onChange={(e) => setReportForm((p) => ({ ...p, notes: e.target.value }))}
                                        placeholder="ملاحظات إضافية"
                                        rows={2}
                                        resize="vertical"
                                    />
                                </Box>
                                <Box>
                                    <Flex justify="space-between" align="center" mb={2}>
                                        <Text fontSize="sm" fontWeight="medium" color="gray.600">الأدوية</Text>
                                        {/* @ts-ignore */}
                                        <Button size="sm" variant="outline" colorScheme="blue" onClick={addMedication} leftIcon={<Plus size={14} />}>
                                            إضافة دواء
                                        </Button>
                                    </Flex>
                                    <Stack gap={3}>
                                        {reportForm.medications.map((med, index) => (
                                            <Box key={index} p={3} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                                                <Flex gap={2} mb={2} flexWrap="wrap">
                                                    <Input
                                                        placeholder="اسم الدواء"
                                                        value={med.medicationName}
                                                        onChange={(e) => updateMedication(index, 'medicationName', e.target.value)}
                                                        size="sm"
                                                        flex={1}
                                                        minW="120px"
                                                    />
                                                    <Input
                                                        placeholder="الجرعة"
                                                        value={med.dosage}
                                                        onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                                                        size="sm"
                                                        flex={1}
                                                        minW="100px"
                                                    />
                                                    <Input
                                                        placeholder="التكرار (مثال: مرتين يومياً)"
                                                        value={med.frequency || ''}
                                                        onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                                                        size="sm"
                                                        flex={1}
                                                        minW="120px"
                                                    />
                                                    <IconButton
                                                        aria-label="حذف"
                                                        size="sm"
                                                        variant="ghost"
                                                        colorScheme="red"
                                                        onClick={() => removeMedication(index)}
                                                        disabled={reportForm.medications.length === 1}
                                                    >
                                                        <Trash2 size={16} />
                                                    </IconButton>
                                                </Flex>
                                                <Input
                                                    placeholder="ملاحظة على الدواء"
                                                    value={med.notes || ''}
                                                    onChange={(e) => updateMedication(index, 'notes', e.target.value)}
                                                    size="sm"
                                                />
                                            </Box>
                                        ))}
                                    </Stack>
                                </Box>
                            </Stack>
                        </Dialog.Body>
                        <Dialog.Footer gap={3}>
                            <Button variant="ghost" onClick={onReportClose}>إلغاء</Button>
                            <Button bg="#615b36" color="white" _hover={{ bg: '#4a452a' }} onClick={handleSaveReport} loading={reportLoading} disabled={!reportForm.medicalCondition.trim()}>
                                حفظ التقرير
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Dialog.Root>
        </Box>
    )
}
