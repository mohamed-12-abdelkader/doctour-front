'use client'

import {
    Box, Container, Flex, Heading, Text, Button, Input, SimpleGrid, Card, Stack,
    Dialog, useDisclosure, Spinner, Table, HStack, Field, Textarea
} from '@chakra-ui/react'
import { useState, useEffect } from 'react'
import { Plus, Calendar, Wallet, TrendingUp, TrendingDown, DollarSign, FileText, Receipt } from 'lucide-react'
import {
    BookingsIncomeResponse,
    ManualIncomeResponse,
    ExpensesResponse,
    AccountsSummaryResponse,
    AddIncomeBody,
    AddExpenseBody,
} from '@/types/accounts'
import api from '@/lib/axios'
import { toaster } from '@/components/ui/toaster'

function getCurrentMonth(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function MonthlyAccountsPage() {
    const [month, setMonth] = useState<string>(getCurrentMonth())
    const [summary, setSummary] = useState<AccountsSummaryResponse | null>(null)
    const [bookingsIncome, setBookingsIncome] = useState<BookingsIncomeResponse | null>(null)
    const [manualIncome, setManualIncome] = useState<ManualIncomeResponse | null>(null)
    const [expenses, setExpenses] = useState<ExpensesResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [incomeSaving, setIncomeSaving] = useState(false)
    const [expenseSaving, setExpenseSaving] = useState(false)

    const { open: isIncomeOpen, onOpen: onIncomeOpen, onClose: onIncomeClose } = useDisclosure()
    const { open: isExpenseOpen, onOpen: onExpenseOpen, onClose: onExpenseClose } = useDisclosure()

    const [incomeForm, setIncomeForm] = useState<AddIncomeBody>({
        description: '',
        amount: 0,
        entryDate: new Date().toISOString().split('T')[0],
    })
    const [expenseForm, setExpenseForm] = useState<AddExpenseBody>({
        description: '',
        amount: 0,
        expenseDate: new Date().toISOString().split('T')[0],
        notes: '',
    })

    const fetchAll = async () => {
        if (!month) return
        setIsLoading(true)
        try {
            const params = { month }
            const [summaryRes, bookingsRes, manualRes, expensesRes] = await Promise.all([
                api.get<AccountsSummaryResponse>('/accounts/summary', { params }),
                api.get<BookingsIncomeResponse>('/accounts/income/bookings', { params }),
                api.get<ManualIncomeResponse>('/accounts/income/manual', { params }),
                api.get<ExpensesResponse>('/accounts/expenses', { params }),
            ])
            setSummary(summaryRes.data)
            setBookingsIncome(bookingsRes.data)
            setManualIncome(manualRes.data)
            setExpenses(expensesRes.data)
        } catch (error: any) {
            toaster.create({
                title: 'خطأ في جلب البيانات',
                description: error.response?.data?.message || 'حدث خطأ أثناء جلب الحسابات',
                type: 'error',
                duration: 3000,
            })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchAll()
    }, [month])

    const handleAddIncome = async () => {
        if (!incomeForm.description?.trim() || incomeForm.amount <= 0) {
            toaster.create({ title: 'أدخل الوصف والمبلغ', type: 'warning', duration: 2000 })
            return
        }
        setIncomeSaving(true)
        try {
            await api.post('/accounts/income', {
                description: incomeForm.description.trim(),
                amount: incomeForm.amount,
                entryDate: incomeForm.entryDate || undefined,
            })
            toaster.create({ title: 'تم إضافة الدخل بنجاح', type: 'success', duration: 2000 })
            onIncomeClose()
            setIncomeForm({ description: '', amount: 0, entryDate: new Date().toISOString().split('T')[0] })
            fetchAll()
        } catch (error: any) {
            toaster.create({
                title: 'خطأ في إضافة الدخل',
                description: error.response?.data?.message || 'حدث خطأ',
                type: 'error',
                duration: 3000,
            })
        } finally {
            setIncomeSaving(false)
        }
    }

    const handleAddExpense = async () => {
        if (!expenseForm.description?.trim() || expenseForm.amount <= 0) {
            toaster.create({ title: 'أدخل الوصف والمبلغ', type: 'warning', duration: 2000 })
            return
        }
        setExpenseSaving(true)
        try {
            await api.post('/accounts/expenses', {
                description: expenseForm.description.trim(),
                amount: expenseForm.amount,
                expenseDate: expenseForm.expenseDate || undefined,
                notes: expenseForm.notes?.trim() || undefined,
            })
            toaster.create({ title: 'تم إضافة المصروف بنجاح', type: 'success', duration: 2000 })
            onExpenseClose()
            setExpenseForm({ description: '', amount: 0, expenseDate: new Date().toISOString().split('T')[0], notes: '' })
            fetchAll()
        } catch (error: any) {
            toaster.create({
                title: 'خطأ في إضافة المصروف',
                description: error.response?.data?.message || 'حدث خطأ',
                type: 'error',
                duration: 3000,
            })
        } finally {
            setExpenseSaving(false)
        }
    }

    const formatAmount = (n: number | string | null | undefined) => (typeof n === 'number' ? n : parseFloat(String(n ?? 0)) || 0).toFixed(2)
    const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })

    const monthLabel = month
        ? new Date(month + '-01').toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
        : '—'

    return (
        <Box minH="100vh" bg="#f0f1f3" dir="rtl" fontFamily="var(--font-tajawal)">
            {/* Header */}
            <Box bg="linear-gradient(135deg, #615b36 0%, #7a7350 50%, #8a8260 100%)" py={8} px={4}>
                <Container maxW="6xl">
                    <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
                        <Box>
                            <Heading size="xl" color="white" mb={1} fontFamily="var(--font-tajawal)">
                                الحسابات الشهرية
                            </Heading>
                            <Flex align="center" gap={2} color="whiteAlpha.900" fontSize="md">
                                <Calendar size={18} />
                                <Text>تقرير شهر {monthLabel}</Text>
                            </Flex>
                        </Box>
                        <HStack gap={3}>
                            <Input
                                type="month"
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                bg="whiteAlpha.200"
                                border="1px solid"
                                borderColor="whiteAlpha.300"
                                color="white"
                                maxW="180px"
                                _placeholder={{ color: 'whiteAlpha.700' }}
                            />
                        </HStack>
                    </Flex>
                </Container>
            </Box>

            <Container maxW="6xl" py={8} mt={-6} position="relative" zIndex={1}>
                {isLoading ? (
                    <Flex justify="center" align="center" minH="400px">
                        <Spinner size="xl" color="#615b36" />
                    </Flex>
                ) : (
                    <>
                        {/* Summary Cards */}
                        {summary && (
                            <SimpleGrid columns={{ base: 1, sm: 2, lg: 5 }} gap={4} mb={8}>
                                <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
                                    <Card.Body p={5} display="flex" flexDirection="row" alignItems="center" gap={4}>
                                        <Box p={3} bg="green.50" borderRadius="xl">
                                            <TrendingUp size={24} color="#2d6a4f" />
                                        </Box>
                                        <Box>
                                            <Text fontSize="xs" color="gray.500" fontWeight="medium">دخل الحجوزات</Text>
                                            <Text fontSize="xl" fontWeight="bold" color="#2d6a4f">{formatAmount(summary.incomeFromBookings)} EGP</Text>
                                        </Box>
                                    </Card.Body>
                                </Card.Root>
                                <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
                                    <Card.Body p={5} display="flex" flexDirection="row" alignItems="center" gap={4}>
                                        <Box p={3} bg="blue.50" borderRadius="xl">
                                            <DollarSign size={24} color="#2b6cb0" />
                                        </Box>
                                        <Box>
                                            <Text fontSize="xs" color="gray.500" fontWeight="medium">الدخل اليدوي</Text>
                                            <Text fontSize="xl" fontWeight="bold" color="#2b6cb0">{formatAmount(summary.manualIncome)} EGP</Text>
                                        </Box>
                                    </Card.Body>
                                </Card.Root>
                                <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
                                    <Card.Body p={5} display="flex" flexDirection="row" alignItems="center" gap={4}>
                                        <Box p={3} bg="green.50" borderRadius="xl">
                                            <TrendingUp size={24} color="#2d6a4f" />
                                        </Box>
                                        <Box>
                                            <Text fontSize="xs" color="gray.500" fontWeight="medium">إجمالي الدخل</Text>
                                            <Text fontSize="xl" fontWeight="bold" color="#2d6a4f">{formatAmount(summary.totalIncome)} EGP</Text>
                                        </Box>
                                    </Card.Body>
                                </Card.Root>
                                <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
                                    <Card.Body p={5} display="flex" flexDirection="row" alignItems="center" gap={4}>
                                        <Box p={3} bg="red.50" borderRadius="xl">
                                            <TrendingDown size={24} color="#c53030" />
                                        </Box>
                                        <Box>
                                            <Text fontSize="xs" color="gray.500" fontWeight="medium">إجمالي المصروفات</Text>
                                            <Text fontSize="xl" fontWeight="bold" color="#c53030">{formatAmount(summary.totalExpenses)} EGP</Text>
                                        </Box>
                                    </Card.Body>
                                </Card.Root>
                                <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
                                    <Card.Body p={5} display="flex" flexDirection="row" alignItems="center" gap={4}>
                                        <Box p={3} bg="#fdfbf7" borderRadius="xl">
                                            <Wallet size={24} color="#615b36" />
                                        </Box>
                                        <Box>
                                            <Text fontSize="xs" color="gray.500" fontWeight="medium">الرصيد</Text>
                                            <Text fontSize="xl" fontWeight="bold" color={summary.balance >= 0 ? '#615b36' : '#c53030'}>
                                                {formatAmount(summary.balance)} EGP
                                            </Text>
                                        </Box>
                                    </Card.Body>
                                </Card.Root>
                            </SimpleGrid>
                        )}

                        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={8}>
                            {/* دخل الحجوزات */}
                            <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
                                <Card.Header bg="#fdfbf7" borderBottom="1px solid" borderColor="gray.100" py={4} px={5}>
                                    <Heading size="md" color="#615b36" display="flex" alignItems="center" gap={2}>
                                        <Receipt size={20} />
                                        دخل الحجوزات (تجميع بالعميل)
                                    </Heading>
                                </Card.Header>
                                <Card.Body p={5}>
                                    {bookingsIncome && bookingsIncome.byCustomer?.length > 0 ? (
                                        <>
                                            <Box overflowX="auto" mb={4}>
                                                <Table.Root size="sm">
                                                    <Table.Header bg="gray.50">
                                                        <Table.Row>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">العميل</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">المبلغ</Table.ColumnHeader>
                                                        </Table.Row>
                                                    </Table.Header>
                                                    <Table.Body>
                                                        {bookingsIncome.byCustomer.map((row, i) => (
                                                            <Table.Row key={i}>
                                                                <Table.Cell py={3} px={3}>{row.customerName}</Table.Cell>
                                                                <Table.Cell py={3} px={3} fontWeight="bold" color="#615b36">{formatAmount(row.amount)} EGP</Table.Cell>
                                                            </Table.Row>
                                                        ))}
                                                    </Table.Body>
                                                </Table.Root>
                                            </Box>
                                            <Flex justify="space-between" align="center" pt={3} borderTop="2px solid" borderColor="gray.100">
                                                <Text fontWeight="bold" color="gray.700">الإجمالي</Text>
                                                <Text fontWeight="bold" fontSize="lg" color="#615b36">{formatAmount(bookingsIncome.total)} EGP</Text>
                                            </Flex>
                                        </>
                                    ) : (
                                        <Box py={10} textAlign="center">
                                            <Receipt size={40} color="#e2e8f0" style={{ margin: '0 auto 8px' }} />
                                            <Text color="gray.500" fontSize="sm">لا يوجد دخل حجوزات لهذا الشهر</Text>
                                        </Box>
                                    )}
                                </Card.Body>
                            </Card.Root>

                            {/* الدخل اليدوي */}
                            <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden">
                                <Card.Header bg="#fdfbf7" borderBottom="1px solid" borderColor="gray.100" py={4} px={5}>
                                    <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
                                        <Heading size="md" color="#615b36" display="flex" alignItems="center" gap={2}>
                                            <DollarSign size={20} />
                                            الدخل اليدوي
                                        </Heading>
                                        {/* @ts-ignore */}
                                        <Button size="sm" bg="#615b36" color="white" _hover={{ bg: '#4a452a' }} onClick={onIncomeOpen} leftIcon={<Plus size={16} />}>
                                            إضافة دخل
                                        </Button>
                                    </Flex>
                                </Card.Header>
                                <Card.Body p={5}>
                                    {manualIncome && manualIncome.entries?.length > 0 ? (
                                        <>
                                            <Box overflowX="auto" mb={4}>
                                                <Table.Root size="sm">
                                                    <Table.Header bg="gray.50">
                                                        <Table.Row>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">الوصف</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">التاريخ</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">المبلغ</Table.ColumnHeader>
                                                        </Table.Row>
                                                    </Table.Header>
                                                    <Table.Body>
                                                        {manualIncome.entries.map((entry, i) => (
                                                            <Table.Row key={entry.id ?? i}>
                                                                <Table.Cell py={3} px={3}>{entry.description}</Table.Cell>
                                                                <Table.Cell py={3} px={3} color="gray.600" fontSize="sm">{formatDate(entry.entryDate)}</Table.Cell>
                                                                <Table.Cell py={3} px={3} fontWeight="bold" color="green.600">{formatAmount(entry.amount)} EGP</Table.Cell>
                                                            </Table.Row>
                                                        ))}
                                                    </Table.Body>
                                                </Table.Root>
                                            </Box>
                                            <Flex justify="space-between" align="center" pt={3} borderTop="2px solid" borderColor="gray.100">
                                                <Text fontWeight="bold" color="gray.700">الإجمالي</Text>
                                                <Text fontWeight="bold" fontSize="lg" color="green.600">{formatAmount(manualIncome.total)} EGP</Text>
                                            </Flex>
                                        </>
                                    ) : (
                                        <Box py={10} textAlign="center">
                                            <DollarSign size={40} color="#e2e8f0" style={{ margin: '0 auto 8px' }} />
                                            <Text color="gray.500" fontSize="sm">لا توجد إدخالات دخل يدوي</Text>
                                            <Button size="sm" mt={3} variant="outline" colorScheme="green" onClick={onIncomeOpen}>
                                                إضافة دخل يدوي
                                            </Button>
                                        </Box>
                                    )}
                                </Card.Body>
                            </Card.Root>

                            {/* المصروفات */}
                            <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden" gridColumn={{ base: 'auto', lg: '1 / -1' }}>
                                <Card.Header bg="#fdfbf7" borderBottom="1px solid" borderColor="gray.100" py={4} px={5}>
                                    <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
                                        <Heading size="md" color="#615b36" display="flex" alignItems="center" gap={2}>
                                            <FileText size={20} />
                                            المصروفات
                                        </Heading>
                                        {/* @ts-ignore */}
                                        <Button size="sm" bg="red.600" color="white" _hover={{ bg: 'red.700' }} onClick={onExpenseOpen} leftIcon={<Plus size={16} />}>
                                            إضافة مصروف
                                        </Button>
                                    </Flex>
                                </Card.Header>
                                <Card.Body p={5}>
                                    {expenses && expenses.expenses?.length > 0 ? (
                                        <>
                                            <Box overflowX="auto" mb={4}>
                                                <Table.Root size="sm">
                                                    <Table.Header bg="gray.50">
                                                        <Table.Row>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">الوصف</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">التاريخ</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">ملاحظات</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">المبلغ</Table.ColumnHeader>
                                                        </Table.Row>
                                                    </Table.Header>
                                                    <Table.Body>
                                                        {expenses.expenses.map((exp, i) => (
                                                            <Table.Row key={exp.id ?? i}>
                                                                <Table.Cell py={3} px={3}>{exp.description}</Table.Cell>
                                                                <Table.Cell py={3} px={3} color="gray.600" fontSize="sm">{formatDate(exp.expenseDate)}</Table.Cell>
                                                                {/* @ts-ignore */}
                                                                <Table.Cell py={3} px={3} color="gray.500" fontSize="sm" maxW="200px" noOfLines={1}>{exp.notes || '—'}</Table.Cell>
                                                                <Table.Cell py={3} px={3} fontWeight="bold" color="red.600">{formatAmount(exp.amount)} EGP</Table.Cell>
                                                            </Table.Row>
                                                        ))}
                                                    </Table.Body>
                                                </Table.Root>
                                            </Box>
                                            <Flex justify="space-between" align="center" pt={3} borderTop="2px solid" borderColor="gray.100">
                                                <Text fontWeight="bold" color="gray.700">الإجمالي</Text>
                                                <Text fontWeight="bold" fontSize="lg" color="red.600">{formatAmount(expenses.total)} EGP</Text>
                                            </Flex>
                                        </>
                                    ) : (
                                        <Box py={10} textAlign="center">
                                            <FileText size={40} color="#e2e8f0" style={{ margin: '0 auto 8px' }} />
                                            <Text color="gray.500" fontSize="sm">لا توجد مصروفات مسجلة</Text>
                                            <Button size="sm" mt={3} variant="outline" colorScheme="red" onClick={onExpenseOpen}>
                                                إضافة مصروف
                                            </Button>
                                        </Box>
                                    )}
                                </Card.Body>
                            </Card.Root>
                        </SimpleGrid>
                    </>
                )}
            </Container>

            {/* Modal: إضافة دخل يدوي */}
            <Dialog.Root open={isIncomeOpen} onOpenChange={(e) => !e.open && onIncomeClose()} size="md">
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content dir="rtl" fontFamily="var(--font-tajawal)">
                        <Dialog.CloseTrigger />
                        <Dialog.Header fontSize="lg" fontWeight="bold">إضافة دخل يدوي</Dialog.Header>
                        <Dialog.Body>
                            <Stack gap={4}>
                                <Field.Root required>
                                    <Field.Label>اسم العملية / وصف الدخل</Field.Label>
                                    <Input
                                        placeholder="مثال: استشارة خاصة"
                                        value={incomeForm.description}
                                        onChange={(e) => setIncomeForm((p) => ({ ...p, description: e.target.value }))}
                                    />
                                </Field.Root>
                                <Field.Root required>
                                    <Field.Label>المبلغ (EGP)</Field.Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={incomeForm.amount || ''}
                                        onChange={(e) => setIncomeForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                                    />
                                </Field.Root>
                                <Field.Root>
                                    <Field.Label>التاريخ (اختياري)</Field.Label>
                                    <Input
                                        type="date"
                                        value={incomeForm.entryDate || ''}
                                        onChange={(e) => setIncomeForm((p) => ({ ...p, entryDate: e.target.value }))}
                                    />
                                </Field.Root>
                            </Stack>
                        </Dialog.Body>
                        <Dialog.Footer gap={3}>
                            <Button variant="ghost" onClick={onIncomeClose}>إلغاء</Button>
                            <Button bg="#615b36" color="white" _hover={{ bg: '#4a452a' }} onClick={handleAddIncome} loading={incomeSaving} disabled={!incomeForm.description?.trim() || incomeForm.amount <= 0}>
                                حفظ
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Dialog.Root>

            {/* Modal: إضافة مصروف */}
            <Dialog.Root open={isExpenseOpen} onOpenChange={(e) => !e.open && onExpenseClose()} size="md">
                <Dialog.Backdrop />
                <Dialog.Positioner>
                    <Dialog.Content dir="rtl" fontFamily="var(--font-tajawal)">
                        <Dialog.CloseTrigger />
                        <Dialog.Header fontSize="lg" fontWeight="bold">إضافة مصروف</Dialog.Header>
                        <Dialog.Body>
                            <Stack gap={4}>
                                <Field.Root required>
                                    <Field.Label>اسم العملية / وصف المصروف</Field.Label>
                                    <Input
                                        placeholder="مثال: فاتورة كهرباء"
                                        value={expenseForm.description}
                                        onChange={(e) => setExpenseForm((p) => ({ ...p, description: e.target.value }))}
                                    />
                                </Field.Root>
                                <Field.Root required>
                                    <Field.Label>المبلغ (EGP)</Field.Label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={expenseForm.amount || ''}
                                        onChange={(e) => setExpenseForm((p) => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                                    />
                                </Field.Root>
                                <Field.Root>
                                    <Field.Label>التاريخ (اختياري)</Field.Label>
                                    <Input
                                        type="date"
                                        value={expenseForm.expenseDate || ''}
                                        onChange={(e) => setExpenseForm((p) => ({ ...p, expenseDate: e.target.value }))}
                                    />
                                </Field.Root>
                                <Field.Root>
                                    <Field.Label>ملاحظات (اختياري)</Field.Label>
                                    <Textarea
                                        placeholder="أي تفاصيل إضافية..."
                                        value={expenseForm.notes || ''}
                                        onChange={(e) => setExpenseForm((p) => ({ ...p, notes: e.target.value }))}
                                        rows={2}
                                    />
                                </Field.Root>
                            </Stack>
                        </Dialog.Body>
                        <Dialog.Footer gap={3}>
                            <Button variant="ghost" onClick={onExpenseClose}>إلغاء</Button>
                            <Button bg="red.600" color="white" _hover={{ bg: 'red.700' }} onClick={handleAddExpense} loading={expenseSaving} disabled={!expenseForm.description?.trim() || expenseForm.amount <= 0}>
                                حفظ
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Dialog.Root>
        </Box>
    )
}
