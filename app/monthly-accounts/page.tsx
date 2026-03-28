'use client'

import {
    Box,
    Container,
    Flex,
    Heading,
    Text,
    Button,
    Input,
    SimpleGrid,
    Card,
    Stack,
    Dialog,
    useDisclosure,
    Spinner,
    Table,
    HStack,
    Field,
    Textarea,
    Tabs,
    IconButton,
} from '@chakra-ui/react'
import { useState, useEffect, useMemo } from 'react'
import {
    Plus,
    Calendar,
    Wallet,
    TrendingUp,
    TrendingDown,
    DollarSign,
    FileText,
    Receipt,
    Layers,
    Trash2,
    RefreshCw,
    ChevronDown,
    ChevronUp,
} from 'lucide-react'
import {
    BookingsIncomeResponse,
    ManualIncomeResponse,
    ExpensesResponse,
    AccountsSummaryResponse,
    AddIncomeBody,
    AddExpenseBody,
    ExpenseCategory,
    ExpenseSubcategory,
} from '@/types/accounts'
import api from '@/lib/axios'
import { toaster } from '@/components/ui/toaster'

function getCurrentMonth(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function getToday(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** تنسيق تاريخ مع اسم اليوم: "السبت 1 فبراير 2026" */
function formatDateWithDay(dateStr: string): string {
    if (!dateStr) return ''
    try {
        return new Date(dateStr + 'T12:00:00').toLocaleDateString('ar-EG', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })
    } catch {
        return dateStr
    }
}

/** يدعم أشكال الاستجابة الشائعة: { categories }, مصفوفة مباشرة، Laravel data wrapper */
function parseExpenseCategoryRows(payload: unknown): ExpenseCategory[] {
    const raw = extractArrayFromPayload(payload)
    const out: ExpenseCategory[] = []
    for (const item of raw) {
        const row = mapExpenseCategoryRow(item)
        if (row) out.push(row)
    }
    return out
}

function parseExpenseSubcategoryRows(payload: unknown): ExpenseSubcategory[] {
    const raw = extractArrayFromPayload(payload)
    const out: ExpenseSubcategory[] = []
    for (const item of raw) {
        const row = mapExpenseSubcategoryRow(item)
        if (row) out.push(row)
    }
    return out
}

function extractArrayFromPayload(payload: unknown): unknown[] {
    if (Array.isArray(payload)) return payload
    if (!payload || typeof payload !== 'object') return []
    const o = payload as Record<string, unknown>
    if (Array.isArray(o.categories)) return o.categories
    if (Array.isArray(o.subcategories)) return o.subcategories
    if (Array.isArray(o.data)) return o.data
    const inner = o.data
    if (inner && typeof inner === 'object') {
        const d = inner as Record<string, unknown>
        if (Array.isArray(d.categories)) return d.categories
        if (Array.isArray(d.subcategories)) return d.subcategories
    }
    return []
}

function mapExpenseCategoryRow(x: unknown): ExpenseCategory | null {
    if (!x || typeof x !== 'object') return null
    const r = x as Record<string, unknown>
    const id = coercePositiveInt(r.id)
    const name = typeof r.name === 'string' ? r.name.trim() : ''
    if (id == null || !name) return null
    return { id, name }
}

function mapExpenseSubcategoryRow(x: unknown): ExpenseSubcategory | null {
    if (!x || typeof x !== 'object') return null
    const r = x as Record<string, unknown>
    const id = coercePositiveInt(r.id)
    const name = typeof r.name === 'string' ? r.name.trim() : ''
    const categoryId = coercePositiveInt(r.categoryId ?? r.category_id)
    if (id == null || !name || categoryId == null) return null
    return { id, name, categoryId }
}

function coercePositiveInt(v: unknown): number | null {
    const n = typeof v === 'number' ? v : typeof v === 'string' ? parseInt(v, 10) : NaN
    return Number.isFinite(n) && n > 0 ? n : null
}

/** رسالة خطأ من جسم الاستجابة أو افتراضي */
function messageFromApi(error: unknown, fallback: string): string {
    const e = error as { response?: { data?: { message?: string } } }
    const m = e?.response?.data?.message
    return typeof m === 'string' && m.trim() ? m.trim() : fallback
}

type PeriodMode = 'month' | 'days' | 'months'

export default function MonthlyAccountsPage() {
    const [periodMode, setPeriodMode] = useState<PeriodMode>('month')
    const [month, setMonth] = useState<string>(getCurrentMonth())
    const [startDate, setStartDate] = useState<string>(() => {
        const d = new Date()
        d.setDate(1)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })
    const [endDate, setEndDate] = useState<string>(getToday())
    const [startMonth, setStartMonth] = useState<string>(getCurrentMonth())
    const [endMonth, setEndMonth] = useState<string>(getCurrentMonth())

    const [summary, setSummary] = useState<AccountsSummaryResponse | null>(null)
    const [bookingsIncome, setBookingsIncome] = useState<BookingsIncomeResponse | null>(null)
    const [manualIncome, setManualIncome] = useState<ManualIncomeResponse | null>(null)
    const [expenses, setExpenses] = useState<ExpensesResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [incomeSaving, setIncomeSaving] = useState(false)
    const [expenseSaving, setExpenseSaving] = useState(false)

    const { open: isIncomeOpen, onOpen: onIncomeOpen, onClose: onIncomeClose } = useDisclosure()
    const { open: isExpenseOpen, onOpen: onExpenseOpen, onClose: onExpenseClose } = useDisclosure()

    const [filterProcedure, setFilterProcedure] = useState<string>('all')
    const [filterExpenseCat, setFilterExpenseCat] = useState<string>('all')

    const filteredBookingsIncome = useMemo(() => {
        if (!bookingsIncome?.byCustomer) return []
        if (filterProcedure === 'all') return bookingsIncome.byCustomer
        if (filterProcedure === 'none') return bookingsIncome.byCustomer.filter(r => !r.procedureType)
        return bookingsIncome.byCustomer.filter(r => r.procedureType === filterProcedure)
    }, [bookingsIncome, filterProcedure])

    const bookingsProceduresList = useMemo(() => {
        if (!bookingsIncome?.byCustomer) return []
        const pros = bookingsIncome.byCustomer.map(r => r.procedureType).filter(Boolean) as string[]
        return Array.from(new Set(pros)).sort()
    }, [bookingsIncome])

    const filteredExpenses = useMemo(() => {
        if (!expenses?.expenses) return []
        if (filterExpenseCat === 'all') return expenses.expenses
        return expenses.expenses.filter(exp => 
            (exp.category?.name ?? String(exp.categoryId)) === filterExpenseCat ||
            String(exp.categoryId) === filterExpenseCat
        )
    }, [expenses, filterExpenseCat])

    const expenseCategoriesList = useMemo(() => {
        if (!expenses?.expenses) return []
        const cats = expenses.expenses.map(e => e.category?.name ?? String(e.categoryId)).filter(Boolean)
        return Array.from(new Set(cats)).sort()
    }, [expenses])

    const [incomeForm, setIncomeForm] = useState<AddIncomeBody>({
        description: '',
        amount: 0,
        entryDate: getToday(),
    })
    const [expenseForm, setExpenseForm] = useState<AddExpenseBody>({
        description: '',
        amount: 0,
        notes: '',
        date: getToday(),
        category_id: 0,
        subcategory_id: null,
    })
    const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
    const [expenseSubcategories, setExpenseSubcategories] = useState<ExpenseSubcategory[]>([])
    const [isSubcategoriesLoading, setIsSubcategoriesLoading] = useState(false)
    const [isExpenseCategoriesLoading, setIsExpenseCategoriesLoading] = useState(false)
    /** فئات فرعية مجمّعة للعرض في بطاقة «أنواع المصروفات» */
    const [subsByCategory, setSubsByCategory] = useState<Record<number, ExpenseSubcategory[]>>({})
    const [newMainCategoryName, setNewMainCategoryName] = useState('')
    const [subDraftByCategory, setSubDraftByCategory] = useState<Record<number, string>>({})
    const [creatingCategory, setCreatingCategory] = useState(false)
    const [creatingSubFor, setCreatingSubFor] = useState<number | null>(null)
    const [deletingId, setDeletingId] = useState<{ kind: 'cat' | 'sub'; id: number } | null>(null)
    const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({})
    const [isTaxonomyExpanded, setIsTaxonomyExpanded] = useState(false)

    const toggleCategory = (id: number) => {
        setExpandedCategories(prev => ({ ...prev, [id]: !prev[id] }))
    }

    /** معاملات الفترة — مطابقة لـ getPeriodRange في الـ backend (doc §3) */
    const periodParams = useMemo(() => {
        if (periodMode === 'month') return month ? { month } : {}
        if (periodMode === 'days') return startDate && endDate ? { startDate, endDate } : {}
        if (periodMode === 'months') return startMonth && endMonth ? { startMonth, endMonth } : {}
        return {}
    }, [periodMode, month, startDate, endDate, startMonth, endMonth])

    /** أولوية الـ backend: نطاق أيام صالح | نطاق شهور صالح | غير ذلك شهر واحد (أو الشهر الحالي إن لم يُرسل month) */
    const periodValidationError = useMemo(() => {
        if (periodMode === 'days' && startDate && endDate && startDate > endDate) {
            return 'تاريخ البداية يجب ألا يكون بعد تاريخ النهاية (startDate ≤ endDate).'
        }
        if (periodMode === 'months' && startMonth && endMonth && startMonth > endMonth) {
            return 'شهر البداية يجب ألا يكون بعد شهر النهاية (startMonth ≤ endMonth).'
        }
        return null
    }, [periodMode, startDate, endDate, startMonth, endMonth])

    const fetchAll = async () => {
        if (periodValidationError) return
        setIsLoading(true)
        try {
            await api.get<{ message?: string }>('/accounts')
            const [summaryRes, bookingsRes, manualRes, expensesRes] = await Promise.all([
                api.get<AccountsSummaryResponse>('/accounts/summary', { params: periodParams }),
                api.get<BookingsIncomeResponse>('/accounts/income/bookings', { params: periodParams }),
                api.get<ManualIncomeResponse>('/accounts/income/manual', { params: periodParams }),
                api.get<ExpensesResponse>('/accounts/expenses', { params: periodParams }),
            ])
            setSummary(summaryRes.data)
            setBookingsIncome(bookingsRes.data)
            setManualIncome(manualRes.data)
            setExpenses(expensesRes.data)
        } catch (error: unknown) {
            setSummary(null)
            setBookingsIncome(null)
            setManualIncome(null)
            setExpenses(null)
            const status = (error as { response?: { status?: number } })?.response?.status
            const title =
                status === 401
                    ? 'غير مصرّح'
                    : status === 403
                      ? 'صلاحية غير كافية'
                      : 'خطأ في جلب البيانات'
            const desc =
                status === 401
                    ? 'التوكن مفقود أو غير صالح. سجّل الدخول مجدداً.'
                    : status === 403
                      ? 'تحتاج صلاحية manage_accounts للوصول إلى الحسابات.'
                      : messageFromApi(error, 'حدث خطأ أثناء جلب الحسابات')
            toaster.create({ title, description: desc, type: 'error', duration: 4000 })
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (periodValidationError) {
            setIsLoading(false)
            return
        }
        fetchAll()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodMode, month, startDate, endDate, startMonth, endMonth, periodValidationError])

    const loadSubsMap = async (list: ExpenseCategory[]) => {
        if (list.length === 0) {
            setSubsByCategory({})
            return
        }
        const map: Record<number, ExpenseSubcategory[]> = {}
        await Promise.all(
            list.map(async (c) => {
                try {
                    const r = await api.get('/accounts/expense-subcategories', {
                        params: { category_id: c.id },
                    })
                    map[c.id] = parseExpenseSubcategoryRows(r.data)
                } catch {
                    map[c.id] = []
                }
            }),
        )
        setSubsByCategory(map)
    }

    /** قائمة التصنيفات + الفئات الفرعية (لبطاقة إدارة الأنواع وبعد أي تعديل) */
    const refreshExpenseTaxonomy = async () => {
        setIsExpenseCategoriesLoading(true)
        try {
            const res = await api.get('/accounts/expense-categories')
            const list = parseExpenseCategoryRows(res.data)
            setExpenseCategories(list)
            await loadSubsMap(list)
        } catch (error: unknown) {
            toaster.create({
                title: 'خطأ في جلب تصنيفات المصروفات',
                description: messageFromApi(error, 'حدث خطأ'),
                type: 'error',
                duration: 3000,
            })
        } finally {
            setIsExpenseCategoriesLoading(false)
        }
    }

    /** تحديث التصنيفات الرئيسية فقط (عند فتح مودال المصروف دون جلب كل الفروع) */
    const fetchCategoriesLight = async () => {
        setIsExpenseCategoriesLoading(true)
        try {
            const res = await api.get('/accounts/expense-categories')
            const list = parseExpenseCategoryRows(res.data)
            setExpenseCategories(list)
        } catch (error: unknown) {
            toaster.create({
                title: 'خطأ في جلب تصنيفات المصروفات',
                description: messageFromApi(error, 'حدث خطأ'),
                type: 'error',
                duration: 3000,
            })
        } finally {
            setIsExpenseCategoriesLoading(false)
        }
    }

    const handleCreateMainCategory = async () => {
        const name = newMainCategoryName.trim()
        if (!name) {
            toaster.create({ title: 'أدخل اسم التصنيف الرئيسي', type: 'warning', duration: 2000 })
            return
        }
        setCreatingCategory(true)
        try {
            await api.post('/accounts/expense-categories', { name })
            toaster.create({ title: 'تم إنشاء التصنيف', type: 'success', duration: 2000 })
            setNewMainCategoryName('')
            await refreshExpenseTaxonomy()
        } catch (error: unknown) {
            toaster.create({
                title: 'فشل إنشاء التصنيف',
                description: messageFromApi(error, 'تحقق من الصلاحيات والبيانات'),
                type: 'error',
                duration: 3000,
            })
        } finally {
            setCreatingCategory(false)
        }
    }

    const handleCreateSubcategory = async (categoryId: number) => {
        const name = (subDraftByCategory[categoryId] || '').trim()
        if (!name) {
            toaster.create({ title: 'أدخل اسم الفئة الفرعية', type: 'warning', duration: 2000 })
            return
        }
        setCreatingSubFor(categoryId)
        try {
            await api.post('/accounts/expense-subcategories', { name, category_id: categoryId })
            toaster.create({ title: 'تم إنشاء الفئة الفرعية', type: 'success', duration: 2000 })
            setSubDraftByCategory((p) => ({ ...p, [categoryId]: '' }))
            await refreshExpenseTaxonomy()
            if (expenseForm.category_id === categoryId) {
                await fetchExpenseSubcategories(categoryId)
            }
        } catch (error: unknown) {
            toaster.create({
                title: 'فشل إنشاء الفئة الفرعية',
                description: messageFromApi(error, 'تحقق من البيانات'),
                type: 'error',
                duration: 3000,
            })
        } finally {
            setCreatingSubFor(null)
        }
    }

    const handleDeleteCategory = async (id: number) => {
        if (!window.confirm('حذف هذا التصنيف؟ قد يمنع الحذف وجود مصروفات مرتبطة.')) return
        setDeletingId({ kind: 'cat', id })
        try {
            await api.delete(`/accounts/expense-categories/${id}`)
            toaster.create({ title: 'تم حذف التصنيف', type: 'success', duration: 2000 })
            await refreshExpenseTaxonomy()
            if (expenseForm.category_id === id) {
                setExpenseForm((p) => ({ ...p, category_id: 0, subcategory_id: 0 }))
                setExpenseSubcategories([])
            }
        } catch (error: unknown) {
            toaster.create({
                title: 'تعذر الحذف',
                description: messageFromApi(error, 'قد تكون هناك بيانات مرتبطة'),
                type: 'error',
                duration: 3000,
            })
        } finally {
            setDeletingId(null)
        }
    }

    const handleDeleteSubcategory = async (subId: number, categoryId: number) => {
        if (!window.confirm('حذف هذه الفئة الفرعية؟')) return
        setDeletingId({ kind: 'sub', id: subId })
        try {
            await api.delete(`/accounts/expense-subcategories/${subId}`)
            toaster.create({ title: 'تم الحذف', type: 'success', duration: 2000 })
            await refreshExpenseTaxonomy()
            if (expenseForm.category_id === categoryId) {
                await fetchExpenseSubcategories(categoryId)
            }
        } catch (error: unknown) {
            toaster.create({
                title: 'تعذر الحذف',
                description: messageFromApi(error, 'قد تكون هناك مصروفات تستخدم هذه الفئة'),
                type: 'error',
                duration: 3000,
            })
        } finally {
            setDeletingId(null)
        }
    }

    const fetchExpenseSubcategories = async (categoryId: number) => {
        if (!categoryId) return
        setIsSubcategoriesLoading(true)
        try {
            const res = await api.get('/accounts/expense-subcategories', {
                params: { category_id: categoryId },
            })
            const subs = parseExpenseSubcategoryRows(res.data)
            setExpenseSubcategories(subs)
            setExpenseForm((p) => ({
                ...p,
                category_id: categoryId,
                subcategory_id: null,
            }))
        } catch (error: unknown) {
            toaster.create({
                title: 'خطأ في جلب الفئات الفرعية',
                description: messageFromApi(error, 'حدث خطأ'),
                type: 'error',
                duration: 3000,
            })
        } finally {
            setIsSubcategoriesLoading(false)
        }
    }

    useEffect(() => {
        void refreshExpenseTaxonomy()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (isExpenseOpen) {
            void fetchCategoriesLight()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isExpenseOpen])

    useEffect(() => {
        if (expenseCategories.length > 0 && !expenseForm.category_id) {
            const firstId = expenseCategories[0]?.id
            if (firstId) fetchExpenseSubcategories(firstId)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expenseCategories])

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
            setIncomeForm({ description: '', amount: 0, entryDate: getToday() })
            fetchAll()
        } catch (error: unknown) {
            const status = (error as { response?: { status?: number } })?.response?.status
            toaster.create({
                title: status === 400 ? 'بيانات غير صالحة' : 'خطأ في إضافة الدخل',
                description: messageFromApi(error, 'حدث خطأ'),
                type: 'error',
                duration: 3000,
            })
        } finally {
            setIncomeSaving(false)
        }
    }

    const handleAddExpense = async () => {
        if (!expenseForm.description?.trim() || expenseForm.amount <= 0 || !expenseForm.category_id) {
            toaster.create({ title: 'أدخل الوصف والمبلغ', type: 'warning', duration: 2000 })
            return
        }
        setExpenseSaving(true)
        try {
            await api.post('/accounts/expenses', {
                description: expenseForm.description.trim(),
                amount: expenseForm.amount,
                category_id: expenseForm.category_id,
                subcategory_id: expenseForm.subcategory_id || null,
                date: expenseForm.date || getToday(),
                expense_date: expenseForm.date || getToday(),
                expenseDate: expenseForm.date || getToday(),
                notes: expenseForm.notes?.trim() || undefined,
            })
            toaster.create({ title: 'تم إضافة المصروف بنجاح', type: 'success', duration: 2000 })
            onExpenseClose()
            setExpenseForm({
                description: '',
                amount: 0,
                date: getToday(),
                notes: '',
                category_id: expenseForm.category_id || expenseCategories[0]?.id || 0,
                subcategory_id: null,
            })
            fetchAll()
        } catch (error: unknown) {
            const status = (error as { response?: { status?: number } })?.response?.status
            toaster.create({
                title: status === 400 ? 'بيانات غير صالحة' : 'خطأ في إضافة المصروف',
                description: messageFromApi(error, 'تحقق من التصنيف والفئة الفرعية'),
                type: 'error',
                duration: 3000,
            })
        } finally {
            setExpenseSaving(false)
        }
    }

    const formatAmount = (n: number | string | null | undefined) => (typeof n === 'number' ? n : parseFloat(String(n ?? 0)) || 0).toFixed(2)
    const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })

    const periodLabel = (() => {
        if (periodMode === 'days' && startDate && endDate)
            return `${formatDateWithDay(startDate)} — ${formatDateWithDay(endDate)}`
        if (summary?.period && periodMode !== 'days') return summary.period
        if (periodMode === 'month' && month)
            return new Date(month + '-01').toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
        if (periodMode === 'months' && startMonth && endMonth)
            return `${new Date(startMonth + '-01').toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })} — ${new Date(endMonth + '-01').toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}`
        return summary?.period ?? 'الفترة'
    })()

    return (
        <Box minH="100vh" bg="#f0f1f3" dir="rtl">
            {/* Header */}
            <Box bg="linear-gradient(135deg, #615b36 0%, #7a7350 50%, #8a8260 100%)" py={8} px={4}>
                <Container maxW="6xl">
                    <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
                        <Box>
                            <Heading size="xl" color="white" mb={1}>
                                الحسابات الشهرية
                            </Heading>
                            <Flex align="center" gap={2} color="whiteAlpha.900" fontSize="md">
                                <Calendar size={18} />
                                <Text>الفترة: {periodLabel}</Text>
                            </Flex>
                        </Box>
                        <Box bg="whiteAlpha.100" borderRadius="xl" p={3}>
                            <Tabs.Root value={periodMode} onValueChange={(e) => setPeriodMode(e.value as PeriodMode)} size="sm">
                                <Tabs.List gap={1} flexWrap="wrap">
                                    <Tabs.Trigger value="month">شهر واحد</Tabs.Trigger>
                                    <Tabs.Trigger value="days">نطاق أيام</Tabs.Trigger>
                                    <Tabs.Trigger value="months">نطاق شهور</Tabs.Trigger>
                                </Tabs.List>
                                <Box mt={3} display="flex" flexWrap="wrap" gap={3} alignItems="center">
                                    {periodMode === 'month' && (
                                        <HStack>
                                            <Text color="whiteAlpha.900" fontSize="sm">الشهر</Text>
                                            <Input
                                                type="month"
                                                value={month}
                                                onChange={(e) => setMonth(e.target.value)}
                                                bg="white"
                                                color="gray.800"
                                                maxW="160px"
                                                size="sm"
                                            />
                                        </HStack>
                                    )}
                                    {periodMode === 'days' && (
                                        <HStack gap={2} flexWrap="wrap">
                                            <HStack>
                                                <Text color="whiteAlpha.900" fontSize="sm">من</Text>
                                                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} bg="white" color="gray.800" maxW="150px" size="sm" />
                                            </HStack>
                                            <HStack>
                                                <Text color="whiteAlpha.900" fontSize="sm">إلى</Text>
                                                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} bg="white" color="gray.800" maxW="150px" size="sm" />
                                            </HStack>
                                        </HStack>
                                    )}
                                    {periodMode === 'months' && (
                                        <HStack gap={2} flexWrap="wrap">
                                            <HStack>
                                                <Text color="whiteAlpha.900" fontSize="sm">من شهر</Text>
                                                <Input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} bg="white" color="gray.800" maxW="150px" size="sm" />
                                            </HStack>
                                            <HStack>
                                                <Text color="whiteAlpha.900" fontSize="sm">إلى شهر</Text>
                                                <Input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)} bg="white" color="gray.800" maxW="150px" size="sm" />
                                            </HStack>
                                        </HStack>
                                    )}
                                </Box>
                            </Tabs.Root>
                            {periodValidationError && (
                                <Text mt={3} fontSize="sm" color="orange.100" bg="blackAlpha.300" borderRadius="md" px={3} py={2}>
                                    {periodValidationError} اضبط الفترة لعرض البيانات.
                                </Text>
                            )}
                        </Box>
                    </Flex>
                </Container>
            </Box>

            <Container maxW="6xl" py={8} mt={-6} position="relative" zIndex={1}>
                {periodValidationError ? (
                    <Flex justify="center" align="center" minH="280px" direction="column" gap={3}>
                        <Text color="gray.600" textAlign="center" maxW="md">
                            {periodValidationError}
                        </Text>
                        <Text fontSize="sm" color="gray.500">
                            وفق التوثيق: نطاق الأيام يتطلب startDate ≤ endDate، ونطاق الشهور startMonth ≤ endMonth.
                        </Text>
                    </Flex>
                ) : isLoading ? (
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
                                    <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={3}>
                                        <Text fontWeight="bold" color="gray.600" fontSize="sm">الفلترة حسب الإجراء</Text>
                                        <Box bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="lg" px={2} minW="200px">
                                            <select
                                                value={filterProcedure}
                                                onChange={(e) => setFilterProcedure(e.target.value)}
                                                style={{ width: '100%', padding: '6px', background: 'transparent', outline: 'none' }}
                                            >
                                                <option value="all">الكل</option>
                                                <option value="none">بدون إجراء</option>
                                                {bookingsProceduresList.map(p => (
                                                    <option key={p} value={p}>{p}</option>
                                                ))}
                                            </select>
                                        </Box>
                                    </Flex>
                                    {bookingsIncome && filteredBookingsIncome.length > 0 ? (
                                        <>
                                            <Box overflowX="auto" mb={4}>
                                                <Table.Root size="sm">
                                                    <Table.Header bg="gray.50">
                                                        <Table.Row>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">العميل</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">نوع الزيارة</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">الإجراء</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">المبلغ</Table.ColumnHeader>
                                                        </Table.Row>
                                                    </Table.Header>
                                                    <Table.Body>
                                                        {filteredBookingsIncome.map((row, i) => (
                                                            <Table.Row key={i}>
                                                                <Table.Cell py={3} px={3}>{row.customerName}</Table.Cell>
                                                                <Table.Cell py={3} px={3} color="gray.600">
                                                                    {row.visitType === 'checkup' ? 'كشف' : row.visitType === 'followup' ? 'إعادة' : row.visitType === 'consultation' ? 'استشارة' : (row.visitType || '—')}
                                                                </Table.Cell>
                                                                <Table.Cell py={3} px={3}>{row.procedureType || '—'}</Table.Cell>
                                                                <Table.Cell py={3} px={3} fontWeight="bold" color="#615b36">{formatAmount(row.amount)} EGP</Table.Cell>
                                                            </Table.Row>
                                                        ))}
                                                    </Table.Body>
                                                </Table.Root>
                                            </Box>
                                            <Flex justify="space-between" align="center" pt={3} borderTop="2px solid" borderColor="gray.100">
                                                <Text fontWeight="bold" color="gray.700">الإجمالي (للفلتر)</Text>
                                                <Text fontWeight="bold" fontSize="lg" color="#615b36">
                                                    {formatAmount(filteredBookingsIncome.reduce((acc, row) => acc + (row.amount || 0), 0))} EGP
                                                </Text>
                                            </Flex>
                                        </>
                                    ) : (
                                        <Box py={10} textAlign="center">
                                            <Receipt size={40} color="#e2e8f0" style={{ margin: '0 auto 8px' }} />
                                            <Text color="gray.500" fontSize="sm">لا يوجد دخل حجوزات للفترة المحددة</Text>
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
                                        <Button size="sm" bg="#615b36" color="white" _hover={{ bg: '#4a452a' }} onClick={onIncomeOpen}>
                                            <HStack gap={1} as="span">
                                                <Plus size={16} />
                                                <span>إضافة دخل</span>
                                            </HStack>
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
                                            <Text color="gray.500" fontSize="sm">لا توجد إدخالات دخل يدوي للفترة المحددة</Text>
                                            <Button size="sm" mt={3} variant="outline" colorScheme="green" onClick={onIncomeOpen}>
                                                إضافة دخل يدوي
                                            </Button>
                                        </Box>
                                    )}
                                </Card.Body>
                            </Card.Root>

                            {/* أنواع وتصنيفات المصروفات — منفصلة عن مودال إضافة المصروف */}
                            <Card.Root
                                id="expense-taxonomy"
                                scrollMarginTop="100px"
                                bg="white"
                                shadow="md"
                                borderRadius="xl"
                                overflow="hidden"
                                gridColumn={{ base: 'auto', lg: '1 / -1' }}
                                borderWidth="1px"
                                borderColor="gray.100"
                            >
                                <Box
                                    bg="linear-gradient(135deg, #615b36 0%, #7a7350 100%)"
                                    px={{ base: 4, md: 6 }}
                                    py={4}
                                    cursor="pointer"
                                    onClick={() => setIsTaxonomyExpanded(p => !p)}
                                    _hover={{ opacity: 0.96 }}
                                >
                                    <Flex
                                        justify="space-between"
                                        align={{ base: 'stretch', md: 'center' }}
                                        direction={{ base: 'column', md: 'row' }}
                                        gap={3}
                                    >
                                        <Flex align="center" gap={3} minW={0}>
                                            <Box
                                                p={2.5}
                                                bg="whiteAlpha.200"
                                                borderRadius="xl"
                                                color="white"
                                                flexShrink={0}
                                            >
                                                <Layers size={22} strokeWidth={2} />
                                            </Box>
                                            <Box minW={0}>
                                                <Flex align="center" gap={2}>
                                                    {isTaxonomyExpanded ? <ChevronUp size={20} color="white" /> : <ChevronDown size={20} color="white" />}
                                                    <Heading size="md" color="white" fontWeight="bold" lineHeight="short">
                                                        أنواع المصروفات
                                                    </Heading>
                                                </Flex>
                                                <Text fontSize="sm" color="whiteAlpha.900" mt={1}>
                                                    التصنيف الرئيسي والفئات الفرعية تُستخدم عند تسجيل أي مصروف.
                                                </Text>
                                            </Box>
                                        </Flex>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            borderColor="whiteAlpha.400"
                                            color="white"
                                            _hover={{ bg: 'whiteAlpha.200' }}
                                            loading={isExpenseCategoriesLoading}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                void refreshExpenseTaxonomy()
                                            }}
                                            flexShrink={0}
                                        >
                                            <HStack gap={2}>
                                                <RefreshCw size={16} />
                                                <span>تحديث القائمة</span>
                                            </HStack>
                                        </Button>
                                    </Flex>
                                </Box>
                                {isTaxonomyExpanded && (
                                <Card.Body p={{ base: 4, md: 6 }}>
                                    <Stack gap={5}>
                                        <Box
                                            bg="gray.50"
                                            borderRadius="xl"
                                            p={4}
                                            borderWidth="1px"
                                            borderColor="gray.100"
                                        >
                                            <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>
                                                إضافة تصنيف رئيسي جديد
                                            </Text>
                                            <Flex gap={2} flexWrap="wrap" align="flex-end">
                                                <Box flex="1" minW="200px">
                                                    <Input
                                                        placeholder="مثال: تشغيل ومرافق"
                                                        value={newMainCategoryName}
                                                        onChange={(e) => setNewMainCategoryName(e.target.value)}
                                                        bg="white"
                                                        borderRadius="lg"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault()
                                                                void handleCreateMainCategory()
                                                            }
                                                        }}
                                                    />
                                                </Box>
                                                <Button
                                                    bg="#615b36"
                                                    color="white"
                                                    _hover={{ bg: '#4a452a' }}
                                                    loading={creatingCategory}
                                                    onClick={() => void handleCreateMainCategory()}
                                                    px={6}
                                                >
                                                    إضافة
                                                </Button>
                                            </Flex>
                                        </Box>

                                        {isExpenseCategoriesLoading && expenseCategories.length === 0 ? (
                                            <Flex justify="center" py={8}>
                                                <Spinner size="lg" color="#615b36" />
                                            </Flex>
                                        ) : expenseCategories.length === 0 ? (
                                            <Text textAlign="center" color="gray.500" py={6} fontSize="sm">
                                                لا توجد تصنيفات بعد. أضف تصنيفاً رئيسياً أعلاه ثم فئات فرعية لكل تصنيف.
                                            </Text>
                                        ) : (
                                            <Stack gap={3}>
                                                {expenseCategories.map((cat) => {
                                                    const subs = subsByCategory[cat.id] ?? []
                                                    const busySub = creatingSubFor === cat.id
                                                    return (
                                                        <Box
                                                            key={cat.id}
                                                            borderWidth="1px"
                                                            borderColor="gray.100"
                                                            borderRadius="xl"
                                                            overflow="hidden"
                                                            bg="#fafaf8"
                                                        >
                                                            <Flex
                                                                align="center"
                                                                justify="space-between"
                                                                gap={2}
                                                                px={4}
                                                                py={3}
                                                                bg="white"
                                                                borderBottomWidth="1px"
                                                                borderColor="gray.100"
                                                                cursor="pointer"
                                                                _hover={{ bg: "gray.50" }}
                                                                onClick={() => toggleCategory(cat.id)}
                                                            >
                                                                <Flex align="center" gap={3}>
                                                                    {expandedCategories[cat.id] ? <ChevronUp size={20} color="#615b36" /> : <ChevronDown size={20} color="#615b36" />}
                                                                    <Text fontWeight="bold" color="#615b36" fontSize="md">
                                                                        {cat.name}
                                                                    </Text>
                                                                </Flex>
                                                                <IconButton
                                                                    aria-label="حذف التصنيف"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    colorPalette="red"
                                                                    loading={
                                                                        deletingId?.kind === 'cat' && deletingId.id === cat.id
                                                                    }
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        void handleDeleteCategory(cat.id)
                                                                    }}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </IconButton>
                                                            </Flex>
                                                            {expandedCategories[cat.id] && (
                                                            <Box px={4} py={3}>
                                                                {subs.length > 0 ? (
                                                                    <Flex gap={2} flexWrap="wrap" mb={3}>
                                                                        {subs.map((s) => (
                                                                            <HStack
                                                                                key={s.id}
                                                                                bg="white"
                                                                                borderWidth="1px"
                                                                                borderColor="gray.200"
                                                                                borderRadius="full"
                                                                                pl={3}
                                                                                pr={1}
                                                                                py={1}
                                                                                fontSize="sm"
                                                                            >
                                                                                <Text color="gray.700">{s.name}</Text>
                                                                                <IconButton
                                                                                    aria-label="حذف"
                                                                                    size="2xs"
                                                                                    variant="ghost"
                                                                                    colorPalette="gray"
                                                                                    loading={
                                                                                        deletingId?.kind === 'sub' &&
                                                                                        deletingId.id === s.id
                                                                                    }
                                                                                    onClick={() =>
                                                                                        void handleDeleteSubcategory(s.id, cat.id)
                                                                                    }
                                                                                >
                                                                                    <Trash2 size={12} />
                                                                                </IconButton>
                                                                            </HStack>
                                                                        ))}
                                                                    </Flex>
                                                                ) : (
                                                                    <Text fontSize="xs" color="gray.500" mb={3}>
                                                                        لا توجد فئات فرعية بعد — أضف واحدة على الأقل لتسجيل مصروفات تحت هذا التصنيف.
                                                                    </Text>
                                                                )}
                                                                <Flex gap={2} flexWrap="wrap" align="flex-end">
                                                                    <Input
                                                                        flex="1"
                                                                        minW="180px"
                                                                        size="sm"
                                                                        bg="white"
                                                                        placeholder="اسم فئة فرعية جديدة"
                                                                        value={subDraftByCategory[cat.id] || ''}
                                                                        onChange={(e) =>
                                                                            setSubDraftByCategory((p) => ({
                                                                                ...p,
                                                                                [cat.id]: e.target.value,
                                                                            }))
                                                                        }
                                                                        borderRadius="lg"
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                e.preventDefault()
                                                                                void handleCreateSubcategory(cat.id)
                                                                            }
                                                                        }}
                                                                    />
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        borderColor="#615b36"
                                                                        color="#615b36"
                                                                        loading={busySub}
                                                                        onClick={() => void handleCreateSubcategory(cat.id)}
                                                                    >
                                                                        إضافة فرعي
                                                                    </Button>
                                                                </Flex>
                                                            </Box>
                                                            )}
                                                        </Box>
                                                    )
                                                })}
                                            </Stack>
                                        )}
                                    </Stack>
                                </Card.Body>
                                )}
                            </Card.Root>

                            {/* المصروفات */}
                            <Card.Root bg="white" shadow="md" borderRadius="xl" overflow="hidden" gridColumn={{ base: 'auto', lg: '1 / -1' }}>
                                <Card.Header bg="#fdfbf7" borderBottom="1px solid" borderColor="gray.100" py={4} px={5}>
                                    <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
                                        <Heading size="md" color="#615b36" display="flex" alignItems="center" gap={2}>
                                            <FileText size={20} />
                                            المصروفات
                                        </Heading>
                                        <Flex gap={2} align="center" flexWrap="wrap">
                                            <Box bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="lg" px={2}>
                                                <select
                                                    value={filterExpenseCat}
                                                    onChange={(e) => setFilterExpenseCat(e.target.value)}
                                                    style={{ minWidth: '130px', padding: '6px', outline: 'none', background: 'transparent' }}
                                                >
                                                    <option value="all">التصنيف: الكل</option>
                                                    {expenseCategoriesList.map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </Box>
                                            <Button size="sm" bg="red.600" color="white" _hover={{ bg: 'red.700' }} onClick={onExpenseOpen}>
                                                <HStack gap={1} as="span">
                                                    <Plus size={16} />
                                                    <span>إضافة مصروف</span>
                                                </HStack>
                                            </Button>
                                        </Flex>
                                    </Flex>
                                </Card.Header>
                                <Card.Body p={5}>
                                    {expenses && filteredExpenses.length > 0 ? (
                                        <>
                                            <Box overflowX="auto" mb={4}>
                                                <Table.Root size="sm">
                                                    <Table.Header bg="gray.50">
                                                        <Table.Row>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">الوصف</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">التصنيف</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">الفئة الفرعية</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">التاريخ</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">ملاحظات</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">المبلغ</Table.ColumnHeader>
                                                        </Table.Row>
                                                    </Table.Header>
                                                    <Table.Body>
                                                        {filteredExpenses.map((exp, i) => (
                                                            <Table.Row key={exp.id ?? i}>
                                                                <Table.Cell py={3} px={3}>{exp.description}</Table.Cell>
                                                                <Table.Cell py={3} px={3} color="gray.600" fontSize="sm">
                                                                    {exp.category?.name ?? (exp.categoryId != null ? `#${exp.categoryId}` : '—')}
                                                                </Table.Cell>
                                                                <Table.Cell py={3} px={3} color="gray.600" fontSize="sm">
                                                                    {exp.subcategory?.name ?? (exp.subcategoryId != null ? `#${exp.subcategoryId}` : '—')}
                                                                </Table.Cell>
                                                                <Table.Cell py={3} px={3} color="gray.600" fontSize="sm">{formatDate(exp.expenseDate)}</Table.Cell>
                                                                <Table.Cell py={3} px={3} color="gray.500" fontSize="sm" maxW="200px" lineClamp={2}>
                                                                    {exp.notes || '—'}
                                                                </Table.Cell>
                                                                <Table.Cell py={3} px={3} fontWeight="bold" color="red.600">{formatAmount(exp.amount)} EGP</Table.Cell>
                                                            </Table.Row>
                                                        ))}
                                                    </Table.Body>
                                                </Table.Root>
                                            </Box>
                                            <Flex justify="space-between" align="center" pt={3} borderTop="2px solid" borderColor="gray.100">
                                                <Text fontWeight="bold" color="gray.700">الإجمالي (للفلتر)</Text>
                                                <Text fontWeight="bold" fontSize="lg" color="red.600">
                                                    {formatAmount(filteredExpenses.reduce((acc, row) => acc + (typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount || 0), 0))} EGP
                                                </Text>
                                            </Flex>
                                        </>
                                    ) : (
                                        <Box py={10} textAlign="center">
                                            <FileText size={40} color="#e2e8f0" style={{ margin: '0 auto 8px' }} />
                                            <Text color="gray.500" fontSize="sm">لا توجد مصروفات للفترة المحددة</Text>
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
                    <Dialog.Content dir="rtl">
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
            <Dialog.Root open={isExpenseOpen} onOpenChange={(e) => !e.open && onExpenseClose()} size="lg">
                <Dialog.Backdrop bg="blackAlpha.600" />
                <Dialog.Positioner padding={{ base: 3, md: 6 }}>
                    <Dialog.Content
                        dir="rtl"
                        maxW={{ base: '100%', md: '520px' }}
                        borderRadius="2xl"
                        overflow="hidden"
                        boxShadow="2xl"
                        borderWidth="0"
                    >
                        <Box
                            bg="linear-gradient(135deg, #9b2c2c 0%, #c53030 45%, #742a2a 100%)"
                            px={6}
                            py={5}
                            position="relative"
                        >
                            <Dialog.CloseTrigger
                                position="absolute"
                                top={3}
                                left={3}
                                color="white"
                                _hover={{ bg: 'whiteAlpha.200' }}
                            />
                            <Flex align="center" gap={3} pr={8}>
                                <Box
                                    p={2.5}
                                    bg="whiteAlpha.200"
                                    borderRadius="xl"
                                    color="white"
                                >
                                    <TrendingDown size={24} strokeWidth={2} />
                                </Box>
                                <Box>
                                    <Dialog.Title fontSize="xl" fontWeight="bold" color="white" m={0}>
                                        تسجيل مصروف جديد
                                    </Dialog.Title>
                                    <Text fontSize="sm" color="whiteAlpha.900" mt={1}>
                                        اربط العملية بالتصنيف المناسب ثم احفظ.
                                    </Text>
                                </Box>
                            </Flex>
                        </Box>
                        <Dialog.Body bg="gray.50" pt={6} pb={2}>
                            <Stack gap={5}>
                                <Box bg="white" borderRadius="xl" p={4} borderWidth="1px" borderColor="gray.100" shadow="sm">
                                    <Text fontSize="xs" fontWeight="bold" color="gray.500" letterSpacing="wide" mb={3}>
                                        بيانات العملية
                                    </Text>
                                    <Stack gap={4}>
                                        <Field.Root required>
                                            <Field.Label fontWeight="semibold">وصف المصروف</Field.Label>
                                            <Input
                                                placeholder="مثال: فاتورة كهرباء — مارس"
                                                value={expenseForm.description}
                                                onChange={(e) =>
                                                    setExpenseForm((p) => ({ ...p, description: e.target.value }))
                                                }
                                                bg="gray.50"
                                                borderRadius="lg"
                                                size="lg"
                                            />
                                        </Field.Root>
                                        <Field.Root required>
                                            <Field.Label fontWeight="semibold">المبلغ (جنيه)</Field.Label>
                                            <Input
                                                type="number"
                                                placeholder="0.00"
                                                value={expenseForm.amount || ''}
                                                onChange={(e) =>
                                                    setExpenseForm((p) => ({
                                                        ...p,
                                                        amount: parseFloat(e.target.value) || 0,
                                                    }))
                                                }
                                                bg="gray.50"
                                                borderRadius="lg"
                                                size="lg"
                                            />
                                        </Field.Root>
                                    </Stack>
                                </Box>

                                <Box bg="white" borderRadius="xl" p={4} borderWidth="1px" borderColor="gray.100" shadow="sm">
                                    <Text fontSize="xs" fontWeight="bold" color="gray.500" letterSpacing="wide" mb={3}>
                                        التصنيف
                                    </Text>
                                    <Stack gap={4}>
                                        <Field.Root required>
                                            <Field.Label>
                                                <Flex align="center" gap={2} flexWrap="wrap">
                                                    <Text fontWeight="semibold">التصنيف الرئيسي</Text>
                                                    {isExpenseCategoriesLoading && (
                                                        <Spinner size="sm" color="#615b36" />
                                                    )}
                                                </Flex>
                                            </Field.Label>
                                            <Box
                                                borderWidth="1px"
                                                borderColor="gray.200"
                                                borderRadius="lg"
                                                overflow="hidden"
                                                bg={isExpenseCategoriesLoading ? 'gray.100' : 'gray.50'}
                                            >
                                                <select
                                                    value={expenseForm.category_id || 0}
                                                    disabled={isExpenseCategoriesLoading}
                                                    onChange={(e) => {
                                                        const nextId = Number((e.target as HTMLSelectElement).value)
                                                        if (!nextId) {
                                                            setExpenseForm((p) => ({
                                                                ...p,
                                                                category_id: 0,
                                                                subcategory_id: null,
                                                            }))
                                                            setExpenseSubcategories([])
                                                            return
                                                        }
                                                        void fetchExpenseSubcategories(nextId)
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px 14px',
                                                        border: 'none',
                                                        background: 'transparent',
                                                        color: '#2D3748',
                                                        outline: 'none',
                                                        cursor: isExpenseCategoriesLoading ? 'wait' : 'pointer',
                                                    }}
                                                >
                                                    <option value={0}>
                                                        {isExpenseCategoriesLoading
                                                            ? 'جاري التحميل...'
                                                            : 'اختر التصنيف...'}
                                                    </option>
                                                    {expenseCategories.map((c) => (
                                                        <option key={c.id} value={c.id}>
                                                            {c.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </Box>
                                            {!isExpenseCategoriesLoading && expenseCategories.length === 0 && (
                                                <Text fontSize="sm" color="red.600" mt={2}>
                                                    لا توجد تصنيفات. أضف التصنيفات من قسم{' '}
                                                    <Button
                                                        variant="plain"
                                                        color="#615b36"
                                                        fontWeight="bold"
                                                        textDecoration="underline"
                                                        h="auto"
                                                        minH={0}
                                                        p={0}
                                                        display="inline"
                                                        fontSize="sm"
                                                        onClick={() => {
                                                            onExpenseClose()
                                                            setTimeout(() => {
                                                                document
                                                                    .getElementById('expense-taxonomy')
                                                                    ?.scrollIntoView({ behavior: 'smooth' })
                                                            }, 0)
                                                        }}
                                                    >
                                                        أنواع المصروفات
                                                    </Button>{' '}
                                                    في الصفحة ثم أعد فتح هذه النافذة.
                                                </Text>
                                            )}
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label>
                                                <Flex align="center" gap={2} flexWrap="wrap">
                                                    <Text fontWeight="semibold">الفئة الفرعية</Text>
                                                    {isSubcategoriesLoading && (
                                                        <Spinner size="sm" color="#615b36" />
                                                    )}
                                                </Flex>
                                            </Field.Label>
                                            <Box
                                                borderWidth="1px"
                                                borderColor="gray.200"
                                                borderRadius="lg"
                                                overflow="hidden"
                                                bg={
                                                    expenseForm.category_id && expenseSubcategories.length > 0
                                                        ? 'gray.50'
                                                        : 'gray.100'
                                                }
                                            >
                                                <select
                                                    value={expenseForm.subcategory_id || 0}
                                                    onChange={(e) =>
                                                        setExpenseForm((p) => ({
                                                            ...p,
                                                            subcategory_id: Number(
                                                                (e.target as HTMLSelectElement).value,
                                                            ) || null,
                                                        }))
                                                    }
                                                    disabled={
                                                        !expenseForm.category_id ||
                                                        isSubcategoriesLoading ||
                                                        expenseSubcategories.length === 0
                                                    }
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px 14px',
                                                        border: 'none',
                                                        background: 'transparent',
                                                        color: '#2D3748',
                                                        outline: 'none',
                                                        cursor:
                                                            !expenseForm.category_id ||
                                                            isSubcategoriesLoading ||
                                                            expenseSubcategories.length === 0
                                                                ? 'not-allowed'
                                                                : 'pointer',
                                                    }}
                                                >
                                                    <option value={0}>اختر الفئة الفرعية...</option>
                                                    {expenseSubcategories.map((s) => (
                                                        <option key={s.id} value={s.id}>
                                                            {s.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </Box>
                                        </Field.Root>
                                    </Stack>
                                </Box>

                                <Box bg="white" borderRadius="xl" p={4} borderWidth="1px" borderColor="gray.100" shadow="sm">
                                    <Text fontSize="xs" fontWeight="bold" color="gray.500" letterSpacing="wide" mb={3}>
                                        تفاصيل إضافية
                                    </Text>
                                    <Stack gap={4}>
                                        <Field.Root>
                                            <Field.Label fontWeight="semibold">تاريخ المصروف</Field.Label>
                                            <Input
                                                type="date"
                                                value={expenseForm.date || ''}
                                                onChange={(e) =>
                                                    setExpenseForm((p) => ({ ...p, date: e.target.value }))
                                                }
                                                bg="gray.50"
                                                borderRadius="lg"
                                            />
                                        </Field.Root>
                                        <Field.Root>
                                            <Field.Label fontWeight="semibold">ملاحظات</Field.Label>
                                            <Textarea
                                                placeholder="رقم مرجعي، جهة الدفع، إلخ..."
                                                value={expenseForm.notes || ''}
                                                onChange={(e) =>
                                                    setExpenseForm((p) => ({ ...p, notes: e.target.value }))
                                                }
                                                rows={3}
                                                bg="gray.50"
                                                borderRadius="lg"
                                                resize="none"
                                            />
                                        </Field.Root>
                                    </Stack>
                                </Box>
                            </Stack>
                        </Dialog.Body>
                        <Dialog.Footer
                            bg="white"
                            borderTopWidth="1px"
                            borderColor="gray.100"
                            gap={3}
                            py={4}
                            px={6}
                        >
                            <Button variant="ghost" onClick={onExpenseClose} flex={1}>
                                إلغاء
                            </Button>
                            <Button
                                flex={1}
                                bg="red.600"
                                color="white"
                                _hover={{ bg: 'red.700' }}
                                size="lg"
                                borderRadius="xl"
                                onClick={handleAddExpense}
                                loading={expenseSaving}
                                disabled={
                                    !expenseForm.description?.trim() ||
                                    expenseForm.amount <= 0 ||
                                    !expenseForm.category_id
                                }
                            >
                                حفظ المصروف
                            </Button>
                        </Dialog.Footer>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Dialog.Root>
        </Box>
    )
}
