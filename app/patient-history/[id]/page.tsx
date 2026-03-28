'use client'

import {
    Box, Container, Flex, Heading, Text, Button, Badge, Spinner, Card, Stack, SimpleGrid,
    Dialog, Input, Textarea, IconButton, useDisclosure, Avatar, Separator,
} from '@chakra-ui/react'
import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
    ArrowRight, Calendar, Phone, DollarSign, Clock, FileText,
    Plus, Trash2, Activity, ImagePlus, X, ExternalLink, Edit2, AlertTriangle, Camera, Upload,
} from 'lucide-react'
import {
    BookingHistoryResponse, Booking, BookingStatus, VisitType,
    PatientReport, Medication, CreateReportData,
} from '@/types/booking'
import api from '@/lib/axios'
import { toaster } from '@/components/ui/toaster'
import { isSuperAdminUser } from '@/lib/admin-nav'

function getIsAdmin(): boolean {
    if (typeof document === 'undefined') return false
    return document.cookie.includes('admin-token=')
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function getReports(booking: Booking): PatientReport[] {
    if (Array.isArray(booking.reports) && booking.reports.length >= 0) return booking.reports
    const single = booking.PatientReport ?? booking.report
    return single ? [single] : []
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PatientHistoryPage() {
    const router = useRouter()
    const { id } = useParams() as { id: string }

    const [data, setData] = useState<BookingHistoryResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)
    /** زر «تقرير جديد»: يظهر فقط لـ role=admin و permissions=[] (سوبر أدمن) */
    const [canCreateNewReport, setCanCreateNewReport] = useState(false)

    // ── Report modal ──────────────────────────────────────────────────────────
    const { open: isReportOpen, onOpen: onReportOpen, onClose: onReportClose } = useDisclosure()
    const [reportLoading, setReportLoading] = useState(false)
    const [editingReportId, setEditingReportId] = useState<number | null>(null)

    const [reportForm, setReportForm] = useState<CreateReportData>({
        medicalCondition: '',
        notes: '',
        medications: [{ medicationName: '', dosage: '', frequency: '', notes: '' }],
    })
    const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null)
    const [prescriptionPreview, setPrescriptionPreview] = useState<string | null>(null)
    const [existingPrescriptionUrl, setExistingPrescriptionUrl] = useState<string | null>(null)
    const prescriptionGalleryInputRef = useRef<HTMLInputElement>(null)
    const prescriptionCameraInputRef = useRef<HTMLInputElement>(null)

    // ── Delete confirm modal ──────────────────────────────────────────────────
    const { open: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure()
    const [deleteTarget, setDeleteTarget] = useState<{ reportId: number; type: 'report' | 'prescription' } | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    // ── Init ──────────────────────────────────────────────────────────────────
    useEffect(() => { if (id) fetchPatientHistory() }, [id])
    useEffect(() => {
        setIsAdmin(getIsAdmin())
        setCanCreateNewReport(isSuperAdminUser())
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
                type: 'error', duration: 3000,
            })
            router.push('/today-bookings')
        } finally {
            setIsLoading(false)
        }
    }

    // ── Report modal helpers ──────────────────────────────────────────────────
    const openNewReportModal = () => {
        setEditingReportId(null)
        setReportForm({ medicalCondition: '', notes: '', medications: [{ medicationName: '', dosage: '', frequency: '', notes: '' }] })
        setPrescriptionFile(null)
        setPrescriptionPreview(null)
        setExistingPrescriptionUrl(null)
        onReportOpen()
    }

    const openEditReportModal = (report: PatientReport) => {
        setEditingReportId(report.id ?? null)
        setReportForm({
            medicalCondition: report.medicalCondition || '',
            notes: report.notes || '',
            medications: report.medications?.length > 0
                ? report.medications.map(m => ({ medicationName: m.medicationName || '', dosage: m.dosage || '', frequency: m.frequency || '', notes: m.notes || '' }))
                : [{ medicationName: '', dosage: '', frequency: '', notes: '' }],
        })
        setExistingPrescriptionUrl(report.prescriptionImageUrl ?? null)
        setPrescriptionFile(null)
        setPrescriptionPreview(null)
        onReportOpen()
    }

    const addMedication = () =>
        setReportForm(p => ({ ...p, medications: [...p.medications, { medicationName: '', dosage: '', frequency: '', notes: '' }] }))

    const removeMedication = (i: number) =>
        setReportForm(p => ({ ...p, medications: p.medications.filter((_, idx) => idx !== i) }))

    const updateMedication = (i: number, field: keyof Medication, value: string) =>
        setReportForm(p => ({ ...p, medications: p.medications.map((m, idx) => idx === i ? { ...m, [field]: value } : m) }))

    const handleFileChange = (file: File | null) => {
        if (!file) { setPrescriptionFile(null); setPrescriptionPreview(null); return }
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
        if (!allowed.includes(file.type)) {
            toaster.create({ title: 'نوع الملف غير مدعوم', description: 'يُسمح فقط بـ JPEG / PNG / WEBP / PDF', type: 'error', duration: 3000 })
            return
        }
        if (file.size > 5 * 1024 * 1024) {
            toaster.create({ title: 'حجم الملف كبير', description: 'الحد الأقصى 5 MB', type: 'error', duration: 3000 })
            return
        }
        setPrescriptionFile(file)
        if (file.type.startsWith('image/')) {
            const reader = new FileReader()
            reader.onload = e => setPrescriptionPreview(e.target?.result as string)
            reader.readAsDataURL(file)
        } else {
            setPrescriptionPreview('pdf')
        }
    }

    const onPrescriptionInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0] ?? null
        handleFileChange(f)
        e.target.value = ''
    }

    const onDropPrescription = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        const f = e.dataTransfer.files?.[0]
        if (f) handleFileChange(f)
    }

    // ── Save report ───────────────────────────────────────────────────────────
    const handleSaveReport = async () => {
        if (!id) return
        setReportLoading(true)
        try {
            const validMeds = reportForm.medications
                .filter(m => m.medicationName.trim() || m.dosage.trim())
                .map(m => ({
                    medicationName: m.medicationName.trim(),
                    dosage: m.dosage.trim(),
                    frequency: m.frequency?.trim() || undefined,
                    notes: m.notes?.trim() || undefined,
                }))

            const formData = new FormData()
            if (reportForm.medicalCondition.trim()) formData.append('medicalCondition', reportForm.medicalCondition.trim())
            if (reportForm.notes?.trim()) formData.append('notes', reportForm.notes.trim())
            formData.append('medications', JSON.stringify(validMeds))
            if (prescriptionFile) formData.append('prescription', prescriptionFile)

            if (editingReportId) {
                await api.put(`/bookings/${id}/reports/${editingReportId}`, formData)
                toaster.create({ title: 'تم تحديث التقرير بنجاح', type: 'success', duration: 2000 })
            } else {
                await api.post(`/bookings/${id}/reports`, formData)
                toaster.create({ title: 'تم إنشاء التقرير بنجاح', type: 'success', duration: 2000 })
            }
            onReportClose()
            fetchPatientHistory()
        } catch (error: any) {
            toaster.create({
                title: 'خطأ في حفظ التقرير',
                description: error.response?.data?.message || 'غير مصرح (Admin فقط)',
                type: 'error', duration: 3000,
            })
        } finally {
            setReportLoading(false)
        }
    }

    // ── Delete actions ────────────────────────────────────────────────────────
    const confirmDelete = (reportId: number, type: 'report' | 'prescription') => {
        setDeleteTarget({ reportId, type })
        onDeleteOpen()
    }

    const handleDelete = async () => {
        if (!deleteTarget || !id) return
        setDeleteLoading(true)
        const { reportId, type } = deleteTarget
        try {
            if (type === 'report') {
                await api.delete(`/bookings/${id}/reports/${reportId}`)
                toaster.create({ title: 'تم حذف التقرير', type: 'success', duration: 2000 })
            } else {
                await api.delete(`/bookings/${id}/reports/${reportId}/prescription`)
                toaster.create({ title: 'تم حذف صورة الروشتة', type: 'success', duration: 2000 })
            }
            onDeleteClose()
            fetchPatientHistory()
        } catch (error: any) {
            toaster.create({
                title: 'خطأ في الحذف',
                description: error.response?.data?.message || 'حدث خطأ',
                type: 'error', duration: 3000,
            })
        } finally {
            setDeleteLoading(false)
        }
    }

    // ── Format helpers ────────────────────────────────────────────────────────
    const getStatusBadge = (status: BookingStatus) => {
        const map: Record<string, [string, string]> = {
            confirmed: ['green', 'مؤكد'], cancelled: ['red', 'ملغي'],
            rejected: ['orange', 'مرفوض'], pending: ['yellow', 'قيد الانتظار'],
        }
        const [color, label] = map[status] ?? ['gray', status]
        return <Badge colorPalette={color} variant="subtle" px={2} py={0.5} rounded="full">{label}</Badge>
    }

    const getVisitTypeBadge = (visitType?: VisitType) => {
        if (!visitType) return <Badge>-</Badge>
        return (
            <Badge colorPalette={visitType === 'checkup' ? 'purple' : 'orange'} variant="subtle" px={2} py={0.5} rounded="full">
                {visitType === 'checkup' ? 'كشف' : 'إعادة'}
            </Badge>
        )
    }

    const formatDate = (s: string) =>
        new Date(s).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })

    const formatAmount = (a: string | number) => (typeof a === 'string' ? parseFloat(a) : a).toFixed(2)

    // ─── ReportBlock ──────────────────────────────────────────────────────────
    const ReportBlock = ({ report, bookingId }: { report: PatientReport; bookingId?: number }) => (
        <Box p={4} bg="gray.50" borderRadius="lg" border="1px solid" borderColor="gray.200" position="relative">
            {/* Admin actions */}
            {isAdmin && report.id && (
                <Flex position="absolute" top={3} left={3} gap={1}>
                    <IconButton
                        aria-label="تعديل" size="xs" variant="ghost" colorPalette="blue"
                        onClick={() => openEditReportModal(report)}
                    ><Edit2 size={14} /></IconButton>
                    <IconButton
                        aria-label="حذف التقرير" size="xs" variant="ghost" colorPalette="red"
                        onClick={() => confirmDelete(report.id!, 'report')}
                    ><Trash2 size={14} /></IconButton>
                </Flex>
            )}

            {/* Medical condition */}
            <Text fontSize="xs" fontWeight="bold" color="gray.500" mb={1} textTransform="uppercase">الحالة المرضية</Text>
            <Text fontSize="md" color="#2d3748" whiteSpace="pre-wrap" mb={2}>{report.medicalCondition}</Text>

            {/* Notes */}
            {report.notes && (
                <>
                    <Text fontSize="xs" fontWeight="bold" color="gray.500" mt={3} mb={1} textTransform="uppercase">ملاحظات</Text>
                    <Text fontSize="sm" color="#2d3748" whiteSpace="pre-wrap">{report.notes}</Text>
                </>
            )}

            {/* Medications */}
            {report.medications && report.medications.length > 0 && (
                <>
                    <Text fontSize="xs" fontWeight="bold" color="gray.500" mt={3} mb={2} textTransform="uppercase">الأدوية</Text>
                    <Stack gap={2}>
                        {report.medications.map((med, i) => (
                            <Box key={med.id ?? i} p={2} bg="white" borderRadius="md" border="1px solid" borderColor="gray.100">
                                <Text fontWeight="medium" color="#615b36" fontSize="sm">{med.medicationName}</Text>
                                <Text fontSize="xs" color="gray.600">الجرعة: {med.dosage}{med.frequency ? ` — ${med.frequency}` : ''}</Text>
                                {med.notes && <Text fontSize="xs" color="gray.500" mt={0.5}>{med.notes}</Text>}
                            </Box>
                        ))}
                    </Stack>
                </>
            )}

            {/* Prescription image */}
            {report.prescriptionImageUrl ? (
                <Box mt={4}>
                    <Flex align="center" justify="space-between" mb={2}>
                        <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">صورة الروشتة</Text>
                        {isAdmin && report.id && (
                            <Button
                                size="2xs" variant="ghost" colorPalette="red"
                                onClick={() => confirmDelete(report.id!, 'prescription')}
                            >
                                <Trash2 size={12} />
                                حذف الصورة
                            </Button>
                        )}
                    </Flex>
                    <Box
                        as="a" href={report.prescriptionImageUrl} target="_blank" rel="noopener noreferrer"
                        display="block" borderRadius="lg" overflow="hidden"
                        border="2px solid" borderColor="#c9b97a"
                        maxW="260px" position="relative" cursor="pointer"
                        _hover={{ opacity: 0.9 }}
                    >
                        <Box
                            as="img" src={report.prescriptionImageUrl} alt="صورة الروشتة"
                            style={{ width: '100%', display: 'block', borderRadius: '8px' }}
                        />
                        <Flex
                            position="absolute" bottom={0} left={0} right={0}
                            bg="blackAlpha.600" py={1.5} px={3}
                            align="center" justify="center" gap={2}
                        >
                            <ExternalLink size={12} color="white" />
                            <Text fontSize="xs" color="white" fontWeight="bold">فتح الصورة</Text>
                        </Flex>
                    </Box>
                </Box>
            ) : (
                isAdmin && report.id && (
                    <Button
                        mt={3} size="xs" variant="outline" colorPalette="gray"
                        onClick={() => openEditReportModal(report)}
                    >
                        <ImagePlus size={12} />
                        إضافة صورة روشتة
                    </Button>
                )
            )}

            {/* Timestamp */}
            {report.createdAt && (
                <Text fontSize="10px" color="gray.400" mt={3}>
                    أُنشئ: {new Date(report.createdAt).toLocaleString('ar-EG')}
                    {report.updatedAt !== report.createdAt && ` — عُدِّل: ${new Date(report.updatedAt!).toLocaleString('ar-EG')}`}
                </Text>
            )}
        </Box>
    )

    // ── Guards ────────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <Box minH="100vh" bg="#f8f9fa" display="flex" alignItems="center" justifyContent="center">
                <Spinner size="xl" color="#615b36" />
            </Box>
        )
    }
    if (!data) return null

    const { currentBooking, patientHistory } = data
    const currentReports = getReports(currentBooking)

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <Box minH="100vh" bg="#f0f1f3" dir="rtl">

            {/* Profile Header */}
            <Box bg="linear-gradient(135deg, #615b36 0%, #7a7350 50%, #8a8260 100%)" pt={8} pb={24} px={4}>
                <Container maxW="4xl">
                    <Button
                        variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }}
                        onClick={() => router.push('/today-bookings')} size="sm" mb={6} gap={2}
                    >
                        <ArrowRight size={18} /> رجوع
                    </Button>
                    <Flex align="center" gap={6} flexWrap="wrap">
                        <Avatar.Root size="2xl" border="4px solid" borderColor="whiteAlpha.400" boxShadow="lg" bg="whiteAlpha.300">
                            <Avatar.Fallback fontSize="3xl" color="white" fontWeight="bold">
                                {currentBooking.customerName?.charAt(0) || '?'}
                            </Avatar.Fallback>
                        </Avatar.Root>
                        <Box flex={1} minW={0}>
                            <Heading size="xl" color="white" mb={1}>{currentBooking.customerName}</Heading>
                            <Flex align="center" gap={2} color="whiteAlpha.900" fontSize="md">
                                <Phone size={18} />
                                <Text>{currentBooking.customerPhone}</Text>
                            </Flex>
                            <Flex gap={2} mt={3} flexWrap="wrap">
                                {getVisitTypeBadge(currentBooking.visitType)}
                                {getStatusBadge(currentBooking.status)}
                                <Badge colorPalette={currentBooking.bookingType === 'online' ? 'green' : 'blue'} variant="subtle" px={2} py={0.5} rounded="full">
                                    {currentBooking.bookingType === 'online' ? 'أونلاين' : 'في العيادة'}
                                </Badge>
                            </Flex>
                        </Box>
                    </Flex>
                </Container>
            </Box>

            {/* Content */}
            <Container maxW="4xl" mt={-12} pb={12} position="relative" zIndex={1}>

                {/* Stats */}
                <SimpleGrid columns={{ base: 1, sm: 3 }} gap={4} mb={8}>
                    <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
                        <Card.Body p={5} display="flex" flexDirection="row" alignItems="center" gap={4}>
                            <Box p={3} bg="#fdfbf7" borderRadius="xl"><Activity size={24} color="#615b36" /></Box>
                            <Box>
                                <Text fontSize="xs" color="gray.500" fontWeight="medium">إجمالي الزيارات</Text>
                                <Text fontSize="2xl" fontWeight="bold" color="#615b36">{patientHistory.totalPastVisits + 1}</Text>
                            </Box>
                        </Card.Body>
                    </Card.Root>
                    <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
                        <Card.Body p={5} display="flex" flexDirection="row" alignItems="center" gap={4}>
                            <Box p={3} bg="green.50" borderRadius="xl"><DollarSign size={24} color="#2d6a4f" /></Box>
                            <Box>
                                <Text fontSize="xs" color="gray.500" fontWeight="medium">إجمالي المدفوع</Text>
                                <Text fontSize="2xl" fontWeight="bold" color="#2d6a4f">{formatAmount(patientHistory.totalAmountPaid)} EGP</Text>
                            </Box>
                        </Card.Body>
                    </Card.Root>
                    <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
                        <Card.Body p={5} display="flex" flexDirection="row" alignItems="center" gap={4}>
                            <Box p={3} bg="blue.50" borderRadius="xl"><Calendar size={24} color="#2b6cb0" /></Box>
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

                    {/* Left: Current Visit + Reports */}
                    <Stack gap={6}>

                        {/* Current visit info */}
                        <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
                            <Card.Header bg="white" borderBottom="1px solid" borderColor="gray.100" py={4}>
                                <Heading size="md" color="#615b36" display="flex" alignItems="center" gap={2}>
                                    <Clock size={20} /> الزيارة الحالية
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

                        {/* Reports section */}
                        <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
                            <Card.Header bg="white" borderBottom="1px solid" borderColor="gray.100" py={4}>
                                <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
                                    <Heading size="md" color="#615b36" display="flex" alignItems="center" gap={2}>
                                        <FileText size={20} />
                                        تقارير الزيارة
                                        {currentReports.length > 0 && (
                                            <Badge colorPalette="gray" variant="subtle" borderRadius="full" px={2}>{currentReports.length}</Badge>
                                        )}
                                    </Heading>
                                    {canCreateNewReport && (
                                        <Button
                                            size="sm" bg="#615b36" color="white" _hover={{ bg: '#4a452a' }}
                                            onClick={openNewReportModal}
                                        >
                                            <Plus size={16} />
                                            تقرير جديد
                                        </Button>
                                    )}
                                </Flex>
                            </Card.Header>
                            <Card.Body p={5}>
                                {currentReports.length > 0 ? (
                                    <Stack gap={4}>
                                        {currentReports.map((report, i) => (
                                            <Box key={report.id ?? i}>
                                                {i > 0 && <Separator mb={4} />}
                                                <Flex align="center" mb={2}>
                                                    <Badge colorPalette="gray" variant="outline" borderRadius="full" fontSize="10px" px={2}>
                                                        تقرير #{i + 1}
                                                    </Badge>
                                                </Flex>
                                                <ReportBlock report={report} bookingId={currentBooking.id} />
                                            </Box>
                                        ))}
                                    </Stack>
                                ) : (
                                    <Box py={8} textAlign="center" bg="gray.50" borderRadius="lg">
                                        <FileText size={40} color="#cbd5e0" style={{ margin: '0 auto 8px' }} />
                                        <Text color="gray.500" fontSize="sm">لا توجد تقارير لهذه الزيارة</Text>
                                        {canCreateNewReport && (
                                            <Button size="sm" mt={3} variant="outline" colorPalette="blue" onClick={openNewReportModal}>
                                                <Plus size={14} /> إضافة تقرير
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
                                    {patientHistory.pastBookings.map((booking, index) => {
                                        const pastReports = getReports(booking)
                                        return (
                                            <Box key={booking.id} position="relative">
                                                {index > 0 && (
                                                    <Box position="absolute" right="11px" top="-8px" bottom="-8px" w="2px" bg="gray.200" />
                                                )}
                                                <Flex gap={4} py={4} align="start">
                                                    <Box w={6} h={6} borderRadius="full" bg="#615b36" flexShrink={0} mt={0.5} position="relative" zIndex={1} />
                                                    <Box flex={1} minW={0}>
                                                        <Text fontWeight="bold" color="#2d3748" fontSize="sm">{formatDate(booking.appointmentDate)}</Text>
                                                        <Flex gap={2} mt={2} flexWrap="wrap">
                                                            {getVisitTypeBadge(booking.visitType)}
                                                            {getStatusBadge(booking.status)}
                                                            <Badge colorPalette={booking.bookingType === 'online' ? 'green' : 'blue'} variant="subtle" fontSize="xs">
                                                                {booking.bookingType === 'online' ? 'أونلاين' : 'عيادة'}
                                                            </Badge>
                                                        </Flex>
                                                        <Text fontSize="sm" color="#615b36" fontWeight="bold" mt={2}>
                                                            {formatAmount(booking.amountPaid)} EGP
                                                        </Text>
                                                        {pastReports.length > 0 && (
                                                            <Stack mt={3} gap={3}>
                                                                {pastReports.map((r, ri) => (
                                                                    <ReportBlock key={r.id ?? ri} report={r} bookingId={booking.id} />
                                                                ))}
                                                            </Stack>
                                                        )}
                                                    </Box>
                                                </Flex>
                                            </Box>
                                        )
                                    })}
                                </Stack>
                            )}
                        </Card.Body>
                    </Card.Root>
                </SimpleGrid>
            </Container>

            {/* ── Report Create/Edit Modal ── */}
            <Dialog.Root open={isReportOpen} onOpenChange={e => !e.open && onReportClose()} size="xl" scrollBehavior="inside">
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content dir="rtl">
                        <Dialog.CloseTrigger />
                        <Dialog.Header fontSize="lg" fontWeight="bold">
                            {editingReportId ? 'تعديل التقرير' : 'تقرير جديد'}
                        </Dialog.Header>
                        <Dialog.Body>
                            <Stack gap={5}>

                                {/* Medical condition */}
                                <Box>
                                    <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>الحالة المرضية / التشخيص</Text>
                                    <Textarea
                                        value={reportForm.medicalCondition}
                                        onChange={e => setReportForm(p => ({ ...p, medicalCondition: e.target.value }))}
                                        placeholder="وصف الحالة المرضية والتشخيص"
                                        rows={3}
                                    />
                                </Box>

                                {/* Notes */}
                                <Box>
                                    <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={2}>ملاحظات</Text>
                                    <Textarea
                                        value={reportForm.notes || ''}
                                        onChange={e => setReportForm(p => ({ ...p, notes: e.target.value }))}
                                        placeholder="ملاحظات إضافية"
                                        rows={2}
                                    />
                                </Box>

                                {/* Medications */}
                                <Box>
                                    <Flex justify="space-between" align="center" mb={3}>
                                        <Text fontSize="sm" fontWeight="medium" color="gray.600">الأدوية</Text>
                                        <Button size="sm" variant="outline" colorPalette="blue" onClick={addMedication}>
                                            <Plus size={14} /> إضافة دواء
                                        </Button>
                                    </Flex>
                                    <Stack gap={3}>
                                        {reportForm.medications.map((med, index) => (
                                            <Box key={index} p={3} bg="gray.50" borderRadius="md" border="1px solid" borderColor="gray.200">
                                                <Flex gap={2} mb={2} flexWrap="wrap">
                                                    <Input placeholder="اسم الدواء" value={med.medicationName}
                                                        onChange={e => updateMedication(index, 'medicationName', e.target.value)}
                                                        size="sm" flex={1} minW="120px" />
                                                    <Input placeholder="الجرعة" value={med.dosage}
                                                        onChange={e => updateMedication(index, 'dosage', e.target.value)}
                                                        size="sm" flex={1} minW="90px" />
                                                    <Input placeholder="التكرار (مثال: مرتين يومياً)" value={med.frequency || ''}
                                                        onChange={e => updateMedication(index, 'frequency', e.target.value)}
                                                        size="sm" flex={1} minW="120px" />
                                                    <IconButton
                                                        aria-label="حذف" size="sm" variant="ghost" colorPalette="red"
                                                        onClick={() => removeMedication(index)}
                                                        disabled={reportForm.medications.length === 1}
                                                    ><Trash2 size={16} /></IconButton>
                                                </Flex>
                                                <Input placeholder="ملاحظة على الدواء" value={med.notes || ''}
                                                    onChange={e => updateMedication(index, 'notes', e.target.value)} size="sm" />
                                            </Box>
                                        ))}
                                    </Stack>
                                </Box>

                                {/* Prescription upload */}
                                <Box>
                                    <Text fontSize="sm" fontWeight="medium" color="gray.600" mb={1}>
                                        صورة الروشتة
                                        <Text as="span" fontSize="xs" color="gray.400" mr={2} display="block" mt={1}>
                                            اختياري — من المعرض أو PDF، أو التقاط صورة بالكاميرا — حتى 5 MB
                                        </Text>
                                    </Text>

                                    <Flex gap={2} flexWrap="wrap" mb={3}>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            colorPalette="gray"
                                            onClick={() => prescriptionGalleryInputRef.current?.click()}
                                        >
                                            <Upload size={16} />
                                            رفع من الجهاز
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            colorPalette="blue"
                                            onClick={() => prescriptionCameraInputRef.current?.click()}
                                        >
                                            <Camera size={16} />
                                            التقاط بالكاميرا
                                        </Button>
                                        <input
                                            ref={prescriptionGalleryInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp,application/pdf"
                                            style={{ display: 'none' }}
                                            onChange={onPrescriptionInputChange}
                                        />
                                        <input
                                            ref={prescriptionCameraInputRef}
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            style={{ display: 'none' }}
                                            onChange={onPrescriptionInputChange}
                                        />
                                    </Flex>

                                    {/* Existing image preview */}
                                    {existingPrescriptionUrl && !prescriptionFile && (
                                        <Box mb={3}>
                                            <Text fontSize="xs" color="gray.500" mb={1}>الصورة الحالية:</Text>
                                            <Box position="relative" display="inline-block">
                                                <Box
                                                    as="img" src={existingPrescriptionUrl} alt="الروشتة الحالية"
                                                    style={{ height: '96px', borderRadius: '8px', border: '2px solid #c9b97a', display: 'block' }}
                                                />
                                                <Box
                                                    as="a" href={existingPrescriptionUrl} target="_blank"
                                                    position="absolute" top={1} left={1}
                                                    bg="blackAlpha.600" borderRadius="full" p={1} cursor="pointer"
                                                >
                                                    <ExternalLink size={12} color="white" />
                                                </Box>
                                            </Box>
                                        </Box>
                                    )}

                                    {/* New image preview */}
                                    {prescriptionPreview && prescriptionPreview !== 'pdf' && (
                                        <Box mb={3} position="relative" display="inline-block">
                                            <Box
                                                as="img" src={prescriptionPreview} alt="معاينة الروشتة"
                                                style={{ height: '96px', borderRadius: '8px', border: '2px solid #615b36', display: 'block' }}
                                            />
                                            <IconButton
                                                aria-label="حذف الصورة" size="2xs" variant="solid" colorPalette="red"
                                                position="absolute" top="-6px" left="-6px" borderRadius="full"
                                                onClick={() => { setPrescriptionFile(null); setPrescriptionPreview(null) }}
                                            ><X size={10} /></IconButton>
                                        </Box>
                                    )}
                                    {prescriptionPreview === 'pdf' && (
                                        <Flex
                                            mb={3} align="center" gap={2} p={2}
                                            bg="orange.50" borderRadius="lg" border="1px solid" borderColor="orange.200"
                                            display="inline-flex"
                                        >
                                            <FileText size={20} color="#c05621" />
                                            <Text fontSize="sm" color="orange.700" fontWeight="medium">{prescriptionFile?.name}</Text>
                                            <IconButton
                                                aria-label="حذف الملف" size="2xs" variant="ghost" colorPalette="orange"
                                                onClick={() => { setPrescriptionFile(null); setPrescriptionPreview(null) }}
                                            ><X size={10} /></IconButton>
                                        </Flex>
                                    )}

                                    {/* سحب وإفلات */}
                                    <Box
                                        onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                                        onDrop={onDropPrescription}
                                        display="flex" flexDirection="column" alignItems="center" justifyContent="center"
                                        gap={2} p={5} borderRadius="xl" border="2px dashed"
                                        borderColor={prescriptionFile ? '#615b36' : 'gray.300'}
                                        bg={prescriptionFile ? '#fdfbf7' : 'gray.50'}
                                        cursor="pointer" transition="all 0.2s"
                                        onClick={() => prescriptionGalleryInputRef.current?.click()}
                                        _hover={{ borderColor: '#615b36', bg: '#fdfbf7' }}
                                    >
                                        <ImagePlus size={26} color={prescriptionFile ? '#615b36' : '#a0aec0'} />
                                        <Text fontSize="sm" color={prescriptionFile ? '#615b36' : 'gray.500'} fontWeight="medium" textAlign="center">
                                            {prescriptionFile ? prescriptionFile.name : 'اسحب الملف هنا أو اضغط للاختيار من الجهاز'}
                                        </Text>
                                        {prescriptionFile
                                            ? <Text fontSize="xs" color="green.500">✓ تم اختيار الملف</Text>
                                            : <Text fontSize="xs" color="gray.400">صور أو PDF</Text>
                                        }
                                    </Box>
                                </Box>

                            </Stack>
                        </Dialog.Body>
                        <Dialog.Footer gap={3}>
                            <Button variant="ghost" onClick={onReportClose}>إلغاء</Button>
                            <Button
                                bg="#615b36" color="white" _hover={{ bg: '#4a452a' }}
                                onClick={handleSaveReport} loading={reportLoading}
                            >
                                {editingReportId ? 'حفظ التعديلات' : 'إنشاء التقرير'}
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Dialog.Root>

            {/* ── Delete Confirm Modal ── */}
            <Dialog.Root open={isDeleteOpen} onOpenChange={e => !e.open && onDeleteClose()} size="sm">
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content dir="rtl">
                        <Dialog.CloseTrigger />
                        <Dialog.Header>
                            <Flex align="center" gap={2} color="red.500">
                                <AlertTriangle size={20} />
                                <Text fontWeight="bold">
                                    {deleteTarget?.type === 'prescription' ? 'حذف صورة الروشتة' : 'حذف التقرير'}
                                </Text>
                            </Flex>
                        </Dialog.Header>
                        <Dialog.Body>
                            <Text color="gray.600" fontSize="sm">
                                {deleteTarget?.type === 'prescription'
                                    ? 'هل أنت متأكد من حذف صورة الروشتة؟ التقرير نفسه سيبقى موجوداً.'
                                    : 'هل أنت متأكد من حذف هذا التقرير؟ سيتم حذف التقرير والصورة وكل الأدوية المرتبطة به نهائياً.'
                                }
                            </Text>
                        </Dialog.Body>
                        <Dialog.Footer gap={3}>
                            <Button variant="ghost" onClick={onDeleteClose}>إلغاء</Button>
                            <Button colorPalette="red" onClick={handleDelete} loading={deleteLoading}>
                                حذف
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Dialog.Root>

        </Box>
    )
}
