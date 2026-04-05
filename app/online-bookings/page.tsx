'use client'

import {
    Box, Container, Flex, Heading, Text, Button, Badge, Table, IconButton, HStack, Input, SimpleGrid, Spinner, Dialog, Portal, Card, VStack, Stack,
} from '@chakra-ui/react'
import { useState, useMemo, useEffect, useCallback, type ReactNode } from 'react'
import { Booking, BookingStatus } from '@/types/booking'
import { Globe, User, Search, AlertCircle, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Phone, Mail, CalendarDays, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '@/lib/axios'
import { toaster } from '@/components/ui/toaster'
import { canChooseDoctor, getCurrentDoctorId, getCurrentRole, setSelectedDoctorId } from '@/lib/doctor-context'
import { WhatsAppCustomerLink } from '@/components/WhatsAppCustomerLink'

const MotionRow = motion(Table.Row)

const todayStr = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildCalendarDays(year: number, month: number): (Date | null)[] {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = (firstDay.getDay() + 1) % 7
    const days: (Date | null)[] = Array(startOffset).fill(null)
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
    while (days.length % 7 !== 0) days.push(null)
    return days
}

const AR_WEEKDAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']

/** ألوان الهوية — متناسقة مع باقي لوحة التحكم */
const BRAND = {
    primary: '#6f6a40',
    primaryMuted: '#85805a',
    surface: '#faf9f6',
    cardBorder: 'rgba(111, 106, 64, 0.12)',
    gradient: 'linear-gradient(135deg, #6f6a40 0%, #8a8460 50%, #6f6a40 100%)',
}

/** تاريخ مفضل من الحجز → YYYY-MM-DD للـ available-slots */
function preferredDateToYMD(preferredDate: string | null | undefined, fallback: string): string {
    if (!preferredDate) return fallback
    if (/^\d{4}-\d{2}-\d{2}/.test(preferredDate)) return preferredDate.slice(0, 10)
    try {
        const d = new Date(preferredDate)
        if (!Number.isNaN(d.getTime())) {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        }
    } catch { /* empty */ }
    return fallback
}

/** تحويل وقت بصيغة 24 ساعة (مثل "13:00") إلى عرض عادي 12 ساعة (مثل "1:00 م") */
function formatTime12(timeStr: string): string {
    if (!timeStr || typeof timeStr !== 'string') return timeStr
    const [h, m] = timeStr.trim().split(':').map(Number)
    if (Number.isNaN(h)) return timeStr
    const hour = h % 24
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    const minute = Number.isNaN(m) ? 0 : m
    const ampm = hour < 12 ? 'ص' : 'م'
    return `${hour12}:${String(minute).padStart(2, '0')} ${ampm}`
}

export default function OnlineBookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'rejected' | 'cancelled'>('all')
    const [filterDate, setFilterDate] = useState(() => todayStr())
    const [calViewDate, setCalViewDate] = useState(() => {
        const d = new Date()
        d.setDate(1)
        return d
    })
    const [cancelId, setCancelId] = useState<string | number | null>(null)
    /** بعد تأكيد الحجز — مودال مختصر: تأكيد + دور في الطابور */
    const [confirmResult, setConfirmResult] = useState<{
        positionInQueue: number
        totalInDay: number
    } | null>(null)

    /** مودال تأكيد حجز أونلاين — يتطلب date + time من available_slots (الـ API doc) */
    const [confirmOnlineId, setConfirmOnlineId] = useState<string | number | null>(null)
    const [confirmDate, setConfirmDate] = useState('')
    const [confirmTime, setConfirmTime] = useState('')
    const [availableSlots, setAvailableSlots] = useState<string[]>([])
    const [loadingSlots, setLoadingSlots] = useState(false)
    const [submittingConfirm, setSubmittingConfirm] = useState(false)
    const [doctors, setDoctors] = useState<Array<{ id: number; name?: string; user?: { name?: string } }>>([])
    const [selectedDoctorId, setDoctorId] = useState<number>(0)
    const [canSelectDoctor, setCanSelectDoctor] = useState(false)

    useEffect(() => {
        const role = getCurrentRole()
        const canSelect = canChooseDoctor(role)
        setCanSelectDoctor(canSelect)
        const current = getCurrentDoctorId()
        if (current) setDoctorId(current)
    }, [])

    useEffect(() => {
        if (!canSelectDoctor) return
        const loadDoctors = async () => {
            try {
                const res = await api.get('/doctors')
                const list = Array.isArray(res.data) ? res.data : (res.data?.doctors ?? [])
                const arr = Array.isArray(list) ? list : []
                setDoctors(arr)
                if (arr.length === 0) return
                setDoctorId((prev) => {
                    const ids = new Set(arr.map((d) => d.id))
                    if (prev > 0 && ids.has(prev)) return prev
                    return arr[0].id
                })
            } catch {
                setDoctors([])
            }
        }
        loadDoctors()
    }, [canSelectDoctor])

    /** حفظ الطبيب المختار في localStorage عند اختيار افتراضي أو يدوي */
    useEffect(() => {
        if (!canSelectDoctor) return
        if (selectedDoctorId > 0) setSelectedDoctorId(selectedDoctorId)
    }, [canSelectDoctor, selectedDoctorId])

    const calYear = calViewDate.getFullYear()
    const calMonth = calViewDate.getMonth()
    const calendarDays = useMemo(() => buildCalendarDays(calYear, calMonth), [calYear, calMonth])
    const prevCalMonth = () => setCalViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
    const nextCalMonth = () => setCalViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
    const resetToToday = () => {
        setFilterDate(todayStr())
        setCalViewDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    }
    const handleDayClick = (dateStr: string) => setFilterDate(dateStr)

    const fetchBookings = useCallback(async () => {
        setIsLoading(true)
        try {
            const params: any = {}
            if (filterStatus !== 'all') params.status = filterStatus
            if (filterDate) params.date = filterDate
            if (selectedDoctorId) params.doctorId = selectedDoctorId

            const response = await api.get('/bookings/online', { params })
            setBookings(Array.isArray(response.data) ? response.data : (response.data?.bookings ?? []))
        } catch (error) {
            console.error('Failed to fetch bookings:', error)
        } finally {
            setIsLoading(false)
        }
    }, [filterStatus, filterDate, selectedDoctorId])

    // Initial fetch and when filters change
    useEffect(() => {
        fetchBookings()
    }, [fetchBookings])

    // جلب المواعيد المتاحة عند اختيار تاريخ في مودال التأكيد
    useEffect(() => {
        if (!confirmOnlineId || !confirmDate || !selectedDoctorId) {
            setAvailableSlots([])
            return
        }
        let cancelled = false
        const run = async () => {
            setLoadingSlots(true)
            setAvailableSlots([])
            try {
                const params: any = { date: confirmDate }
                if (selectedDoctorId) params.doctorId = selectedDoctorId
                const res = await api.get('/bookings/available-slots', { params })
                const slots = res.data?.available_slots ?? res.data?.availableSlots ?? []
                if (!cancelled) setAvailableSlots(Array.isArray(slots) ? slots : [])
            } catch {
                if (!cancelled) setAvailableSlots([])
            } finally {
                if (!cancelled) setLoadingSlots(false)
            }
        }
        run()
        return () => { cancelled = true }
    }, [confirmOnlineId, confirmDate, selectedDoctorId])

    // عند تغيير التاريخ في مودال التأكيد، إعادة اختيار الوقت (السلاطات تخص اليوم)
    useEffect(() => {
        if (!confirmOnlineId) return
        setConfirmTime('')
    }, [confirmDate, confirmOnlineId])

    // Stats calculation based on the CURRENT fetched/filtered list? 
    // Usually stats count *all* bookings. The API might need a separate stats endpoint or we just count what we have.
    // Given the API docs only give filtered list, we might only see stats for the current filter views if we rely solely on frontend.
    // However, usually "Stats" cards show global state. 
    // For now, we will calculate stats from the `bookings` IF `filterStatus` is 'all', otherwise they might be misleading.
    // OR we could fetch 'all' initially. 
    // Let's assume for this UI we calculate from available data, understanding its limitation if filtered by backend.

    const stats = useMemo(() => {
        // This is strictly based on the current list. 
        // If the user filters by 'pending' in the backend, 'confirmed' count will be 0.
        // To do this properly we'd need a separate stats API or fetch all.
        // For this specific task, we'll just calculate from the current view or maybe we shouldn't filter by backend for status?
        // The user REQUESTED: "Filters (Query Params): status, date". So backend filtering is required.
        // We will accept that the stats cards update based on the current view (or we could fetch aggregate stats separately, but that's out of scope).
        return {
            total: bookings.length,
            pending: bookings.filter(b => b.status === 'pending').length,
            confirmed: bookings.filter(b => b.status === 'confirmed').length,
            cancelled: bookings.filter(b => b.status === 'cancelled').length,
        }
    }, [bookings])

    // Frontend Search Logic (on top of backend results)
    const filteredBookings = useMemo(() => {
        return bookings.filter(b => {
            // Fallback for fields
            const name = b.customerName || '';
            // @ts-ignore
            const phone = b.customerPhone || b.phoneNumber || '';
            // @ts-ignore
            const email = b.email || '';

            const matchesSearch =
                name.includes(searchQuery) ||
                phone.includes(searchQuery) ||
                email.includes(searchQuery);

            // Backend handles status/date, so we just do search here
            return matchesSearch;
        }).sort((a, b) => {
            // Sort by appointmentDate (newest first)
            // @ts-ignore
            const dateA = a.appointmentDate || a.bookingTime || '';
            // @ts-ignore
            const dateB = b.appointmentDate || b.bookingTime || '';
            return new Date(dateB).getTime() - new Date(dateA).getTime();
        })
    }, [bookings, searchQuery])

    type PatchOnlineBody = { status: BookingStatus; date?: string; time?: string; doctorId?: number }

    const patchOnlineStatus = async (id: string | number, body: PatchOnlineBody) => {
        const newStatus = body.status
        try {
            const { data } = await api.patch(`/bookings/online/${id}/status`, body)

            const updated = data?.booking ?? data
            if (updated && typeof updated === 'object') {
                setBookings(prev => prev.map(b =>
                    b.id === id ? { ...b, ...updated, status: newStatus } : b
                ))
            } else {
                setBookings(prev => prev.map(b =>
                    b.id === id ? { ...b, status: newStatus } : b
                ))
            }

            if (newStatus === 'confirmed') {
                setConfirmResult({
                    positionInQueue: Number(data?.positionInQueue ?? data?.booking?.positionInQueue ?? 0),
                    totalInDay: Number(data?.totalInDay ?? data?.booking?.totalInDay ?? 0),
                })
            }
        } catch (error: any) {
            console.error(`Failed to update booking ${id}`, error)
            const msg = error.response?.data?.message || 'فشل تحديث حالة الحجز'
            const extraSlots = error.response?.data?.available_slots
            toaster.create({
                title: 'خطأ في التحديث',
                description: extraSlots && Array.isArray(extraSlots)
                    ? `${msg} — المواعيد المتاحة: ${extraSlots.join(', ')}`
                    : msg,
                type: 'error',
                duration: 5000,
            })
            fetchBookings()
            throw error
        }
    }

    const updateBookingStatus = async (id: string | number, newStatus: BookingStatus) => {
        await patchOnlineStatus(id, { status: newStatus })
    }

    const submitOnlineConfirm = async () => {
        if (!confirmOnlineId || !confirmDate || !confirmTime) {
            toaster.create({
                title: 'بيانات ناقصة',
                description: 'اختر التاريخ والوقت من المواعيد المتاحة (سلاطات 10 دقائق).',
                type: 'error',
                duration: 3000,
            })
            return
        }
        if (!selectedDoctorId) {
            toaster.create({
                title: 'اختر الطبيب أولاً',
                description: 'تأكيد الحجز الأونلاين يتطلب اختيار الطبيب.',
                type: 'warning',
                duration: 3000,
            })
            return
        }
        setSubmittingConfirm(true)
        try {
            await patchOnlineStatus(confirmOnlineId, {
                status: 'confirmed',
                date: confirmDate,
                time: confirmTime,
                doctorId: selectedDoctorId,
            })
            setConfirmOnlineId(null)
            setConfirmTime('')
        } catch {
            /* toaster في patchOnlineStatus */
        } finally {
            setSubmittingConfirm(false)
        }
    }

    const handleCancel = (id: string | number) => {
        setCancelId(id);
    }

    const confirmCancellation = () => {
        if (cancelId) {
            updateBookingStatus(cancelId, 'cancelled')
            setCancelId(null)
        }
    }

    const handleStatusChange = (id: string | number, newStatus: BookingStatus) => {
        if (newStatus === 'cancelled') {
            setCancelId(id)
            return
        }
        if (newStatus === 'confirmed') {
            const booking = bookings.find(b => b.id === id)
            setConfirmDate(preferredDateToYMD(booking?.preferredDate, todayStr()))
            setConfirmTime('')
            setConfirmOnlineId(id)
            return
        }
        updateBookingStatus(id, newStatus)
    }

    const getStatusBadge = (status: string) => {
        const base = { px: 2.5, py: 1, borderRadius: 'full', fontWeight: 'semibold', fontSize: 'xs' as const }
        switch (status) {
            case 'confirmed': return <Badge {...base} colorPalette="green" variant="subtle">مؤكد</Badge>
            case 'completed': return <Badge {...base} colorPalette="blue" variant="subtle">مكتمل</Badge>
            case 'cancelled': return <Badge {...base} colorPalette="red" variant="subtle">ملغي</Badge>
            case 'rejected': return <Badge {...base} colorPalette="red" variant="outline">مرفوض</Badge>
            case 'pending': return <Badge {...base} colorPalette="orange" variant="subtle">قيد الانتظار</Badge>
            default: return <Badge {...base} colorPalette="gray">{status}</Badge>
        }
    }

    const formatPreferredDateTime = (booking: Booking) => {
        // الأونلاين: بيستخدم preferredDate + preferredTime
        if (booking.preferredDate) {
            const d = new Date(booking.preferredDate).toLocaleDateString('ar-EG')
            const t = booking.preferredTime || '--:--'
            return `${d} — ${t}`
        }
        // لو تم التأكيد (appointmentDate حُدِد)
        if (booking.appointmentDate) {
            return new Date(booking.appointmentDate).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })
        }
        return 'لم يحدد بعد'
    }

    /** قائمة تحديث الحالة — مشتركة بين الجدول والبطاقة */
    const bookingStatusSelect = (booking: Booking, fullWidth?: boolean) => (
        <select
            value={confirmOnlineId === booking.id ? 'pending' : booking.status}
            onChange={(e) => handleStatusChange(booking.id, e.target.value as BookingStatus)}
            style={{
                padding: '10px 12px',
                borderRadius: '10px',
                border: `1px solid ${BRAND.cardBorder}`,
                backgroundColor: '#fafaf8',
                fontSize: '14px',
                minWidth: fullWidth ? undefined : 140,
                width: fullWidth ? '100%' : 'auto',
                maxWidth: '100%',
                cursor: 'pointer',
                color: '#334155',
                fontWeight: 500,
            }}
        >
            <option value="pending">قيد الانتظار</option>
            <option value="confirmed">مؤكد</option>
            <option value="rejected">مرفوض</option>
            <option value="cancelled">ملغي</option>
        </select>
    )

    const statCard = (opts: {
        label: string
        sub: string
        value: number
        accent: string
        iconBg: string
        iconColor: string
        icon: ReactNode
    }) => (
        <Card.Root
            position="relative"
            bg="white"
            shadow="sm"
            borderRadius="2xl"
            overflow="hidden"
            borderWidth="1px"
            borderColor={BRAND.cardBorder}
            transition="transform 0.2s ease, box-shadow 0.2s ease"
            _hover={{ shadow: 'md', transform: 'translateY(-2px)' }}
        >
            <Box position="absolute" insetInlineEnd={0} top={0} w="100%" h="3px" bg={opts.accent} />
            <Card.Body p={{ base: 5, md: 6 }} pt={6}>
                <Flex justify="space-between" align="flex-start" gap={3} mb={3}>
                    <Box>
                        <Text color="gray.500" fontWeight="medium" fontSize="sm">
                            {opts.label}
                        </Text>
                        <Text fontSize={{ base: '2xl', md: '3xl' }} fontWeight="bold" color="gray.800" letterSpacing="tight">
                            {opts.value}
                        </Text>
                    </Box>
                    <Flex
                        align="center"
                        justify="center"
                        w={11}
                        h={11}
                        borderRadius="xl"
                        bg={opts.iconBg}
                        color={opts.iconColor}
                        flexShrink={0}
                    >
                        {opts.icon}
                    </Flex>
                </Flex>
                <Text fontSize="xs" color="gray.400">
                    {opts.sub}
                </Text>
            </Card.Body>
        </Card.Root>
    )

    return (
        <Box
            minH="100vh"
            dir="rtl"
            bgGradient="linear(to-b, #f5f3eb 0%, #f1f5f9 35%, #f8fafc 100%)"
        >
            <Container maxW="8xl" py={{ base: 4, sm: 6, md: 10 }} px={{ base: 3, sm: 4, md: 6 }}>

                {/* رأس الصفحة */}
                <Box
                    mb={{ base: 8, md: 10 }}
                    p={{ base: 5, md: 8 }}
                    borderRadius="3xl"
                    bg={BRAND.gradient}
                    color="white"
                    position="relative"
                    overflow="hidden"
                    shadow="lg"
                >
                    <Box
                        position="absolute"
                        inset={0}
                        opacity={0.15}
                        bgImage="radial-gradient(circle at 20% 50%, white 0%, transparent 55%)"
                        pointerEvents="none"
                    />
                    <Flex
                        direction={{ base: 'column', md: 'row' }}
                        align={{ base: 'flex-start', md: 'center' }}
                        justify="space-between"
                        gap={4}
                        position="relative"
                    >
                        <Flex align="flex-start" gap={4}>
                            <Flex
                                align="center"
                                justify="center"
                                w={{ base: 12, md: 14 }}
                                h={{ base: 12, md: 14 }}
                                borderRadius="2xl"
                                bg="whiteAlpha.200"
                                backdropFilter="blur(8px)"
                            >
                                <Globe size={28} strokeWidth={1.75} />
                            </Flex>
                            <Box>
                                <Flex align="center" gap={2} mb={2} flexWrap="wrap">
                                    <Heading size={{ base: 'xl', md: '2xl' }} fontWeight="bold" letterSpacing="tight">
                                        حجوزات الأونلاين
                                    </Heading>
                                    <Badge
                                        bg="whiteAlpha.300"
                                        color="white"
                                        borderRadius="full"
                                        px={3}
                                        py={0.5}
                                        fontSize="xs"
                                        fontWeight="semibold"
                                    >
                                        <Sparkles size={12} style={{ display: 'inline', marginLeft: 4 }} />
                                        من الموقع
                                    </Badge>
                                </Flex>
                                <Text color="whiteAlpha.900" fontSize={{ base: 'sm', md: 'md' }} maxW="lg" lineHeight="tall">
                                    راجع طلبات الحجز، وحدّث الحالة، وأكّد الموعد من السلاطات المتاحة.
                                </Text>
                            </Box>
                        </Flex>
                    </Flex>
                </Box>

                {/* إحصائيات القائمة الحالية */}
                <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} gap={{ base: 4, md: 6 }} mb={{ base: 6, md: 8 }}>
                    {statCard({
                        label: 'قيد الانتظار',
                        sub: 'طلبات تحتاج مراجعة',
                        value: stats.pending,
                        accent: 'orange.400',
                        iconBg: 'orange.50',
                        iconColor: 'orange.600',
                        icon: <AlertCircle size={22} />,
                    })}
                    {statCard({
                        label: 'تم التأكيد',
                        sub: 'حجوزات مفعّلة',
                        value: stats.confirmed,
                        accent: 'green.400',
                        iconBg: 'green.50',
                        iconColor: 'green.600',
                        icon: <CheckCircle2 size={22} />,
                    })}
                    {statCard({
                        label: 'ملغاة',
                        sub: 'طلبات أُلغيت',
                        value: stats.cancelled,
                        accent: 'red.400',
                        iconBg: 'red.50',
                        iconColor: 'red.600',
                        icon: <XCircle size={22} />,
                    })}
                    {statCard({
                        label: 'العدد المعروض',
                        sub: 'حسب التصفية الحالية',
                        value: stats.total,
                        accent: BRAND.primary,
                        iconBg: 'blue.50',
                        iconColor: 'blue.600',
                        icon: <User size={22} />,
                    })}
                </SimpleGrid>

                {/* تصفية وبحث */}
                <Card.Root
                    mb={6}
                    bg="white"
                    borderRadius="2xl"
                    shadow="sm"
                    borderWidth="1px"
                    borderColor={BRAND.cardBorder}
                    overflow="hidden"
                >
                    <Box px={{ base: 4, md: 6 }} py={4} borderBottom="1px solid" borderColor="gray.100" bg={BRAND.surface}>
                        <Text fontWeight="semibold" color="gray.700" fontSize="sm">
                            تصفية الطلبات
                        </Text>
                        <Text fontSize="xs" color="gray.500" mt={0.5}>
                            اختر التاريخ من التقويم، ثم حالة الطلب أو ابحث بالاسم / الهاتف
                        </Text>
                    </Box>
                    <Card.Body p={{ base: 4, md: 5 }}>
                <Flex gap={4} flexWrap="wrap" align="flex-start">
                    <Box position="relative" flex={1} minW={{ base: '100%', md: '260px' }} maxW={{ md: '420px' }}>
                        <Input
                            placeholder="بحث بالاسم أو رقم الهاتف..."
                            bg="gray.50"
                            border="1px solid"
                            borderColor="gray.200"
                            rounded="xl"
                            h="48px"
                            pr={11}
                            fontSize="sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            _focus={{ borderColor: BRAND.primary, boxShadow: `0 0 0 1px ${BRAND.primary}`, bg: 'white' }}
                            _hover={{ borderColor: 'gray.300' }}
                        />
                        <Flex position="absolute" right={3} top="50%" transform="translateY(-50%)" color="gray.400" pointerEvents="none">
                            <Search size={18} />
                        </Flex>
                    </Box>
                    {/* التقويم */}
                    <Card.Root bg="white" shadow="none" borderRadius="2xl" overflow="hidden" borderWidth="1px" borderColor={BRAND.cardBorder} flexShrink={0} w={{ base: '100%', sm: 'auto' }}>
                        <Box bg={BRAND.gradient} px={4} py={3}>
                            <Flex align="center" justify="space-between">
                                <IconButton aria-label="الشهر السابق" size="sm" variant="ghost" color="white" _hover={{ bg: "whiteAlpha.200" }} onClick={prevCalMonth}>
                                    <ChevronRight size={18} />
                                </IconButton>
                                <Flex align="center" gap={2}>
                                    <Text fontWeight="bold" color="white" fontSize="md">
                                        {calViewDate.toLocaleDateString("ar-EG", { month: "long", year: "numeric" })}
                                    </Text>
                                    <Button size="xs" variant="outline" color="white" borderColor="whiteAlpha.500" _hover={{ bg: "whiteAlpha.200" }} onClick={resetToToday} borderRadius="full" px={2.5}>
                                        اليوم
                                    </Button>
                                </Flex>
                                <IconButton aria-label="الشهر التالي" size="sm" variant="ghost" color="white" _hover={{ bg: "whiteAlpha.200" }} onClick={nextCalMonth}>
                                    <ChevronLeft size={18} />
                                </IconButton>
                            </Flex>
                        </Box>
                        {/* أيام الأسبوع: السبت، الأحد، ... أوضح */}
                        <Box display="grid" gridTemplateColumns="repeat(7,1fr)" bg="#eae8dc" borderBottom="2px solid" borderColor="#b8b399">
                            {AR_WEEKDAYS.map(d => (
                                <Box key={d} textAlign="center" py={{ base: 2, sm: 2.5 }} px={0.5}>
                                    <Text fontSize={{ base: '10px', sm: 'xs', md: 'sm' }} fontWeight="bold" color="#6f6a40" lineHeight="short">
                                        {d}
                                    </Text>
                                </Box>
                            ))}
                        </Box>
                        <Box display="grid" gridTemplateColumns="repeat(7,1fr)" p={{ base: 1.5, sm: 2 }} gap={0.5}>
                            {calendarDays.map((date, idx) => {
                                if (!date) return <Box key={`empty-${idx}`} />
                                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                                const isToday = dateStr === todayStr()
                                const isSelected = dateStr === filterDate
                                const dayNames = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']
                                return (
                                    <Box
                                        key={dateStr}
                                        position="relative"
                                        onClick={() => handleDayClick(dateStr)}
                                        cursor="pointer"
                                        display="flex"
                                        flexDirection="column"
                                        alignItems="center"
                                        justifyContent="center"
                                        h={{ base: '38px', sm: '44px' }}
                                        borderRadius="lg"
                                        transition="all 0.15s"
                                        userSelect="none"
                                        bg={isSelected ? "#6f6a40" : "transparent"}
                                        color={isSelected ? "white" : isToday ? "#6f6a40" : "gray.700"}
                                        fontWeight={isSelected || isToday ? "bold" : "normal"}
                                        _hover={{
                                            bg: isSelected ? "#5c5733" : "#f0ebe0",
                                            transform: "scale(1.05)",
                                        }}
                                    >
                                        {isToday && !isSelected && (
                                            <Box position="absolute" inset="2px" borderRadius="md" border="2px solid" borderColor="#9d9870" pointerEvents="none" />
                                        )}
                                        <Text fontSize={{ base: '9px', sm: 'xs' }} opacity={isSelected ? 0.9 : 0.8} lineHeight={1} mb="1px">{dayNames[date.getDay()]}</Text>
                                        <Text fontSize={{ base: 'xs', sm: 'sm' }} lineHeight={1}>{date.getDate()}</Text>
                                    </Box>
                                )
                            })}
                        </Box>
                        {filterDate && (
                            <Box px={3} py={2.5} bg="gray.50" borderTop="1px solid" borderColor="gray.100">
                                <Text fontSize="xs" color="gray.600" textAlign="center" fontWeight="medium">
                                    المحدد: {new Date(filterDate + "T12:00:00").toLocaleDateString("ar-EG", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                                </Text>
                            </Box>
                        )}
                    </Card.Root>
                    {canSelectDoctor && (
                        <Box
                            bg="gray.50"
                            border="1px solid"
                            borderColor="gray.200"
                            borderRadius="lg"
                            minW={{ base: '100%', md: '260px' }}
                            px={1}
                            py={1}
                        >
                            <select
                                value={selectedDoctorId || ''}
                                onChange={(e) => {
                                    const id = Number(e.target.value) || 0
                                    setDoctorId(id)
                                    setSelectedDoctorId(id || null)
                                }}
                                style={{
                                    width: '100%',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    padding: '8px 10px',
                                    color: '#374151',
                                    fontSize: '14px',
                                }}
                            >
                                <option value="">كل الأطباء</option>
                                {doctors.map((doc) => (
                                    <option key={doc.id} value={doc.id}>
                                        {doc.user?.name || doc.name || `Doctor #${doc.id}`}
                                    </option>
                                ))}
                            </select>
                        </Box>
                    )}
                    <Flex
                        bg="gray.50"
                        p={1.5}
                        rounded="xl"
                        border="1px solid"
                        borderColor="gray.100"
                        flexWrap="wrap"
                        gap={1}
                        w={{ base: '100%', lg: 'auto' }}
                        flex={1}
                        minW={{ base: '100%', lg: '280px' }}
                    >
                        {(['all', 'pending', 'confirmed', 'rejected', 'cancelled'] as const).map((status) => (
                            <Button
                                key={status}
                                size="sm"
                                variant={filterStatus === status ? 'solid' : 'ghost'}
                                colorPalette={filterStatus === status ? 'gray' : 'gray'}
                                bg={filterStatus === status ? BRAND.primary : 'transparent'}
                                color={filterStatus === status ? 'white' : 'gray.600'}
                                _hover={{
                                    bg: filterStatus === status ? BRAND.primaryMuted : 'white',
                                    color: filterStatus === status ? 'white' : 'gray.800',
                                }}
                                onClick={() => setFilterStatus(status)}
                                rounded="lg"
                                fontWeight="medium"
                                flex={{ base: '1 1 calc(50% - 4px)', sm: '0 0 auto' }}
                            >
                                {status === 'all' && 'الكل'}
                                {status === 'pending' && 'انتظار'}
                                {status === 'confirmed' && 'مؤكد'}
                                {status === 'rejected' && 'مرفوض'}
                                {status === 'cancelled' && 'ملغي'}
                            </Button>
                        ))}
                    </Flex>
                </Flex>
                    </Card.Body>
                </Card.Root>

                {/* قائمة الطلبات — بطاقات (موبايل) + جدول (md+) */}
                <Card.Root
                    borderRadius="2xl"
                    shadow="sm"
                    borderWidth="1px"
                    borderColor={BRAND.cardBorder}
                    overflow="hidden"
                >
                    <Box px={{ base: 3, md: 6 }} py={4} bg={BRAND.surface} borderBottom="1px solid" borderColor="gray.100">
                        <Flex align="center" justify="space-between" flexWrap="wrap" gap={2}>
                            <Flex align="center" gap={2} minW={0}>
                                <CalendarDays size={20} color={BRAND.primary} />
                                <Text fontWeight="bold" color="gray.800" fontSize={{ base: 'sm', md: 'md' }}>
                                    قائمة الطلبات
                                </Text>
                            </Flex>
                            <Badge variant="subtle" colorPalette="gray" borderRadius="full" px={3} flexShrink={0}>
                                {filteredBookings.length} طلب
                            </Badge>
                        </Flex>
                    </Box>

                    {isLoading ? (
                        <Flex justify="center" align="center" minH="220px" py={12}>
                            <Flex direction="column" align="center" gap={4}>
                                <Spinner color={BRAND.primary} size="xl" />
                                <Text color="gray.500" fontSize="sm">جاري تحميل الحجوزات...</Text>
                            </Flex>
                        </Flex>
                    ) : filteredBookings.length === 0 ? (
                        <Flex direction="column" align="center" gap={4} py={16} px={4}>
                            <Flex align="center" justify="center" w={16} h={16} rounded="full" bg={BRAND.surface} borderWidth="1px" borderColor={BRAND.cardBorder}>
                                <Search size={28} color={BRAND.primary} strokeWidth={1.5} />
                            </Flex>
                            <Box textAlign="center">
                                <Text color="gray.700" fontWeight="semibold" mb={1}>
                                    لا توجد طلبات
                                </Text>
                                <Text color="gray.500" fontSize="sm">
                                    جرّب تغيير التاريخ أو التصفية أو نص البحث
                                </Text>
                            </Box>
                        </Flex>
                    ) : (
                        <>
                            <Stack gap={3} display={{ base: 'flex', md: 'none' }} p={{ base: 3, sm: 4 }} pb={5}>
                                {filteredBookings.map((booking) => {
                                    const row = booking as Booking & {
                                        type?: string
                                        email?: string
                                        phoneNumber?: string
                                    }
                                    return (
                                        <Card.Root
                                            key={booking.id}
                                            bg="white"
                                            borderWidth="1px"
                                            borderColor={BRAND.cardBorder}
                                            borderRadius="xl"
                                            shadow="sm"
                                        >
                                            <Card.Body p={4}>
                                                <Flex align="flex-start" justify="space-between" gap={2} mb={3} flexWrap="wrap">
                                                    <Flex align="center" gap={3} minW={0} flex={1}>
                                                        <Box
                                                            bg={row.type === 'online' ? 'purple.50' : 'blue.50'}
                                                            p={2.5}
                                                            rounded="2xl"
                                                            color={row.type === 'online' ? 'purple.600' : 'blue.600'}
                                                            borderWidth="1px"
                                                            borderColor={row.type === 'online' ? 'purple.100' : 'blue.100'}
                                                            flexShrink={0}
                                                        >
                                                            <User size={20} />
                                                        </Box>
                                                        <Box minW={0} flex={1}>
                                                            <Text fontWeight="bold" color="gray.800" fontSize="sm">
                                                                {booking.customerName}
                                                            </Text>
                                                            <Text fontSize="xs" color="gray.500">
                                                                {booking.createdAt
                                                                    ? `طلب في ${new Date(booking.createdAt).toLocaleDateString('ar-EG')}`
                                                                    : ''}
                                                            </Text>
                                                        </Box>
                                                    </Flex>
                                                    <Box flexShrink={0}>{getStatusBadge(booking.status)}</Box>
                                                </Flex>

                                                <VStack align="stretch" gap={2} mb={3}>
                                                    <Flex align="center" gap={2} justify="flex-end" flexWrap="wrap">
                                                        <Phone size={14} color="#94a3b8" />
                                                        <Text fontSize="sm" fontWeight="medium" color="gray.700" fontFamily="monospace" dir="ltr">
                                                            {booking.customerPhone || row.phoneNumber || '—'}
                                                        </Text>
                                                        <WhatsAppCustomerLink phone={booking.customerPhone || row.phoneNumber} boxSize="28px" iconSize={16} />
                                                    </Flex>
                                                    {row.email && (
                                                        <Flex align="center" gap={2} justify="flex-end" minW={0}>
                                                            <Box flexShrink={0} as="span" display="inline-flex">
                                                                <Mail size={14} color="#94a3b8" />
                                                            </Box>
                                                            <Text fontSize="xs" color="gray.500" truncate title={row.email}>
                                                                {row.email}
                                                            </Text>
                                                        </Flex>
                                                    )}
                                                </VStack>

                                                <Box mb={3}>
                                                    <Text fontSize="xs" color="gray.500" mb={1}>الموعد المفضل</Text>
                                                    <Text fontSize="sm" fontWeight="semibold" color={booking.appointmentDate ? 'green.700' : 'orange.600'}>
                                                        {formatPreferredDateTime(booking)}
                                                    </Text>
                                                    {!booking.appointmentDate && (
                                                        <Badge size="sm" variant="subtle" colorPalette="orange" borderRadius="md" mt={1}>
                                                            بانتظار التأكيد
                                                        </Badge>
                                                    )}
                                                </Box>

                                                <Box pt={3} borderTopWidth="1px" borderColor="gray.100">
                                                    <Text fontSize="xs" color="gray.500" mb={2}>تحديث الحالة</Text>
                                                    {bookingStatusSelect(booking, true)}
                                                </Box>
                                            </Card.Body>
                                        </Card.Root>
                                    )
                                })}
                            </Stack>

                            <Box display={{ base: 'none', md: 'block' }} overflowX="auto" css={{ WebkitOverflowScrolling: 'touch' }}>
                                <Table.Root striped interactive minW="720px" size="sm">
                                    <Table.Header bg="gray.50">
                                        <Table.Row>
                                            <Table.ColumnHeader textAlign="right" py={3} px={4} fontSize="sm" color="gray.600" fontWeight="semibold">المريض</Table.ColumnHeader>
                                            <Table.ColumnHeader textAlign="right" py={3} px={4} fontSize="sm" color="gray.600" fontWeight="semibold">الاتصال</Table.ColumnHeader>
                                            <Table.ColumnHeader textAlign="right" py={3} px={4} fontSize="sm" color="gray.600" fontWeight="semibold">الموعد المفضل</Table.ColumnHeader>
                                            <Table.ColumnHeader textAlign="right" py={3} px={4} fontSize="sm" color="gray.600" fontWeight="semibold">الحالة</Table.ColumnHeader>
                                            <Table.ColumnHeader textAlign="right" py={3} px={4} fontSize="sm" color="gray.600" fontWeight="semibold">تحديث الحالة</Table.ColumnHeader>
                                        </Table.Row>
                                    </Table.Header>
                                    <Table.Body>
                                        <AnimatePresence initial={false}>
                                            {filteredBookings.map((booking) => {
                                                const row = booking as Booking & {
                                                    type?: string
                                                    email?: string
                                                    phoneNumber?: string
                                                }
                                                return (
                                                    <MotionRow
                                                        key={booking.id}
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: -8 }}
                                                        transition={{ duration: 0.15 }}
                                                        _hover={{ bg: 'rgba(111, 106, 64, 0.06)' }}
                                                    >
                                                        <Table.Cell py={3} px={4}>
                                                            <Flex align="center" gap={3}>
                                                                <Box
                                                                    bg={row.type === 'online' ? 'purple.50' : 'blue.50'}
                                                                    p={2.5}
                                                                    rounded="2xl"
                                                                    color={row.type === 'online' ? 'purple.600' : 'blue.600'}
                                                                    borderWidth="1px"
                                                                    borderColor={row.type === 'online' ? 'purple.100' : 'blue.100'}
                                                                >
                                                                    <User size={20} />
                                                                </Box>
                                                                <Box minW={0}>
                                                                    <Text fontWeight="bold" color="gray.800" fontSize="sm">
                                                                        {booking.customerName}
                                                                    </Text>
                                                                    <Text fontSize="xs" color="gray.500">
                                                                        {booking.createdAt
                                                                            ? `طلب في ${new Date(booking.createdAt).toLocaleDateString('ar-EG')}`
                                                                            : ''}
                                                                    </Text>
                                                                </Box>
                                                            </Flex>
                                                        </Table.Cell>
                                                        <Table.Cell py={3} px={4}>
                                                            <VStack align="stretch" gap={1}>
                                                                <Flex align="center" gap={2} justify="flex-end" flexWrap="wrap">
                                                                    <Phone size={14} color="#94a3b8" />
                                                                    <Text fontSize="sm" fontWeight="medium" color="gray.700" fontFamily="monospace" dir="ltr">
                                                                        {booking.customerPhone || row.phoneNumber || '—'}
                                                                    </Text>
                                                                    <WhatsAppCustomerLink phone={booking.customerPhone || row.phoneNumber} boxSize="28px" iconSize={16} />
                                                                </Flex>
                                                                {row.email && (
                                                                    <Flex align="center" gap={2} justify="flex-end">
                                                                        <Mail size={14} color="#94a3b8" />
                                                                        <Text fontSize="xs" color="gray.500" truncate maxW="200px" title={row.email}>
                                                                            {row.email}
                                                                        </Text>
                                                                    </Flex>
                                                                )}
                                                            </VStack>
                                                        </Table.Cell>
                                                        <Table.Cell py={3} px={4}>
                                                            <Box>
                                                                <Text fontSize="sm" fontWeight="semibold" color={booking.appointmentDate ? 'green.700' : 'orange.600'}>
                                                                    {formatPreferredDateTime(booking)}
                                                                </Text>
                                                                {!booking.appointmentDate && (
                                                                    <Badge size="sm" variant="subtle" colorPalette="orange" borderRadius="md" mt={1}>
                                                                        بانتظار التأكيد
                                                                    </Badge>
                                                                )}
                                                            </Box>
                                                        </Table.Cell>
                                                        <Table.Cell py={3} px={4}>
                                                            {getStatusBadge(booking.status)}
                                                        </Table.Cell>
                                                        <Table.Cell py={3} px={4}>
                                                            {bookingStatusSelect(booking)}
                                                        </Table.Cell>
                                                    </MotionRow>
                                                )
                                            })}
                                        </AnimatePresence>
                                    </Table.Body>
                                </Table.Root>
                            </Box>
                        </>
                    )}
                </Card.Root>

                {/* Cancel Confirmation Modal */}
                <Dialog.Root open={!!cancelId} onOpenChange={() => setCancelId(null)}>
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
                                width={{ base: "90%", md: "400px" }}
                                p={6}
                                textAlign="center"
                            >
                                <Box color="red.500" mb={4} display="flex" justifyContent="center">
                                    <AlertCircle size={48} />
                                </Box>
                                <Heading size="lg" mb={2} color="gray.800">
                                    تأكيد إلغاء الحجز
                                </Heading>
                                <Text color="gray.600" mb={8} lineHeight="tall">
                                    هل أنت متأكد من إلغاء هذا الطلب؟ يمكنك التراجع لاحقاً بتغيير الحالة إن لزم.
                                </Text>
                                <Flex gap={3}>
                                    <Button
                                        flex={1}
                                        onClick={confirmCancellation}
                                        colorPalette="red"
                                        variant="solid"
                                    >
                                        نعم، إلغاء الحجز
                                    </Button>
                                    <Button
                                        flex={1}
                                        onClick={() => setCancelId(null)}
                                        variant="outline"
                                        colorPalette="gray"
                                    >
                                        إلغاء
                                    </Button>
                                </Flex>
                            </Dialog.Content>
                        </Dialog.Positioner>
                    </Portal>
                </Dialog.Root>

                {/* تأكيد حجز أونلاين — PATCH يتطلب date + time من available_slots */}
                <Dialog.Root
                    open={!!confirmOnlineId}
                    onOpenChange={(e) => {
                        if (!e.open) {
                            setConfirmOnlineId(null)
                            setConfirmTime('')
                            setAvailableSlots([])
                        }
                    }}
                >
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
                                width={{ base: '95%', md: '440px' }}
                                maxH="90vh"
                                overflowY="auto"
                                p={0}
                            >
                                <Box bg={BRAND.gradient} px={6} py={4} color="white">
                                    <Heading size="md" fontWeight="bold">
                                        تأكيد الحجز الأونلاين
                                    </Heading>
                                    <Text opacity={0.95} fontSize="sm" mt={1} lineHeight="tall">
                                        اختر تاريخاً ووقتاً من المواعيد المتاحة (سلاطات 10 دقائق).
                                    </Text>
                                </Box>
                                <Box p={6}>
                                <VStack gap={4} align="stretch">
                                    <Box>
                                        <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">
                                            الطبيب
                                        </Text>
                                        {canSelectDoctor ? (
                                            <select
                                                value={selectedDoctorId || ''}
                                                onChange={(e) => {
                                                    const id = Number(e.target.value) || 0
                                                    setDoctorId(id)
                                                    setSelectedDoctorId(id || null)
                                                    setConfirmTime('')
                                                    setAvailableSlots([])
                                                }}
                                                style={{
                                                    width: '100%',
                                                    minHeight: '44px',
                                                    padding: '0 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #E2E8F0',
                                                    backgroundColor: '#F7FAFC',
                                                    fontSize: '14px',
                                                }}
                                            >
                                                <option value="">— اختر الطبيب —</option>
                                                {doctors.map((doc) => (
                                                    <option key={doc.id} value={doc.id}>
                                                        {doc.user?.name || doc.name || `Doctor #${doc.id}`}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <Text fontSize="sm" color="gray.700" bg="gray.50" p={3} borderRadius="md">
                                                {selectedDoctorId
                                                    ? `الطبيب المحدد: #${selectedDoctorId}`
                                                    : 'لا يوجد طبيب مرتبط بالحساب الحالي'}
                                            </Text>
                                        )}
                                    </Box>
                                    <Box>
                                        <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">
                                            التاريخ
                                        </Text>
                                        <Input
                                            type="date"
                                            value={confirmDate}
                                            onChange={(e) => setConfirmDate(e.target.value)}
                                            bg="gray.50"
                                            borderColor="gray.200"
                                            minH="44px"
                                        />
                                    </Box>
                                    <Box>
                                        <Text fontSize="sm" color="gray.600" mb={2} fontWeight="medium">
                                            وقت الحجز
                                        </Text>
                                        {!selectedDoctorId ? (
                                            <Text fontSize="sm" color="orange.600" bg="orange.50" p={3} borderRadius="md">
                                                اختر الطبيب أولاً لعرض المواعيد المتاحة.
                                            </Text>
                                        ) : loadingSlots ? (
                                            <Flex align="center" gap={2} py={2}>
                                                <Spinner size="sm" />
                                                <Text fontSize="sm" color="gray.500">جاري جلب المواعيد...</Text>
                                            </Flex>
                                        ) : availableSlots.length === 0 ? (
                                            <Text fontSize="sm" color="orange.600" bg="orange.50" p={3} borderRadius="md">
                                                لا توجد مواعيد متاحة لهذا اليوم. جرّب تاريخاً آخر أو تأكد من وجود يوم عمل.
                                            </Text>
                                        ) : (
                                            <select
                                                value={confirmTime}
                                                onChange={(e) => setConfirmTime(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    minHeight: '44px',
                                                    padding: '0 12px',
                                                    borderRadius: '8px',
                                                    border: '1px solid #E2E8F0',
                                                    backgroundColor: '#F7FAFC',
                                                    fontSize: '14px',
                                                }}
                                            >
                                                <option value="">— اختر الوقت —</option>
                                                {availableSlots.map((slot) => (
                                                    <option key={slot} value={slot}>
                                                        {slot} ({formatTime12(slot)})
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </Box>
                                </VStack>
                                <Flex gap={3} mt={6}>
                                    <Button
                                        flex={1}
                                        onClick={submitOnlineConfirm}
                                        bg={BRAND.primary}
                                        color="white"
                                        _hover={{ bg: BRAND.primaryMuted }}
                                        loading={submittingConfirm}
                                        disabled={!selectedDoctorId || !confirmDate || !confirmTime || availableSlots.length === 0 || loadingSlots}
                                    >
                                        تأكيد الحجز
                                    </Button>
                                    <Button
                                        flex={1}
                                        variant="outline"
                                        colorPalette="gray"
                                        onClick={() => {
                                            setConfirmOnlineId(null)
                                            setConfirmTime('')
                                            setAvailableSlots([])
                                        }}
                                    >
                                        إلغاء
                                    </Button>
                                </Flex>
                                </Box>
                            </Dialog.Content>
                        </Dialog.Positioner>
                    </Portal>
                </Dialog.Root>

                {/* بعد تأكيد الحجز — تم التأكيد + دور في الطابور فقط */}
                <Dialog.Root open={!!confirmResult} onOpenChange={(e) => !e.open && setConfirmResult(null)}>
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
                                width={{ base: "90%", md: "400px" }}
                                p={6}
                                textAlign="center"
                            >
                                <Box color="green.500" mb={4} display="flex" justifyContent="center">
                                    <CheckCircle2 size={48} />
                                </Box>
                                <Heading size="lg" mb={4} color="gray.800">
                                    تم تأكيد الحجز
                                </Heading>
                                {confirmResult && (
                                    <Text fontSize="md" color="gray.700" mb={6} lineHeight="tall">
                                        دوره في الطابور:{' '}
                                        <strong>
                                            {confirmResult.positionInQueue} من {confirmResult.totalInDay}
                                        </strong>
                                    </Text>
                                )}
                                <Button
                                    w="full"
                                    onClick={() => setConfirmResult(null)}
                                    colorPalette="gray"
                                    variant="outline"
                                >
                                    حسناً
                                </Button>
                            </Dialog.Content>
                        </Dialog.Positioner>
                    </Portal>
                </Dialog.Root>

            </Container>
        </Box>
    )
}
