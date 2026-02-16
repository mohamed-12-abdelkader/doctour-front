'use client'

import {
    Box, Container, Flex, Heading, Text, Button, Badge, Table, IconButton, HStack, Input, SimpleGrid, Icon, Spinner, Dialog, Portal, NativeSelectRoot, NativeSelectField
} from '@chakra-ui/react'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { Booking, BookingStatus } from '@/types/booking'
import { Check, X, Globe, Clock, User, Search, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import api from '@/lib/axios'

const MotionRow = motion(Table.Row)

export default function OnlineBookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>('all')
    const [filterDate, setFilterDate] = useState('')
    const [cancelId, setCancelId] = useState<string | number | null>(null)

    // We can use a toast or just simple alerts. Chakra v3 usually has a toast provider, 
    // but the file didn't have one setup explicitly. We'll use simple alerts or console for errors 
    // to be safe, or just conditional rendering of error states. 
    // Actually, let's keep it simple with console errors for now as the user didn't ask for error UI.

    const fetchBookings = useCallback(async () => {
        setIsLoading(true)
        try {
            const params: any = {}
            if (filterStatus !== 'all') params.status = filterStatus
            if (filterDate) params.date = filterDate

            const response = await api.get('/bookings/online', { params })
            setBookings(response.data)
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
            // Optimistic update
            setBookings(prev => prev.map(b =>
                b.id === id ? { ...b, status: newStatus } : b
            ))

            await api.patch(`/bookings/online/${id}/status`, { status: newStatus })

            // Optionally refresh to ensure data consistency
            // fetchBookings() 
        } catch (error) {
            console.error(`Failed to update booking ${id} to ${newStatus}`, error)
            alert('فشل تحديث حالة الحجز')
            // Revert changes could go here
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

    const formatTime = (booking: Booking) => {
        // @ts-ignore
        if (booking.bookingTime && !booking.bookingTime.includes('T')) return booking.bookingTime;
        // @ts-ignore
        const dateStr = booking.appointmentDate || booking.bookingTime;
        if (!dateStr) return '--:--';
        return new Date(dateStr).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    }

    const formatDate = (booking: Booking) => {
        // @ts-ignore
        const dateStr = booking.appointmentDate || booking.bookingTime;
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('ar-EG');
    }

    return (
        <Box minH="100vh" bg="#f8fafc" dir="rtl" fontFamily="var(--font-tajawal)">
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
                <Flex gap={4} mb={6} flexWrap="wrap">
                    <Box position="relative" flex={1} maxW={{ md: "400px" }}>
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
                    <Box maxW="200px">
                        <Input
                            type="date"
                            bg="white"
                            h="45px"
                            rounded="lg"
                            value={filterDate}
                            onChange={(e) => setFilterDate(e.target.value)}
                        />
                    </Box>
                    <HStack bg="white" p={1} rounded="lg" shadow="sm" border="1px solid" borderColor="gray.100">
                        {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((status) => (
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
                                <Table.ColumnHeader textAlign="right" py={4} fontSize="sm" color="gray.600">توقيت الحجز</Table.ColumnHeader>
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
                                                            {/* Created At or just Date */}
                                                            {formatDate(booking)}
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
                                                <Badge variant="surface" colorPalette="blue" size="sm">
                                                    <HStack gap={1}>
                                                        <Clock size={12} />
                                                        <Text>{formatTime(booking)}</Text>
                                                    </HStack>
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell py={4}>
                                                {getStatusBadge(booking.status)}
                                            </Table.Cell>
                                            <Table.Cell py={4}>
                                                <NativeSelectRoot size="xs" minW="140px">
                                                    <NativeSelectField
                                                        value={booking.status}
                                                        onChange={(e) => handleStatusChange(booking.id, e.target.value as BookingStatus)}
                                                        bg="white"
                                                        borderColor="gray.200"
                                                        rounded="md"
                                                        _focus={{ borderColor: "purple.400" }}
                                                    >
                                                        <option value="pending">قيد الانتظار</option>
                                                        <option value="confirmed">مؤكد</option>
                                                        <option value="cancelled">ملغي</option>
                                                    </NativeSelectField>
                                                </NativeSelectRoot>
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
                                fontFamily="var(--font-tajawal)"
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

            </Container>
        </Box>
    )
}
