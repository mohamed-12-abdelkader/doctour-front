'use client'

import {
    Box, Container, Flex, Heading, Text, Input, Table, Badge, IconButton, Button,
    Avatar, MenuRoot, MenuTrigger, MenuContent, MenuItem, Spinner
} from '@chakra-ui/react'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, FileText, ChevronDown, CheckCircle, XCircle, Clock, Calendar } from 'lucide-react'
import { Booking, BookingStatus, ExaminationStatus } from '@/types/booking'
import api from '@/lib/axios'
import { toaster } from '@/components/ui/toaster'

function getIsAdmin(): boolean {
    if (typeof document === 'undefined') return false
    return document.cookie.includes('admin-token=')
}

export default function DoctorAppointments() {
    const router = useRouter()
    const [bookings, setBookings] = useState<Booking[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [examinationFilter, setExaminationFilter] = useState<'all' | ExaminationStatus>('all')
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])
    const [isLoading, setIsLoading] = useState(true)
    const [isAdmin, setIsAdmin] = useState(false)

    const fetchBookings = async () => {
        setIsLoading(true)
        try {
            const params: Record<string, string> = { date: selectedDate }
            const response = await api.get('/bookings/all', { params })
            setBookings(response.data)
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

    useEffect(() => {
        fetchBookings()
    }, [selectedDate])

    useEffect(() => {
        setIsAdmin(getIsAdmin())
    }, [])

    const filteredBookings = useMemo(() => {
        return bookings.filter(b => {
            const matchesSearch = !searchQuery ||
                b.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.customerPhone.includes(searchQuery)
            const matchesFilter = examinationFilter === 'all' || b.examinationStatus === examinationFilter
            return matchesSearch && matchesFilter
        })
    }, [bookings, searchQuery, examinationFilter])

    const handleStatusChange = async (id: number, newStatus: BookingStatus) => {
        try {
            await api.patch(`/bookings/online/${id}/status`, { status: newStatus })
            toaster.create({ title: 'تم تحديث الحالة', type: 'success', duration: 2000 })
            fetchBookings()
        } catch (error: any) {
            toaster.create({
                title: 'خطأ في تحديث الحالة',
                description: error.response?.data?.message || 'حدث خطأ',
                type: 'error',
                duration: 3000,
            })
        }
    }

    const handleExaminationStatusChange = async (id: number, examinationStatus: ExaminationStatus) => {
        try {
            await api.patch(`/bookings/${id}/examination-status`, { examinationStatus })
            toaster.create({ title: 'تم تحديث حالة الكشف', type: 'success', duration: 2000 })
            fetchBookings()
        } catch (error: any) {
            toaster.create({
                title: 'خطأ في تحديث حالة الكشف',
                description: error.response?.data?.message || 'غير مصرح (Admin فقط)',
                type: 'error',
                duration: 3000,
            })
        }
    }

    const formatTime = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    }

    const getRowBg = (examinationStatus?: ExaminationStatus) => {
        if (examinationStatus === 'done') return 'green.50'
        if (examinationStatus === 'waiting') return 'yellow.50'
        return 'white'
    }

    const getExaminationStatusBadge = (examinationStatus?: ExaminationStatus) => {
        if (examinationStatus === 'done') return <Badge colorPalette="green" variant="subtle" px={2} py={1} rounded="full">تم الكشف</Badge>
        if (examinationStatus === 'waiting') return <Badge colorPalette="yellow" variant="subtle" px={2} py={1} rounded="full">انتظار</Badge>
        return <Text fontSize="sm" color="gray.400">—</Text>
    }

    const examinedCount = useMemo(() => bookings.filter(b => b.examinationStatus === 'done').length, [bookings])

    return (
        <Box minH="100vh" bg="#f8f9fa" dir="rtl" fontFamily="var(--font-tajawal)">
            <Container maxW="8xl" py={8}>

                {/* Header */}
                <Flex justify="space-between" align="center" mb={8} flexWrap="wrap" gap={4}>
                    <Box>
                        <Heading size="lg" color="#2d3748" mb={2}>عيادة الدكتورة</Heading>
                        <Text color="gray.500" display="flex" align="center" gap={2}>
                            <Calendar size={16} />
                            {new Date(selectedDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </Text>
                    </Box>
                    <Flex gap={4} align="center">
                        <Input
                            type="date"
                            bg="white"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            size="md"
                            rounded="xl"
                            maxW="200px"
                        />
                        <Box bg="white" p={3} rounded="xl" shadow="sm" display="flex" gap={6}>
                            <Box textAlign="center">
                                <Text fontSize="sm" color="gray.500">حالات اليوم</Text>
                                <Text fontSize="2xl" fontWeight="bold" color="blue.600">{bookings.length}</Text>
                            </Box>
                            <Box w="1px" bg="gray.200" />
                            <Box textAlign="center">
                                <Text fontSize="sm" color="gray.500">تم الكشف</Text>
                                <Text fontSize="2xl" fontWeight="bold" color="green.600">{examinedCount}</Text>
                            </Box>
                        </Box>
                    </Flex>
                </Flex>

                {/* Filters */}
                <Flex gap={4} mb={6} justify="space-between" flexWrap="wrap">
                    <Box position="relative" w={{ base: 'full', md: '400px' }}>
                        <Input
                            placeholder="بحث باسم المريض أو رقم الهاتف..."
                            bg="white"
                            size="lg"
                            rounded="xl"
                            pr={10}
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
                                rounded="lg"
                                size="sm"
                            >
                                {value === 'all' ? 'الكل' : value === 'waiting' ? 'انتظار' : 'تم الكشف'}
                            </Button>
                        ))}
                    </Flex>
                </Flex>

                {/* Main Table */}
                {isLoading ? (
                    <Flex justify="center" align="center" minH="400px">
                        <Spinner size="xl" color="#615b36" />
                    </Flex>
                ) : (
                    <Box bg="white" rounded="2xl" shadow="sm" overflow="hidden">
                        <Table.Root>
                            <Table.Header style={{ backgroundColor: '#f7fafc' }}>
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
                                        <Table.Cell colSpan={5} style={{ padding: '40px', textAlign: 'center' }}>
                                            <Text color="gray.500">لا توجد حجوزات</Text>
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
                                                        size="sm"
                                                        colorPalette="blue"
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
