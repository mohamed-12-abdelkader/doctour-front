'use client'

import {
    Box, Container, Flex, Heading, Text, Input, Table, Badge, IconButton, Button,
    Avatar, MenuRoot, MenuTrigger, MenuContent, MenuItem, Spinner, Card, SimpleGrid,
} from '@chakra-ui/react'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    Search, FileText, ChevronDown, CheckCircle, XCircle, Clock, Calendar,
    ChevronRight, ChevronLeft, Users, RefreshCw,
} from 'lucide-react'
import { Booking, BookingStatus, ExaminationStatus } from '@/types/booking'
import api from '@/lib/axios'
import { toaster } from '@/components/ui/toaster'

function getIsAdmin(): boolean {
    if (typeof document === 'undefined') return false
    return document.cookie.includes('admin-token=')
}

// ─── Calendar helpers ──────────────────────────────────────────────────────────
const AR_WEEKDAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']
const todayStr = new Date().toISOString().split('T')[0]

function buildCalendarDays(year: number, month: number): (Date | null)[] {
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startOffset = (firstDay.getDay() + 1) % 7
    const days: (Date | null)[] = Array(startOffset).fill(null)
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
    while (days.length % 7 !== 0) days.push(null)
    return days
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DoctorAppointments() {
    const router = useRouter()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [examinationFilter, setExaminationFilter] = useState<'all' | ExaminationStatus>('all')
    const [isLoading, setIsLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    // ── Date range state ──────────────────────────────────────────────────────
    const [rangeStart, setRangeStart] = useState(todayStr)
    const [rangeEnd, setRangeEnd] = useState(todayStr)
    const [calViewDate, setCalViewDate] = useState(() => {
        const d = new Date(); d.setDate(1); return d
    })
    const [pickingEnd, setPickingEnd] = useState(false)
    const [hoverDate, setHoverDate] = useState<string | null>(null)

    const calYear = calViewDate.getFullYear()
    const calMonth = calViewDate.getMonth()
    const calendarDays = useMemo(() => buildCalendarDays(calYear, calMonth), [calYear, calMonth])

    // Live preview range while hovering
    const previewEnd = pickingEnd && hoverDate
        ? (hoverDate < rangeStart ? rangeStart : hoverDate)
        : rangeEnd
    const previewStart = pickingEnd && hoverDate && hoverDate < rangeStart
        ? hoverDate : rangeStart

    const handleDayClick = (dateStr: string) => {
        if (!pickingEnd) {
            setRangeStart(dateStr); setRangeEnd(dateStr); setPickingEnd(true)
        } else {
            const [s, e] = dateStr < rangeStart ? [dateStr, rangeStart] : [rangeStart, dateStr]
            setRangeStart(s); setRangeEnd(e)
            setPickingEnd(false); setHoverDate(null)
        }
    }

    const resetToToday = () => {
        setRangeStart(todayStr); setRangeEnd(todayStr)
        setPickingEnd(false); setHoverDate(null)
        setCalViewDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    }

    // ── API ───────────────────────────────────────────────────────────────────
    const fetchBookings = async () => {
        setIsLoading(true)
        try {
            const params: Record<string, string> = {
                startDate: rangeStart,
                endDate: rangeEnd,
            }
            if (rangeStart === rangeEnd) params.date = rangeStart
            const response = await api.get('/bookings/all', { params })
            const data = response.data
            setBookings(Array.isArray(data) ? data : (data?.bookings ?? []))
        } catch (error: any) {
            toaster.create({
                title: 'خطأ في جلب البيانات',
                description: error.response?.data?.message || 'حدث خطأ أثناء جلب الحجوزات',
                type: 'error',
                duration: 3000,
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => { fetchBookings() }, [rangeStart, rangeEnd])
    useEffect(() => { setIsAdmin(getIsAdmin()) }, [])

    // ── Filtered data ─────────────────────────────────────────────────────────
    const filteredBookings = useMemo(() => {
        return bookings.filter(b => {
            const matchesSearch = !searchQuery ||
                b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.customerPhone.includes(searchQuery)
            const matchesFilter = examinationFilter === 'all' || b.examinationStatus === examinationFilter
            return matchesSearch && matchesFilter
        })
    }, [bookings, searchQuery, examinationFilter])

    const examinedCount = useMemo(() => bookings.filter(b => b.examinationStatus === 'done').length, [bookings])

    // ── Actions ───────────────────────────────────────────────────────────────
    const handleStatusChange = async (id: number, newStatus: BookingStatus) => {
        try {
            await api.patch(`/bookings/online/${id}/status`, { status: newStatus })
            toaster.create({ title: 'تم تحديث الحالة', type: 'success', duration: 2000 })
            fetchBookings()
        } catch (error: any) {
            toaster.create({ title: 'خطأ في تحديث الحالة', description: error.response?.data?.message || 'حدث خطأ', type: 'error', duration: 3000 })
        }
    }

    const handleExaminationStatusChange = async (id: number, examinationStatus: ExaminationStatus) => {
        try {
            await api.patch(`/bookings/${id}/examination-status`, { examinationStatus })
            toaster.create({ title: 'تم تحديث حالة الكشف', type: 'success', duration: 2000 })
            fetchBookings()
        } catch (error: any) {
            toaster.create({ title: 'خطأ في تحديث حالة الكشف', description: error.response?.data?.message || 'غير مصرح', type: 'error', duration: 3000 })
        }
    }

    const formatTime = (dateString: string) =>
        new Date(dateString).toLocaleTimeString('ar-EG', { hour: 'numeric', minute: '2-digit', hour12: true })

    const getRowBg = (s?: ExaminationStatus) =>
        s === 'done' ? 'green.50' : s === 'waiting' ? 'yellow.50' : 'white'

    const getExaminationStatusBadge = (s?: ExaminationStatus) => {
        if (s === 'done') return <Badge colorPalette="green" variant="subtle" px={2} py={1} rounded="full">تم الكشف</Badge>
        if (s === 'waiting') return <Badge colorPalette="yellow" variant="subtle" px={2} py={1} rounded="full">انتظار</Badge>
        return <Text fontSize="sm" color="gray.400">—</Text>
    }

    const dateLabel = rangeStart === rangeEnd
        ? new Date(rangeStart + 'T00:00:00').toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : `${new Date(rangeStart + 'T00:00:00').toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })} — ${new Date(rangeEnd + 'T00:00:00').toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}`

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Box minH="100vh" bg="#f8f9fa" dir="rtl">
            <Container maxW="8xl" py={8}>

                {/* ── Page Header ── */}
                <Flex justify="space-between" align="center" mb={6} flexWrap="wrap" gap={4}>
                    <Box>
                        <Heading size="lg" color="#2d3748" mb={1}>عيادة الدكتورة</Heading>
                        <Flex align="center" gap={2} color="gray.500" fontSize="sm">
                            <Calendar size={15} />
                            <Text>{dateLabel}</Text>
                        </Flex>
                    </Box>

                    {/* Stats + Refresh */}
                    <Flex gap={3} align="center">
                        <Button
                            variant="ghost" colorPalette="gray" size="sm"
                            onClick={fetchBookings} loading={isLoading}
                        >
                            <RefreshCw size={16} style={{ marginLeft: 6 }} />
                            تحديث
                        </Button>
                        <Box bg="white" px={5} py={3} rounded="xl" shadow="sm" display="flex" gap={6}>
                            <Box textAlign="center">
                                <Text fontSize="xs" color="gray.500">الحجوزات</Text>
                                <Text fontSize="2xl" fontWeight="bold" color="#615b36">{bookings.length}</Text>
                            </Box>
                            <Box w="1px" bg="gray.200" />
                            <Box textAlign="center">
                                <Text fontSize="xs" color="gray.500">تم الكشف</Text>
                                <Text fontSize="2xl" fontWeight="bold" color="green.600">{examinedCount}</Text>
                            </Box>
                        </Box>
                    </Flex>
                </Flex>

                {/* ── Calendar Picker ── */}
                <Card.Root
                    bg="white" shadow="sm" borderRadius="2xl" mb={5} overflow="hidden"
                    onMouseLeave={() => { if (pickingEnd) setHoverDate(null) }}
                >
                    {/* Header */}
                    <Box bg="linear-gradient(135deg, #615b36 0%, #7a7350 100%)" px={3} py={2}>
                        <Flex align="center" justify="space-between">
                            <IconButton
                                aria-label="الشهر السابق" size="xs" variant="ghost"
                                color="white" _hover={{ bg: 'whiteAlpha.200' }}
                                onClick={() => setCalViewDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                            ><ChevronRight size={14} /></IconButton>

                            <Flex align="center" gap={2}>
                                <Text fontWeight="bold" color="white" fontSize="sm">
                                    {calViewDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
                                </Text>
                                <Button
                                    size="xs" variant="outline" color="white"
                                    borderColor="whiteAlpha.500" _hover={{ bg: 'whiteAlpha.200' }}
                                    onClick={resetToToday} borderRadius="full" px={2} py={1} minH="auto" fontSize="xs"
                                >اليوم</Button>
                            </Flex>

                            <IconButton
                                aria-label="الشهر التالي" size="xs" variant="ghost"
                                color="white" _hover={{ bg: 'whiteAlpha.200' }}
                                onClick={() => setCalViewDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                            ><ChevronLeft size={14} /></IconButton>
                        </Flex>
                    </Box>

                    {/* Weekday labels */}
                    <Box display="grid" gridTemplateColumns="repeat(7,1fr)" bg="#fdfbf7" borderBottom="1px solid" borderColor="#e8e0c8">
                        {AR_WEEKDAYS.map(d => (
                            <Box key={d} textAlign="center" py={1.5}>
                                <Text fontSize="xs" fontWeight="bold" color="#615b36">{d}</Text>
                            </Box>
                        ))}
                    </Box>

                    {/* Days grid */}
                    <Box
                        display="grid" gridTemplateColumns="repeat(7,1fr)" p={2} gap={0.5}
                        cursor={pickingEnd ? 'crosshair' : 'default'}
                    >
                        {calendarDays.map((date, idx) => {
                            if (!date) return <Box key={`empty-${idx}`} />
                            const dateStr = date.toISOString().split('T')[0]
                            const isToday = dateStr === todayStr
                            const isStart = dateStr === previewStart
                            const isEnd = dateStr === previewEnd
                            const isSingleDay = previewStart === previewEnd
                            const inRange = !isSingleDay && dateStr > previewStart && dateStr < previewEnd
                            const isEdge = isStart || isEnd

                            return (
                                <Box
                                    key={dateStr}
                                    onClick={() => handleDayClick(dateStr)}
                                    onMouseEnter={() => { if (pickingEnd) setHoverDate(dateStr) }}
                                    cursor="pointer"
                                    display="flex" flexDirection="column"
                                    alignItems="center" justifyContent="center"
                                    h="36px" borderRadius="md" position="relative"
                                    transition="all 0.05s" userSelect="none"
                                    bg={isEdge ? '#615b36' : inRange ? '#f0ebe0' : 'transparent'}
                                    _hover={{ bg: isEdge ? '#4a452a' : pickingEnd ? '#e8e0cc' : '#f0ebe0', transform: 'scale(1.08)' }}
                                >
                                    {isToday && !isEdge && (
                                        <Box
                                            position="absolute" inset="1px" borderRadius="md"
                                            border="1.5px solid" borderColor="#c9b97a" pointerEvents="none"
                                        />
                                    )}
                                    <Text
                                        fontSize="xs" lineHeight={1}
                                        fontWeight={isEdge || isToday ? 'bold' : 'normal'}
                                        color={isEdge ? 'white' : isToday ? '#615b36' : inRange ? '#4a3f28' : 'gray.700'}
                                    >
                                        {date.getDate()}
                                    </Text>
                                    {isStart && !isSingleDay && (
                                        <Text fontSize="8px" color="whiteAlpha.800" mt="2px" lineHeight={1}>بداية</Text>
                                    )}
                                    {isEnd && !isSingleDay && (
                                        <Text fontSize="8px" color="whiteAlpha.800" mt="2px" lineHeight={1}>
                                            {pickingEnd ? '•' : 'نهاية'}
                                        </Text>
                                    )}
                                </Box>
                            )
                        })}
                    </Box>

                    {/* Footer */}
                    <Box px={3} py={2} bg="gray.50" borderTop="1px solid" borderColor="gray.100">
                        <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
                            <Text
                                fontSize="xs"
                                color={pickingEnd ? '#615b36' : 'gray.400'}
                                fontWeight={pickingEnd ? 'bold' : 'normal'}
                            >
                                {pickingEnd
                                    ? '✉️ انقل الماوس واضغط على يوم لتحديد نهاية المدة'
                                    : 'اضغط واحدة ليوم واحد • اضغط مرتين لتحديد مدة'
                                }
                            </Text>
                            <Flex gap={2} align="center">
                                {rangeStart !== rangeEnd && (
                                    <Text fontSize="xs" fontWeight="bold" color="#615b36">
                                        {new Date(rangeStart + 'T00:00:00').toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                                        {' — '}
                                        {new Date(rangeEnd + 'T00:00:00').toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </Text>
                                )}
                                {(rangeStart !== rangeEnd || pickingEnd) && (
                                    <Button size="xs" variant="ghost" colorPalette="gray" onClick={resetToToday}>
                                        إلغاء
                                    </Button>
                                )}
                            </Flex>
                        </Flex>
                    </Box>
                </Card.Root>

                {/* ── Filters ── */}
                <Flex gap={4} mb={5} justify="space-between" flexWrap="wrap">
                    <Box position="relative" w={{ base: 'full', md: '400px' }}>
                        <Input
                            placeholder="بحث باسم المريض أو رقم الهاتف..."
                            bg="white" size="lg" rounded="xl" pr={10}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Box position="absolute" right={3} top="50%" transform="translateY(-50%)" color="gray.400">
                            <Search size={20} />
                        </Box>
                    </Box>

                    <Flex gap={2} bg="white" p={1} rounded="xl" shadow="sm">
                        {(['all', 'waiting', 'done'] as const).map(value => (
                            <Button
                                key={value}
                                variant={examinationFilter === value ? 'solid' : 'ghost'}
                                colorPalette={value === 'all' ? 'gray' : value === 'waiting' ? 'yellow' : 'green'}
                                onClick={() => setExaminationFilter(value)}
                                rounded="lg" size="sm"
                            >
                                {value === 'all' ? 'الكل' : value === 'waiting' ? 'انتظار' : 'تم الكشف'}
                            </Button>
                        ))}
                    </Flex>
                </Flex>

                {/* ── Table ── */}
                {isLoading ? (
                    <Flex justify="center" align="center" minH="300px">
                        <Spinner size="xl" color="#615b36" />
                    </Flex>
                ) : (
                    <Box bg="white" rounded="2xl" shadow="sm" overflow="hidden">
                        <Table.Root>
                            <Table.Header style={{ backgroundColor: '#fdfbf7' }}>
                                <Table.Row>
                                    <Table.ColumnHeader style={{ padding: '16px', textAlign: 'right' }}>المريض</Table.ColumnHeader>
                                    <Table.ColumnHeader style={{ padding: '16px', textAlign: 'right' }}>وقت الحجز</Table.ColumnHeader>
                                    <Table.ColumnHeader style={{ padding: '16px', textAlign: 'right' }}>نوع الكشف</Table.ColumnHeader>
                                    <Table.ColumnHeader style={{ padding: '16px', textAlign: 'right' }}>حالة الكشف</Table.ColumnHeader>
                                    <Table.ColumnHeader style={{ padding: '16px', textAlign: 'right' }}>إجراءات</Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {filteredBookings.length === 0 ? (
                                    <Table.Row>
                                        <Table.Cell colSpan={5} style={{ padding: '60px', textAlign: 'center' }}>
                                            <Flex direction="column" align="center" gap={2}>
                                                <Calendar size={40} color="#e2e8f0" />
                                                <Text color="gray.500" fontWeight="medium">لا توجد حجوزات في هذه الفترة</Text>
                                                <Text color="gray.400" fontSize="sm">اختر يوماً أو فترة مختلفة من التقويم أعلاه</Text>
                                            </Flex>
                                        </Table.Cell>
                                    </Table.Row>
                                ) : (
                                    filteredBookings.map((booking) => (
                                        <Table.Row
                                            key={booking.id}
                                            style={{ borderBottom: '1px solid #edf2f7', background: getRowBg(booking.examinationStatus) }}
                                        >
                                            <Table.Cell style={{ padding: '16px' }}>
                                                <Flex align="center" gap={3}>
                                                    <Avatar.Root size="sm" colorPalette={booking.examinationStatus === 'done' ? 'green' : 'blue'}>
                                                        <Avatar.Fallback name={booking.customerName} />
                                                    </Avatar.Root>
                                                    <Box>
                                                        <Text fontWeight="bold">{booking.customerName}</Text>
                                                        <Text fontSize="xs" color="gray.500">{booking.customerPhone}</Text>
                                                    </Box>
                                                </Flex>
                                            </Table.Cell>
                                            <Table.Cell style={{ padding: '16px' }}>
                                                <Flex align="center" gap={2} color="gray.600">
                                                    <Clock size={16} />
                                                    <Text fontWeight="medium">{formatTime(booking.appointmentDate)}</Text>
                                                </Flex>
                                            </Table.Cell>
                                            <Table.Cell style={{ padding: '16px' }}>
                                                <Badge colorPalette={booking.bookingType === 'online' ? 'purple' : 'blue'}>
                                                    {booking.bookingType === 'online' ? 'أونلاين' : 'عيادة'}
                                                </Badge>
                                                {booking.visitType && (
                                                    <Text as="span" fontSize="xs" color="gray.500" mr={2}>
                                                        ({booking.visitType === 'checkup' ? 'كشف' : 'إعادة'})
                                                    </Text>
                                                )}
                                            </Table.Cell>
                                            <Table.Cell style={{ padding: '16px' }}>
                                                <Flex align="center" gap={2}>
                                                    {getExaminationStatusBadge(booking.examinationStatus)}
                                                    {isAdmin && (
                                                        <MenuRoot>
                                                            <MenuTrigger asChild>
                                                                <IconButton aria-label="تغيير حالة الكشف" size="xs" variant="ghost" colorPalette="gray">
                                                                    <ChevronDown size={14} />
                                                                </IconButton>
                                                            </MenuTrigger>
                                                            <MenuContent>
                                                                <MenuItem onClick={() => handleExaminationStatusChange(booking.id, 'waiting')} value="waiting">
                                                                    <Clock size={14} /> انتظار
                                                                </MenuItem>
                                                                <MenuItem onClick={() => handleExaminationStatusChange(booking.id, 'done')} value="done" color="green.500">
                                                                    <CheckCircle size={14} /> تم الكشف
                                                                </MenuItem>
                                                            </MenuContent>
                                                        </MenuRoot>
                                                    )}
                                                </Flex>
                                            </Table.Cell>
                                            <Table.Cell style={{ padding: '16px' }}>
                                                <Flex gap={2}>
                                                    <Button
                                                        size="sm" colorPalette="blue"
                                                        onClick={() => router.push(`/patient-history/${booking.id}`)}
                                                    >
                                                        <FileText size={16} />
                                                        فتح الملف
                                                    </Button>
                                                    {booking.bookingType === 'online' && (
                                                        <MenuRoot>
                                                            <MenuTrigger asChild>
                                                                <IconButton aria-label="Status" size="sm" variant="ghost">
                                                                    <ChevronDown size={16} />
                                                                </IconButton>
                                                            </MenuTrigger>
                                                            <MenuContent>
                                                                <MenuItem onClick={() => handleStatusChange(booking.id, 'pending')} value="pending">
                                                                    <Clock size={16} /> قيد الانتظار
                                                                </MenuItem>
                                                                <MenuItem onClick={() => handleStatusChange(booking.id, 'confirmed')} value="confirmed" color="green.500">
                                                                    <CheckCircle size={16} /> تم الكشف
                                                                </MenuItem>
                                                                <MenuItem onClick={() => handleStatusChange(booking.id, 'cancelled')} value="cancelled" color="red.500">
                                                                    <XCircle size={16} /> إلغاء الموعد
                                                                </MenuItem>
                                                                <MenuItem onClick={() => handleStatusChange(booking.id, 'rejected')} value="rejected" color="red.500">
                                                                    <XCircle size={16} /> رفض
                                                                </MenuItem>
                                                            </MenuContent>
                                                        </MenuRoot>
                                                    )}
                                                </Flex>
                                            </Table.Cell>
                                        </Table.Row>
                                    ))
                                )}
                            </Table.Body>
                        </Table.Root>
                    </Box>
                )}
            </Container>
        </Box>
    )
}
