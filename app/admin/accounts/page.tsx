'use client'

import { useState, useEffect } from 'react'
import {
    Box, Button, Container, Flex, Heading, Table, Text, Badge, IconButton,
    Dialog, Field, Input, Stack, Spinner, Card, Avatar, MenuRoot, MenuTrigger, MenuContent, MenuItem,
} from '@chakra-ui/react'
import {
    Plus, MoreVertical, Edit2, Trash2, Power, ArrowRight, CheckCircle, XCircle, AlertTriangle, Info, X, Users,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import api from '@/lib/axios'

type Permission = 'manage_online_bookings' | 'manage_daily_bookings' | 'manage_accounts'

interface Staff {
    id: number | string
    name: string
    email: string
    role: string
    isActive: boolean
    permissions: { name: string }[] | string[]
}

const ALL_PERMISSIONS: { value: Permission; label: string }[] = [
    { value: 'manage_online_bookings', label: 'إدارة الحجوزات أونلاين' },
    { value: 'manage_daily_bookings', label: 'إدارة حجوزات اليوم' },
    { value: 'manage_accounts', label: 'إدارة الحسابات' },
]

export default function AccountsPage() {
    const router = useRouter()
    const [staffList, setStaffList] = useState<Staff[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null)

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

    const [notification, setNotification] = useState<{
        status: 'success' | 'error' | 'info' | 'warning'
        title: string
        description?: string
    } | null>(null)

    const showNotification = (status: 'success' | 'error' | 'info' | 'warning', title: string, description?: string) => {
        setNotification({ status, title, description })
        setTimeout(() => setNotification(null), 5000)
    }

    const fetchStaff = async () => {
        setIsLoading(true)
        try {
            const res = await api.get('/admin/staff')
            setStaffList(res.data)
        } catch (error) {
            showNotification('error', 'خطأ في جلب البيانات', 'تعذر تحميل قائمة الموظفين.')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchStaff()
    }, [])

    const resetForm = () => {
        setName('')
        setEmail('')
        setPassword('')
        setSelectedPermissions([])
        setEditingStaff(null)
    }

    const handleOpenCreate = () => {
        resetForm()
        setIsDialogOpen(true)
    }

    const handleOpenEdit = (staff: Staff) => {
        setEditingStaff(staff)
        setName(staff.name)
        setEmail(staff.email)
        setPassword('')
        const perms = Array.isArray(staff.permissions)
            ? staff.permissions.map((p: any) => (typeof p === 'string' ? p : p.name))
            : []
        setSelectedPermissions(perms)
        setIsDialogOpen(true)
    }

    const handleCloseDialog = () => setIsDialogOpen(false)

    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            const payload: any = { name, permissions: selectedPermissions }
            if (editingStaff) {
                if (password) payload.password = password
                await api.put(`/admin/staff/${editingStaff.id}`, payload)
                showNotification('success', 'تم تحديث الموظف بنجاح')
            } else {
                payload.email = email
                payload.password = password
                await api.post('/admin/staff', payload)
                showNotification('success', 'تم إنشاء الحساب بنجاح')
            }
            handleCloseDialog()
            fetchStaff()
        } catch (error: any) {
            const msg = error.response?.data?.message || 'فشلت العملية'
            showNotification('error', msg)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleToggleStatus = async (id: number | string, currentStatus: boolean) => {
        try {
            await api.patch(`/admin/staff/${id}/status`, { isActive: !currentStatus })
            showNotification('success', !currentStatus ? 'تم تفعيل الحساب' : 'تم إلغاء التفعيل')
            fetchStaff()
        } catch {
            showNotification('error', 'فشل تحديث الحالة')
        }
    }

    const handleDelete = async (id: number | string) => {
        if (!confirm('هل أنت متأكد من حذف هذا الحساب؟ لا يمكن التراجع.')) return
        try {
            await api.delete(`/admin/staff/${id}`)
            showNotification('success', 'تم حذف الحساب')
            fetchStaff()
        } catch {
            showNotification('error', 'فشل الحذف')
        }
    }

    const handlePermissionChange = (value: string) => {
        if (selectedPermissions.includes(value)) {
            setSelectedPermissions(selectedPermissions.filter((p) => p !== value))
        } else {
            setSelectedPermissions([...selectedPermissions, value])
        }
    }

    const notifBg = notification?.status === 'success' ? 'green.50' : notification?.status === 'error' ? 'red.50' : notification?.status === 'warning' ? 'orange.50' : 'blue.50'
    const notifBorder = notification?.status === 'success' ? 'green.200' : notification?.status === 'error' ? 'red.200' : notification?.status === 'warning' ? 'orange.200' : 'blue.200'
    const NotifIcon = notification?.status === 'success' ? CheckCircle : notification?.status === 'error' ? XCircle : notification?.status === 'warning' ? AlertTriangle : Info

    return (
        <Box minH="100vh" bg="#f0f1f3" dir="rtl" fontFamily="var(--font-tajawal)">
            {/* Header */}
            <Box bg="linear-gradient(135deg, #615b36 0%, #7a7350 50%, #8a8260 100%)" py={8} px={4}>
                <Container maxW="7xl">
                    <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
                        <Flex align="center" gap={4}>
                            <Button
                                variant="ghost"
                                color="white"
                                _hover={{ bg: 'whiteAlpha.200' }}
                                onClick={() => router.push('/admin/dashboard')}
                                size="sm"
                                gap={2}
                            >
                                <ArrowRight size={20} />
                                رجوع
                            </Button>
                            <Box>
                                <Heading size="xl" color="white" fontFamily="var(--font-tajawal)">
                                    إدارة الحسابات
                                </Heading>
                                <Text color="whiteAlpha.900" fontSize="sm" mt={1}>
                                    إضافة وتعديل حسابات الموظفين والصلاحيات
                                </Text>
                            </Box>
                        </Flex>
                        <Button
                            bg="white"
                            color="#615b36"
                            _hover={{ bg: 'whiteAlpha.900' }}
                            onClick={handleOpenCreate}
                            size="sm"
                            gap={2}
                            // @ts-ignore
                            leftIcon={<Plus size={18} />}
                        >
                            إضافة موظف
                        </Button>
                    </Flex>
                </Container>
            </Box>

            <Container maxW="7xl" py={8} mt={-6} position="relative" zIndex={1}>
                {notification && (
                    <Card.Root mb={6} bg={notifBg} border="1px solid" borderColor={notifBorder} borderRadius="xl">
                        <Card.Body py={4} px={5}>
                            <Flex gap={3} align="start">
                                <Box color={notification.status === 'success' ? 'green.600' : notification.status === 'error' ? 'red.600' : notification.status === 'warning' ? 'orange.600' : 'blue.600'} mt={0.5}>
                                    <NotifIcon size={22} />
                                </Box>
                                <Box flex={1}>
                                    <Text fontWeight="bold" color="gray.800">
                                        {notification.title}
                                    </Text>
                                    {notification.description && (
                                        <Text fontSize="sm" color="gray.600" mt={1}>
                                            {notification.description}
                                        </Text>
                                    )}
                                </Box>
                                <IconButton
                                    aria-label="إغلاق"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setNotification(null)}
                                >
                                    <X size={18} />
                                </IconButton>
                            </Flex>
                        </Card.Body>
                    </Card.Root>
                )}

                {/* Stats */}
                <Card.Root mb={6} bg="white" shadow="md" borderRadius="xl" overflow="hidden">
                    <Card.Body py={5} px={6} display="flex" flexDirection="row" alignItems="center" gap={6}>
                        <Box p={3} bg="#fdfbf7" borderRadius="xl">
                            <Users size={28} color="#615b36" />
                        </Box>
                        <Box>
                            <Text fontSize="sm" color="gray.500" fontWeight="medium">
                                عدد الموظفين
                            </Text>
                            <Text fontSize="2xl" fontWeight="bold" color="#615b36">
                                {staffList.length}
                            </Text>
                        </Box>
                    </Card.Body>
                </Card.Root>

                {isLoading ? (
                    <Flex justify="center" align="center" minH="320px" bg="white" borderRadius="xl" shadow="sm">
                        <Spinner size="xl" color="#615b36" />
                    </Flex>
                ) : (
                    <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
                        <Table.Root>
                            <Table.Header bg="#fdfbf7" borderBottom="2px solid" borderColor="gray.100">
                                <Table.Row>
                                    <Table.ColumnHeader py={4} px={5} fontSize="xs" fontWeight="bold" color="gray.600" textTransform="uppercase">
                                        الموظف
                                    </Table.ColumnHeader>
                                    <Table.ColumnHeader py={4} px={5} fontSize="xs" fontWeight="bold" color="gray.600" textTransform="uppercase">
                                        الدور
                                    </Table.ColumnHeader>
                                    <Table.ColumnHeader py={4} px={5} fontSize="xs" fontWeight="bold" color="gray.600" textTransform="uppercase">
                                        الحالة
                                    </Table.ColumnHeader>
                                    <Table.ColumnHeader py={4} px={5} fontSize="xs" fontWeight="bold" color="gray.600" textTransform="uppercase">
                                        الصلاحيات
                                    </Table.ColumnHeader>
                                    <Table.ColumnHeader py={4} px={5} fontSize="xs" fontWeight="bold" color="gray.600" textTransform="uppercase" textAlign="center">
                                        إجراءات
                                    </Table.ColumnHeader>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {staffList.length === 0 ? (
                                    <Table.Row>
                                        <Table.Cell colSpan={5} py={16} textAlign="center">
                                            <Users size={48} color="#e2e8f0" style={{ margin: '0 auto 12px', display: 'block' }} />
                                            <Text color="gray.500" fontSize="md">
                                                لا يوجد موظفون مسجلون
                                            </Text>
                                            <Button mt={4} size="sm" bg="#615b36" color="white" _hover={{ bg: '#4a452a' }} onClick={handleOpenCreate}>
                                                إضافة أول موظف
                                            </Button>
                                        </Table.Cell>
                                    </Table.Row>
                                ) : (
                                    staffList.map((staff) => (
                                        <Table.Row key={staff.id} _hover={{ bg: 'gray.50' }} transition="background 0.15s">
                                            <Table.Cell py={4} px={5}>
                                                <Flex align="center" gap={4}>
                                                    <Avatar.Root size="md" bg="#615b36" flexShrink={0}>
                                                        <Avatar.Fallback color="white" fontWeight="bold" fontSize="lg">
                                                            {staff.name?.charAt(0) || '?'}
                                                        </Avatar.Fallback>
                                                    </Avatar.Root>
                                                    <Box>
                                                        <Text fontWeight="bold" color="#2d3748">
                                                            {staff.name}
                                                        </Text>
                                                        <Text fontSize="sm" color="gray.500">
                                                            {staff.email}
                                                        </Text>
                                                    </Box>
                                                </Flex>
                                            </Table.Cell>
                                            <Table.Cell py={4} px={5}>
                                                <Badge
                                                    colorPalette={staff.role === 'admin' ? 'purple' : 'gray'}
                                                    variant="subtle"
                                                    px={3}
                                                    py={1}
                                                    rounded="full"
                                                >
                                                    {staff.role === 'admin' ? 'مدير' : 'موظف'}
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell py={4} px={5}>
                                                <Badge
                                                    colorPalette={staff.isActive ? 'green' : 'red'}
                                                    variant="subtle"
                                                    px={3}
                                                    py={1}
                                                    rounded="full"
                                                >
                                                    {staff.isActive ? 'نشط' : 'غير نشط'}
                                                </Badge>
                                            </Table.Cell>
                                            <Table.Cell py={4} px={5}>
                                                <Flex gap={2} flexWrap="wrap">
                                                    {Array.isArray(staff.permissions) && staff.permissions.length > 0 ? (
                                                        staff.permissions.map((p: any, idx) => (
                                                            <Badge key={idx} variant="outline" fontSize="xs" colorPalette="blue" px={2} py={0.5} rounded="md">
                                                                {typeof p === 'string' ? p.replace('manage_', '') : p.name?.replace('manage_', '')}
                                                            </Badge>
                                                        ))
                                                    ) : (
                                                        <Text fontSize="sm" color="gray.400">
                                                            —
                                                        </Text>
                                                    )}
                                                </Flex>
                                            </Table.Cell>
                                            <Table.Cell py={4} px={5} textAlign="center">
                                                <MenuRoot>
                                                    <MenuTrigger asChild>
                                                        <IconButton aria-label="خيارات" size="sm" variant="ghost">
                                                            <MoreVertical size={18} />
                                                        </IconButton>
                                                    </MenuTrigger>
                                                    <MenuContent>
                                                        <MenuItem value="edit" onClick={() => handleOpenEdit(staff)}>
                                                            <Edit2 size={16} style={{ marginLeft: 8 }} />
                                                            تعديل
                                                        </MenuItem>
                                                        <MenuItem
                                                            value="status"
                                                            onClick={() => handleToggleStatus(staff.id, staff.isActive)}
                                                            color={staff.isActive ? 'orange.600' : 'green.600'}
                                                        >
                                                            <Power size={16} style={{ marginLeft: 8 }} />
                                                            {staff.isActive ? 'إلغاء التفعيل' : 'تفعيل'}
                                                        </MenuItem>
                                                        <MenuItem value="delete" onClick={() => handleDelete(staff.id)} color="red.600">
                                                            <Trash2 size={16} style={{ marginLeft: 8 }} />
                                                            حذف
                                                        </MenuItem>
                                                    </MenuContent>
                                                </MenuRoot>
                                            </Table.Cell>
                                        </Table.Row>
                                    ))
                                )}
                            </Table.Body>
                        </Table.Root>
                    </Card.Root>
                )}
            </Container>

            {/* Create/Edit Modal */}
            <Dialog.Root open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)} size="md">
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content dir="rtl" fontFamily="var(--font-tajawal)" borderRadius="2xl" overflow="hidden">
                        <Dialog.Header bg="#fdfbf7" borderBottom="1px solid" borderColor="gray.100" py={4} px={6}>
                            <Dialog.Title fontSize="lg" fontWeight="bold" color="#615b36">
                                {editingStaff ? 'تعديل موظف' : 'إضافة موظف جديد'}
                            </Dialog.Title>
                            <Dialog.CloseTrigger />
                        </Dialog.Header>
                        <Dialog.Body p={6}>
                            <Stack gap={4}>
                                <Field.Root required>
                                    <Field.Label>الاسم الكامل</Field.Label>
                                    <Input
                                        placeholder="مثال: د. أحمد"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        bg="gray.50"
                                        borderColor="gray.200"
                                        _focus={{ borderColor: '#615b36', bg: 'white' }}
                                    />
                                </Field.Root>
                                <Field.Root required={!editingStaff}>
                                    <Field.Label>البريد الإلكتروني</Field.Label>
                                    <Input
                                        type="email"
                                        placeholder="email@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        disabled={!!editingStaff}
                                        bg="gray.50"
                                        borderColor="gray.200"
                                        _focus={{ borderColor: '#615b36', bg: 'white' }}
                                    />
                                </Field.Root>
                                <Field.Root required={!editingStaff}>
                                    <Field.Label>{editingStaff ? 'كلمة المرور الجديدة (اختياري)' : 'كلمة المرور'}</Field.Label>
                                    <Input
                                        type="password"
                                        placeholder={editingStaff ? 'اتركها فارغة للإبقاء على الحالية' : '********'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        bg="gray.50"
                                        borderColor="gray.200"
                                        _focus={{ borderColor: '#615b36', bg: 'white' }}
                                    />
                                </Field.Root>
                                <Field.Root>
                                    <Field.Label>الصلاحيات</Field.Label>
                                    <Stack gap={3} border="1px solid" borderColor="gray.200" p={4} borderRadius="xl" bg="gray.50">
                                        {ALL_PERMISSIONS.map((perm) => (
                                            <Flex
                                                key={perm.value}
                                                as="label"
                                                align="center"
                                                gap={3}
                                                cursor="pointer"
                                                p={2}
                                                rounded="lg"
                                                _hover={{ bg: 'white' }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPermissions.includes(perm.value)}
                                                    onChange={() => handlePermissionChange(perm.value)}
                                                    style={{ width: 18, height: 18, accentColor: '#615b36' }}
                                                />
                                                <Text fontSize="sm">{perm.label}</Text>
                                            </Flex>
                                        ))}
                                    </Stack>
                                </Field.Root>
                            </Stack>
                        </Dialog.Body>
                        <Dialog.Footer gap={3} py={4} px={6} borderTop="1px solid" borderColor="gray.100">
                            <Button variant="ghost" onClick={handleCloseDialog}>
                                إلغاء
                            </Button>
                            <Button
                                bg="#615b36"
                                color="white"
                                _hover={{ bg: '#4a452a' }}
                                onClick={handleSubmit}
                                loading={isSubmitting}
                            >
                                {editingStaff ? 'حفظ التغييرات' : 'إنشاء الحساب'}
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Dialog.Root>
        </Box>
    )
}
