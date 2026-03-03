'use client'

import {
    Box, Container, Flex, Heading, Text, Button, Badge, Table, IconButton, HStack, Input, SimpleGrid, Spinner, Dialog, Portal, Card
} from '@chakra-ui/react'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { Booking, BookingStatus } from '@/types/booking'
import { Globe, User, Search, AlertCircle, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '@/lib/axios'

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
    /** معطيات الـ response بعد تأكيد الحجز — لظهور مودال الموعد المتوقع للكشف */
    const [confirmResult, setConfirmResult] = useState<{
        expectedExaminationTime: string
        positionInQueue: number
        totalInDay: number
        workingHours: { start: string; end: string }
        customerName: string
    } | null>(null)

    // We can use a toast or just simple alerts. Chakra v3 usually has a toast provider, 
    // but the file didn't have one setup explicitly. We'll use simple alerts or console for errors 
    // to be safe, or just conditional rendering of error states. 
    // Actually, let's keep it simple with console errors for now as the user didn't ask for error UI.

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

            const response = await api.get('/bookings/online', { params })
            setBookings(Array.isArray(response.data) ? response.data : (response.data?.bookings ?? []))
        } catch (error) {
            console.error('Failed to fetch bookings:', error)
        } finally {
            setIsLoading(false)
        }
    }, [filterStatus, filterDate])

    // Initial fetch and when filters change
    useEffect(() => {
        fetchBookings()
    }, [fetchBookings])

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

    const updateBookingStatus = async (id: string | number, newStatus: BookingStatus) => {
        try {
            const { data } = await api.patch(`/bookings/online/${id}/status`, { status: newStatus })

            // استبدال الحجز بالبيانات المحدثة من الـ API (الـ booking قد يحتوي appointmentDate وغيره)
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

            // عند التأكيد: إظهار مودال الموعد المتوقع للكشف
            if (newStatus === 'confirmed' && data?.expectedExaminationTime != null) {
                setConfirmResult({
                    expectedExaminationTime: data.expectedExaminationTime ?? '',
                    positionInQueue: data.positionInQueue ?? 0,
                    totalInDay: data.totalInDay ?? 0,
                    workingHours: data.workingHours ?? { start: '—', end: '—' },
                    customerName: data.booking?.customerName ?? data.customerName ?? 'العميل',
                })
            }
        } catch (error) {
            console.error(`Failed to update booking ${id} to ${newStatus}`, error)
            alert('فشل تحديث حالة الحجز')
            fetchBookings()
        }
    }

    const handleConfirm = (id: string | number) => updateBookingStatus(id, 'confirmed')

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
            // Show confirmation modal for cancellation
            setCancelId(id);
        } else {
            // Directly update for other statuses
            updateBookingStatus(id, newStatus);
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed': return <Badge colorPalette="green" variant="subtle" px={2} py={1}>مؤكد</Badge>
            case 'completed': return <Badge colorPalette="blue" variant="subtle" px={2} py={1}>مكتمل</Badge>
            case 'cancelled': return <Badge colorPalette="red" variant="subtle" px={2} py={1}>ملغي</Badge>
            case 'pending': return <Badge colorPalette="orange" variant="subtle" px={2} py={1}>قيد الانتظار</Badge>
            default: return <Badge colorPalette="gray">{status}</Badge>
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

    return (
        <Box minH="100vh" bg="#f8fafc" dir="rtl">
            <Container maxW="8xl" py={8}>

                {/* Header & Title */}
                <Flex justify="space-between" align="center" mb={8} flexWrap="wrap" gap={4}>
                    <Box>
                        <Heading size="2xl" color="#1e293b" mb={2} letterSpacing="tight">
                            حجوزات الأونلاين
                        </Heading>
                        {/* @ts-ignore */}
                        <Text color="gray.500" display="flex" align="center" gap={2} fontSize="lg">
                            <Globe size={20} />
                            إدارة طلبات الحجز القادمة من الموقع الإلكتروني
                        </Text>
                    </Box>
                </Flex>

                {/* Stats Cards - Note: These now reflect the FETCHED data */}
                <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap={6} mb={8}>
                    <Box bg="white" p={6} rounded="2xl" shadow="sm" border="1px solid" borderColor="orange.100" position="relative" overflow="hidden">
                        <Box position="absolute" left={0} top={0} w="4px" h="full" bg="orange.400" />
                        <Flex justify="space-between" align="center" mb={2}>
                            <Text color="gray.500" fontWeight="medium">قيد الانتظار</Text>
                            <Box p={2} bg="orange.50" rounded="lg" color="orange.500"><AlertCircle size={20} /></Box>
                        </Flex>
                        <Text fontSize="3xl" fontWeight="bold" color="gray.800">{stats.pending}</Text>
                        <Text fontSize="sm" color="gray.400">طلبات تحتاج مراجعة</Text>
                    </Box>

                    <Box bg="white" p={6} rounded="2xl" shadow="sm" border="1px solid" borderColor="green.100" position="relative" overflow="hidden">
                        <Box position="absolute" left={0} top={0} w="4px" h="full" bg="green.400" />
                        <Flex justify="space-between" align="center" mb={2}>
                            <Text color="gray.500" fontWeight="medium">تم التأكيد</Text>
                            <Box p={2} bg="green.50" rounded="lg" color="green.500"><CheckCircle2 size={20} /></Box>
                        </Flex>
                        <Text fontSize="3xl" fontWeight="bold" color="gray.800">{stats.confirmed}</Text>
                        <Text fontSize="sm" color="gray.400">حجوزات نشطة</Text>
                    </Box>

                    <Box bg="white" p={6} rounded="2xl" shadow="sm" border="1px solid" borderColor="red.100" position="relative" overflow="hidden">
                        <Box position="absolute" left={0} top={0} w="4px" h="full" bg="red.400" />
                        <Flex justify="space-between" align="center" mb={2}>
                            <Text color="gray.500" fontWeight="medium">ملغية</Text>
                            <Box p={2} bg="red.50" rounded="lg" color="red.500"><XCircle size={20} /></Box>
                        </Flex>
                        <Text fontSize="3xl" fontWeight="bold" color="gray.800">{stats.cancelled}</Text>
                        <Text fontSize="sm" color="gray.400">حجوزات مرفوضة</Text>
                    </Box>

                    <Box bg="white" p={6} rounded="2xl" shadow="sm" border="1px solid" borderColor="blue.100" position="relative" overflow="hidden">
                        <Box position="absolute" left={0} top={0} w="4px" h="full" bg="blue.400" />
                        <Flex justify="space-between" align="center" mb={2}>
                            <Text color="gray.500" fontWeight="medium">العدد المعروض</Text>
                            <Box p={2} bg="blue.50" rounded="lg" color="blue.500"><User size={20} /></Box>
                        </Flex>
                        <Text fontSize="3xl" fontWeight="bold" color="gray.800">{stats.total}</Text>
                        <Text fontSize="sm" color="gray.400">بناءً على التصفية</Text>
                    </Box>
                </SimpleGrid>

                {/* Filters & Search */}
                <Flex gap={4} mb={6} flexWrap="wrap" align="flex-start">
                    <Box position="relative" flex={1} minW={{ base: '100%', md: '280px' }} maxW={{ md: "400px" }}>
                        <Input
                            placeholder="بحث باسم المريض أو رقم الهاتف..."
                            bg="white"
                            border="1px solid"
                            borderColor="gray.200"
                            rounded="lg"
                            h="45px"
                            pr={10}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            _focus={{ borderColor: "purple.400", shadow: "0 0 0 1px var(--chakra-colors-purple-400)" }}
                        />
                        <Box position="absolute" right={3} top="50%" transform="translateY(-50%)" color="gray.400">
                            <Search size={18} />
                        </Box>
                    </Box>
                    {/* Calendar picker */}
                    <Card.Root bg="white" shadow="sm" borderRadius="2xl" overflow="hidden" border="1px solid" borderColor="gray.100" flexShrink={0}>
                        <Box bg="linear-gradient(135deg, #6f6a40 0%, #85805a 100%)" px={4} py={2.5}>
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
                                <Box key={d} textAlign="center" py={2.5}>
                                    <Text fontSize="sm" fontWeight="bold" color="#6f6a40">{d}</Text>
                                </Box>
                            ))}
                        </Box>
                        <Box display="grid" gridTemplateColumns="repeat(7,1fr)" p={2} gap={0.5}>
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
                                        h="44px"
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
                                        <Text fontSize="xs" opacity={isSelected ? 0.9 : 0.8} lineHeight={1} mb="1px">{dayNames[date.getDay()]}</Text>
                                        <Text fontSize="sm" lineHeight={1}>{date.getDate()}</Text>
                                    </Box>
                                )
                            })}
                        </Box>
                        {filterDate && (
                            <Box px={3} py={2} bg="gray.50" borderTop="1px solid" borderColor="gray.100">
                                <Text fontSize="xs" color="gray.600" textAlign="center">
                                    المحدد: {new Date(filterDate + "T12:00:00").toLocaleDateString("ar-EG", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                                </Text>
                            </Box>
                        )}
                    </Card.Root>
                    <HStack bg="white" p={1} rounded="lg" shadow="sm" border="1px solid" borderColor="gray.100" flexWrap="wrap">
                        {(['all', 'pending', 'confirmed', 'rejected', 'cancelled'] as const).map((status) => (
                            <Button
                                key={status}
                                size="sm"
                                variant={filterStatus === status ? 'solid' : 'ghost'}
                                colorPalette={filterStatus === status ? 'purple' : 'gray'}
                                onClick={() => setFilterStatus(status)}
                                rounded="md"
                            >
                                {status === 'all' && 'الكل'}
                                {status === 'pending' && 'انتظار'}
                                {status === 'confirmed' && 'مؤكد'}
                                {status === 'rejected' && 'مرفوض'}
                                {status === 'cancelled' && 'ملغي'}
                            </Button>
                        ))}
                    </HStack>
                </Flex>

                {/* Main Table */}
                <Box bg="white" rounded="2xl" shadow="sm" border="1px solid" borderColor="gray.100" overflow="hidden">
                    <Table.Root striped interactive>
                        <Table.Header bg="gray.50">
                            <Table.Row>
                                <Table.ColumnHeader textAlign="right" py={4} fontSize="sm" color="gray.600">المريض</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign="right" py={4} fontSize="sm" color="gray.600">معلومات الاتصال</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign="right" py={4} fontSize="sm" color="gray.600">التاريخ والوقت المفضلنين</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign="right" py={4} fontSize="sm" color="gray.600">الحالة</Table.ColumnHeader>
                                <Table.ColumnHeader textAlign="right" py={4} fontSize="sm" color="gray.600">إجراءات</Table.ColumnHeader>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            <AnimatePresence mode='wait'>
                                {isLoading ? (
                                    <Table.Row>
                                        <Table.Cell colSpan={5} textAlign="center" py={12}>
                                            <Spinner color="purple.500" size="xl" />
                                            <Text mt={4} color="gray.500">جاري تحميل الحجوزات...</Text>
                                        </Table.Cell>
                                    </Table.Row>
                                ) : filteredBookings.length > 0 ? (
                                    filteredBookings.map((booking) => (
                                        <MotionRow
                                            key={booking.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                            _hover={{ bg: "purple.50" }}
                                        >
                                            <Table.Cell py={4}>
                                                <Flex align="center" gap={3}>
                                                    {/* @ts-ignore */}
                                                    <Box bg={booking.type === 'online' ? "purple.100" : "blue.100"} p={2} rounded="xl" color={booking.type === 'online' ? "purple.600" : "blue.600"}>
                                                        <User size={20} />
                                                    </Box>
                                                    <Box>
                                                        <Text fontWeight="bold" color="gray.800">{booking.customerName}</Text>
                                                        <Text fontSize="xs" color="gray.500">
                                                            {booking.createdAt
                                                                ? new Date(booking.createdAt).toLocaleDateString('ar-EG')
                                                                : ''}
                                                        </Text>
                                                    </Box>
                                                </Flex>
                                            </Table.Cell>
                                            <Table.Cell py={4}>
                                                <Box>
                                                    <Text fontSize="sm" fontWeight="medium" color="gray.700" fontFamily="monospace" dir="ltr" textAlign="right">
                                                        {/* @ts-ignore */}
                                                        {booking.customerPhone || booking.phoneNumber || '-'}
                                                    </Text>
                                                        {/* @ts-ignore */}
                                                    {booking.email && <Text fontSize="xs" color="gray.500">{booking.email}</Text>}
                                                </Box>
                                            </Table.Cell>
                                            <Table.Cell py={4}>
                                                <Box>
                                                    <Text fontSize="sm" fontWeight="medium" color={booking.appointmentDate ? 'green.600' : 'orange.500'}>
                                                        {formatPreferredDateTime(booking)}
                                                    </Text>
                                                    {!booking.appointmentDate && (
                                                        <Text fontSize="xs" color="gray.400">بانتظار التأكيد</Text>
                                                    )}
                                                </Box>
                                            </Table.Cell>
                                            <Table.Cell py={4}>
                                                {getStatusBadge(booking.status)}
                                            </Table.Cell>
                                            <Table.Cell py={4}>
                                                <Box as="select"
                                                    value={booking.status}
                                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleStatusChange(booking.id, e.target.value as BookingStatus)}
                                                    style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #E2E8F0', backgroundColor: 'white', fontSize: '13px', minWidth: '130px', cursor: 'pointer' }}
                                                >
                                                    <option value="pending">قيد الانتظار</option>
                                                    <option value="confirmed">مؤكد ✅</option>
                                                    <option value="rejected">مرفوض ❌</option>
                                                    <option value="cancelled">ملغي</option>
                                                </Box>
                                            </Table.Cell>
                                        </MotionRow>
                                    ))
                                ) : (
                                    <Table.Row>
                                        <Table.Cell colSpan={5} textAlign="center" py={12}>
                                            <Box display="flex" flexDirection="column" alignItems="center" gap={3} opacity={0.6}>
                                                <Box p={4} bg="gray.100" rounded="full">
                                                    <Search size={32} color="gray" />
                                                </Box>
                                                <Text color="gray.500">لا توجد طلبات حجز مطابقة للبحث</Text>
                                            </Box>
                                        </Table.Cell>
                                    </Table.Row>
                                )}
                            </AnimatePresence>
                        </Table.Body>
                    </Table.Root>
                </Box>

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
                                    تأكيد الرفض
                                </Heading>
                                <Text color="gray.600" mb={8}>
                                    هل أنت متأكد من أنك تريد رفض هذا الحجز؟ لا يمكن التراجع عن هذا الإجراء
                                </Text>
                                <Flex gap={3}>
                                    <Button
                                        flex={1}
                                        onClick={confirmCancellation}
                                        colorPalette="red"
                                        variant="solid"
                                    >
                                        نعم، رفض الحجز
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

                {/* مودال الموعد المتوقع للكشف بعد تأكيد الحجز */}
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
                                textAlign="right"
                            >
                                <Box color="green.500" mb={4} display="flex" justifyContent="center">
                                    <CheckCircle2 size={48} />
                                </Box>
                                <Heading size="lg" mb={2} color="gray.800">
                                    تم تأكيد الحجز
                                </Heading>
                                {confirmResult && (
                                    <>
                                        <Text color="gray.600" mb={3}>
                                            {confirmResult.customerName}
                                        </Text>
                                        <Box
                                            bg="#6f6a40"
                                            color="white"
                                            p={4}
                                            borderRadius="xl"
                                            mb={4}
                                        >
                                            <Flex align="center" gap={2} mb={2}>
                                                <Clock size={22} />
                                                <Text fontWeight="bold" fontSize="lg">
                                                    الموعد المتوقع للكشف
                                                </Text>
                                            </Flex>
                                            <Text fontSize="2xl" fontWeight="bold" fontFamily="monospace" dir="ltr">
                                                {formatTime12(confirmResult.expectedExaminationTime)}
                                            </Text>
                                        </Box>
                                        <Flex gap={4} flexWrap="wrap" mb={4} fontSize="sm" color="gray.600">
                                            <Text>
                                                ترتيب في الطابور: <strong>{confirmResult.positionInQueue}</strong> من {confirmResult.totalInDay}
                                            </Text>
                                            <Text>
                                                ساعات العمل: <strong dir="ltr">{formatTime12(confirmResult.workingHours.start)}</strong> — <strong dir="ltr">{formatTime12(confirmResult.workingHours.end)}</strong>
                                            </Text>
                                        </Flex>
                                    </>
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
