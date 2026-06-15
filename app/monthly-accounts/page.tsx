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
    Badge,
} from '@chakra-ui/react'
import { useState, useEffect, useMemo } from 'react'
import {
    Plus,
    Calendar,
    TrendingDown,
    FileText,
    Layers,
    Trash2,
    RefreshCw,
    ChevronDown,
    CheckCircle,
    AlertTriangle,
    Search,
    Download,
} from 'lucide-react'
import {
    ExpensesResponse,
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

function formatDateInputValue(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekRange(dateStr: string): { startDate: string; endDate: string } | null {
    if (!dateStr) return null
    const d = new Date(`${dateStr}T12:00:00`)
    if (Number.isNaN(d.getTime())) return null
    const day = d.getDay()
    const diffToMonday = (day + 6) % 7
    const start = new Date(d)
    start.setDate(d.getDate() - diffToMonday)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return {
        startDate: formatDateInputValue(start),
        endDate: formatDateInputValue(end),
    }
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

type PeriodMode = 'day' | 'week' | 'month' | 'days' | 'months'
type FinancialPaymentStatus =
    | 'all'
    | 'paid'
    | 'unpaid'
    | 'partial'
    | 'overpaid'
    | 'zero_due'
    | 'outstanding'
    | 'with_payment'
    | 'without_payment'
type FinancialPaymentMethod = 'all' | 'cash' | 'vodafone_cash' | 'instapay' | 'visa'

interface FinancialDoctorRow {
    doctorId?: number | null
    doctorName?: string
    specialty?: string
    phone?: string
    grossIncome?: number
    totalCollected?: number
    totalOutstanding?: number
    totalBookings?: number
    casesWithPayments?: number
    casesWithoutPayments?: number
    fullyPaidCases?: number
    outstandingCases?: number
    partialCases?: number
    overpaidCases?: number
}

interface FinancialTrendRow {
    periodStart?: string
    bookingCount?: number
    grossIncome?: number
    totalCollected?: number
    totalOutstanding?: number
}

interface FinancialReportResponse {
    period?: {
        type?: string
        startDate?: string
        endDate?: string
        label?: string
    }
    cards?: {
        totalIncome?: number
        totalPayments?: number
        totalOutstanding?: number
        totalBookings?: number
        paidCases?: number
        unpaidCases?: number
    }
    summary?: {
        grossIncome?: number
        totalCollected?: number
        totalOutstanding?: number
        paymentBreakdownMatchesCollected?: boolean
        paymentBreakdown?: Array<{
            method?: string
            label?: string
            amount?: number
            count?: number
        }>
        byDoctor?: FinancialDoctorRow[]
    }
    charts?: {
        paymentMethodDistribution?: Array<{
            method?: string
            label?: string
            amount?: number
            count?: number
        }>
        dailyIncome?: FinancialTrendRow[]
        weeklyIncome?: FinancialTrendRow[]
        monthlyIncome?: FinancialTrendRow[]
        doctorIncomeDistribution?: FinancialDoctorRow[]
    }
    validation?: {
        isBalanced?: boolean
        checks?: Record<string, boolean>
        excludedCancelledOrRejectedBookings?: number
        anomalies?: Record<string, number>
    }
}

interface FinancialCaseRow {
    bookingId: number
    patientName: string
    phone?: string
    bookingDate?: string
    service?: string
    bookingValue?: number
    totalAmount?: number
    amountPaid?: number
    remainingAmount?: number
    paymentStatus?: string
    paymentStatusLabel?: string
    paymentMethods?: Array<{
        method?: string
        label?: string
        amount?: number
        transferFromPhone?: string
    }>
    doctorId?: number
    doctorName?: string
    doctorSpecialty?: string
}

interface FinancialCasesResponse {
    total?: number
    page?: number
    limit?: number
    totalPages?: number
    cases?: FinancialCaseRow[]
}

const validationCheckLabels: Record<string, string> = {
    cancelledBookingsExcluded: 'استبعاد الملغي والمرفوض',
    paymentMethodsMatchCollected: 'وسائل الدفع تطابق المحصل',
    noPaymentAmountMismatch: 'لا يوجد اختلاف في مبالغ الدفع',
    noMissingPaymentMethodForPaidBookings: 'لا يوجد دفع بدون وسيلة دفع',
    noOverpaidBookings: 'لا توجد مدفوعات زائدة',
    noNegativeAmounts: 'لا توجد قيم سالبة',
    noDuplicatePaymentCandidates: 'لا توجد احتمالات تكرار دفع',
}

const validationAnomalyLabels: Record<string, string> = {
    paymentMismatchCount: 'اختلافات مبالغ الدفع',
    missingPaymentMethodCount: 'مدفوعات بدون وسيلة',
    overpaidCount: 'مدفوعات زائدة',
    negativeAmountCount: 'قيم سالبة',
    duplicatePaymentCandidateCount: 'احتمالات تكرار دفع',
}

export default function MonthlyAccountsPage() {
    const [periodMode, setPeriodMode] = useState<PeriodMode>('month')
    const [dayDate, setDayDate] = useState<string>(getToday())
    const [weekDate, setWeekDate] = useState<string>(getToday())
    const [month, setMonth] = useState<string>(getCurrentMonth())
    const [startDate, setStartDate] = useState<string>(() => {
        const d = new Date()
        d.setDate(1)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    })
    const [endDate, setEndDate] = useState<string>(getToday())
    const [startMonth, setStartMonth] = useState<string>(getCurrentMonth())
    const [endMonth, setEndMonth] = useState<string>(getCurrentMonth())

    const [expenses, setExpenses] = useState<ExpensesResponse | null>(null)
    const [financialReport, setFinancialReport] = useState<FinancialReportResponse | null>(null)
    const [financialCases, setFinancialCases] = useState<FinancialCasesResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isFinancialCasesLoading, setIsFinancialCasesLoading] = useState(false)
    const [isExportingFinancialReport, setIsExportingFinancialReport] = useState(false)
    const [expenseSaving, setExpenseSaving] = useState(false)

    const { open: isExpenseOpen, onOpen: onExpenseOpen, onClose: onExpenseClose } = useDisclosure()

    const [filterExpenseCat, setFilterExpenseCat] = useState<string>('all')
    const [bookingsByDoctorOpen, setBookingsByDoctorOpen] = useState(false)
    const [financialReportOpen, setFinancialReportOpen] = useState(false)
    const [financialSearch, setFinancialSearch] = useState('')
    const [financialPaymentStatus, setFinancialPaymentStatus] =
        useState<FinancialPaymentStatus>('all')
    const [financialPaymentMethod, setFinancialPaymentMethod] =
        useState<FinancialPaymentMethod>('all')
    const [financialCasesPage, setFinancialCasesPage] = useState(1)

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

    const [expenseForm, setExpenseForm] = useState<AddExpenseBody>({
        description: '',
        amount: 0,
        notes: '',
        date: getToday(),
        category_id: 0,
        subcategory_id: 0,
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

    /** معاملات الفترة للواجهات القديمة مثل المصروفات. */
    const periodParams = useMemo(() => {
        if (periodMode === 'day') return dayDate ? { startDate: dayDate, endDate: dayDate } : {}
        if (periodMode === 'week') {
            const range = getWeekRange(weekDate)
            return range ?? {}
        }
        if (periodMode === 'month') return month ? { month } : {}
        if (periodMode === 'days') return startDate && endDate ? { startDate, endDate } : {}
        if (periodMode === 'months') return startMonth && endMonth ? { startMonth, endMonth } : {}
        return {}
    }, [periodMode, dayDate, weekDate, month, startDate, endDate, startMonth, endMonth])

    const financialPeriodParams = useMemo(() => {
        if (periodMode === 'day') return dayDate ? { date: dayDate } : {}
        if (periodMode === 'week') return weekDate ? { period: 'week', date: weekDate } : {}
        if (periodMode === 'month') return month ? { month } : {}
        if (periodMode === 'days') return startDate && endDate ? { startDate, endDate } : {}
        if (periodMode === 'months' && startMonth && endMonth) {
            const [endYear, endMonthNumber] = endMonth.split('-').map(Number)
            const lastDay = new Date(endYear, endMonthNumber, 0).getDate()
            return {
                startDate: `${startMonth}-01`,
                endDate: `${endMonth}-${String(lastDay).padStart(2, '0')}`,
            }
        }
        return {}
    }, [periodMode, dayDate, weekDate, month, startDate, endDate, startMonth, endMonth])

    const financialCasesPeriodParams = useMemo(() => {
        if (periodMode === 'day') return dayDate ? { date: dayDate } : {}
        if (periodMode === 'week') {
            const range = getWeekRange(weekDate)
            return range ?? {}
        }
        return financialPeriodParams
    }, [periodMode, dayDate, weekDate, financialPeriodParams])

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

    const fetchFinancialCases = async (page = financialCasesPage) => {
        if (periodValidationError) return
        setIsFinancialCasesLoading(true)
        try {
            const params: Record<string, string | number> = {
                page,
                limit: 25,
                sortBy: 'bookingDate',
                sortDir: 'desc',
            }
            for (const [key, value] of Object.entries(financialCasesPeriodParams)) {
                if (value != null) params[key] = value
            }
            if (financialPaymentStatus !== 'all') params.paymentStatus = financialPaymentStatus
            if (financialPaymentMethod !== 'all') params.paymentMethod = financialPaymentMethod
            if (financialSearch.trim()) params.search = financialSearch.trim()

            const res = await api.get<FinancialCasesResponse>('/accounts/financial-report/cases', {
                params,
            })
            setFinancialCases(res.data)
        } catch (error: unknown) {
            setFinancialCases(null)
            toaster.create({
                title: 'خطأ في جلب جدول الحالات المالي',
                description: messageFromApi(error, 'حدث خطأ أثناء جلب الحالات'),
                type: 'error',
                duration: 3000,
            })
        } finally {
            setIsFinancialCasesLoading(false)
        }
    }

    const fetchAll = async () => {
        if (periodValidationError) return
        setIsLoading(true)
        try {
            await api.get<{ message?: string }>('/accounts')
            const [expensesRes, financialReportRes, financialCasesRes] = await Promise.all([
                api.get<ExpensesResponse>('/accounts/expenses', { params: periodParams }),
                api.get<FinancialReportResponse>('/accounts/financial-report', {
                    params: financialPeriodParams,
                }),
                api.get<FinancialCasesResponse>('/accounts/financial-report/cases', {
                    params: { ...financialCasesPeriodParams, page: 1, limit: 25, sortBy: 'bookingDate', sortDir: 'desc' },
                }),
            ])
            setExpenses(expensesRes.data)
            setFinancialReport(financialReportRes.data)
            setFinancialCases(financialCasesRes.data)
            setFinancialCasesPage(1)
        } catch (error: unknown) {
            setExpenses(null)
            setFinancialReport(null)
            setFinancialCases(null)
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
    }, [periodMode, dayDate, weekDate, month, startDate, endDate, startMonth, endMonth, periodValidationError])

    useEffect(() => {
        if (periodValidationError || isLoading) return
        void fetchFinancialCases(financialCasesPage)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [financialPaymentStatus, financialPaymentMethod, financialSearch, financialCasesPage])

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
                subcategory_id: subs[0]?.id ?? 0,
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
    }, [isExpenseOpen])

    useEffect(() => {
        if (expenseCategories.length > 0 && !expenseForm.category_id) {
            const firstId = expenseCategories[0]?.id
            if (firstId) fetchExpenseSubcategories(firstId)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expenseCategories])

    const handleAddExpense = async () => {
        if (!expenseForm.description?.trim() || expenseForm.amount <= 0 || !expenseForm.category_id || !expenseForm.subcategory_id) {
            toaster.create({ title: 'أدخل الوصف والمبلغ', type: 'warning', duration: 2000 })
            return
        }
        setExpenseSaving(true)
        try {
            await api.post('/accounts/expenses', {
                description: expenseForm.description.trim(),
                amount: expenseForm.amount,
                category_id: expenseForm.category_id,
                subcategory_id: expenseForm.subcategory_id,
                ...(expenseForm.date ? { date: expenseForm.date } : {}),
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
                subcategory_id: expenseForm.subcategory_id || expenseSubcategories[0]?.id || 0,
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

    const handleExportFinancialReport = async (format: 'excel' | 'pdf' | 'print' = 'excel') => {
        setIsExportingFinancialReport(true)
        try {
            const res = await api.get('/accounts/financial-report/export', {
                params: { ...financialPeriodParams, format },
                responseType: 'blob',
            })
            const mime =
                format === 'pdf'
                    ? 'application/pdf'
                    : format === 'print'
                      ? 'text/html'
                      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            const blob = new Blob([res.data], { type: mime })
            const url = URL.createObjectURL(blob)
            if (format === 'print') {
                window.open(url, '_blank', 'noopener,noreferrer')
                return
            }
            const a = document.createElement('a')
            const label =
                financialReport?.period?.label ||
                financialReport?.period?.startDate ||
                getToday()
            a.href = url
            a.download = `financial-report-${String(label).replace(/[\\/:*?"<>|]/g, '-')}.${format === 'pdf' ? 'pdf' : 'xlsx'}`
            document.body.appendChild(a)
            a.click()
            a.remove()
            URL.revokeObjectURL(url)
        } catch (error: unknown) {
            toaster.create({
                title: 'فشل تصدير التقرير',
                description: messageFromApi(error, 'حدث خطأ أثناء تصدير ملف Excel'),
                type: 'error',
                duration: 3000,
            })
        } finally {
            setIsExportingFinancialReport(false)
        }
    }

    const formatAmount = (n: number | string | null | undefined) =>
        Math.round(typeof n === 'number' ? n : parseFloat(String(n ?? 0)) || 0).toString()
    const formatDate = (d: string) => new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })

    const paymentStatusColor = (status?: string) => {
        if (status === 'paid') return 'green'
        if (status === 'partial' || status === 'outstanding') return 'orange'
        if (status === 'unpaid') return 'red'
        if (status === 'overpaid') return 'purple'
        if (status === 'zero_due') return 'gray'
        return 'gray'
    }

    const paymentBreakdownRows = useMemo(
        () =>
            financialReport?.charts?.paymentMethodDistribution ??
            financialReport?.summary?.paymentBreakdown ??
            [],
        [financialReport],
    )

    const doctorRows = useMemo(
        () =>
            financialReport?.summary?.byDoctor ??
            financialReport?.charts?.doctorIncomeDistribution ??
            [],
        [financialReport],
    )

    const trendRows = useMemo(() => {
        if (!financialReport?.charts) return []
        if (periodMode === 'months') return financialReport.charts.monthlyIncome ?? []
        if (periodMode === 'week') {
            return financialReport.charts.dailyIncome?.length
                ? financialReport.charts.dailyIncome
                : financialReport.charts.weeklyIncome ?? []
        }
        if (periodMode === 'month') return financialReport.charts.dailyIncome ?? []
        return (
            financialReport.charts.dailyIncome ??
            financialReport.charts.weeklyIncome ??
            financialReport.charts.monthlyIncome ??
            []
        )
    }, [financialReport, periodMode])

    const validationChecks = useMemo(
        () => Object.entries(financialReport?.validation?.checks ?? {}),
        [financialReport],
    )

    const validationAnomalies = useMemo(
        () =>
            Object.entries(financialReport?.validation?.anomalies ?? {}).filter(
                ([, count]) => Number(count) > 0,
            ),
        [financialReport],
    )

    const periodLabel = (() => {
        if (financialReport?.period?.label) return financialReport.period.label
        if (periodMode === 'day' && dayDate) return formatDateWithDay(dayDate)
        if (periodMode === 'week' && weekDate) {
            const range = getWeekRange(weekDate)
            return range
                ? `أسبوع ${formatDateWithDay(range.startDate)} — ${formatDateWithDay(range.endDate)}`
                : 'أسبوع كامل'
        }
        if (periodMode === 'days' && startDate && endDate)
            return `${formatDateWithDay(startDate)} — ${formatDateWithDay(endDate)}`
        if (periodMode === 'month' && month)
            return new Date(month + '-01').toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
        if (periodMode === 'months' && startMonth && endMonth)
            return `${new Date(startMonth + '-01').toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })} — ${new Date(endMonth + '-01').toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}`
        return 'الفترة'
    })()

    return (
        <Box minH="100vh" bg="#f0f1f3" dir="rtl">
            {/* Header */}
            <Box bg="linear-gradient(135deg, #615b36 0%, #7a7350 50%, #8a8260 100%)" py={8} px={4}>
                <Container maxW="6xl">
                    <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
                        <Box>
                            <Heading size="xl" color="white" mb={1}>
                                الحسابات والتقارير المالية
                            </Heading>
                            <Flex align="center" gap={2} color="whiteAlpha.900" fontSize="md">
                                <Calendar size={18} />
                                <Text>الفترة: {periodLabel}</Text>
                            </Flex>
                        </Box>
                        <Box bg="whiteAlpha.100" borderRadius="xl" p={3}>
                            <Tabs.Root value={periodMode} onValueChange={(e) => setPeriodMode(e.value as PeriodMode)} size="sm">
                                <Tabs.List gap={1} flexWrap="wrap">
                                    <Tabs.Trigger value="day">يوم محدد</Tabs.Trigger>
                                    <Tabs.Trigger value="week">أسبوع كامل</Tabs.Trigger>
                                    <Tabs.Trigger value="month">شهر واحد</Tabs.Trigger>
                                    <Tabs.Trigger value="days">نطاق أيام</Tabs.Trigger>
                                    <Tabs.Trigger value="months">نطاق شهور</Tabs.Trigger>
                                </Tabs.List>
                                <Box mt={3} display="flex" flexWrap="wrap" gap={3} alignItems="center">
                                    {periodMode === 'day' && (
                                        <HStack>
                                            <Text color="whiteAlpha.900" fontSize="sm">اليوم</Text>
                                            <Input
                                                type="date"
                                                value={dayDate}
                                                onChange={(e) => setDayDate(e.target.value)}
                                                bg="white"
                                                color="gray.800"
                                                maxW="160px"
                                                size="sm"
                                            />
                                        </HStack>
                                    )}
                                    {periodMode === 'week' && (
                                        <HStack>
                                            <Text color="whiteAlpha.900" fontSize="sm">أي يوم داخل الأسبوع</Text>
                                            <Input
                                                type="date"
                                                value={weekDate}
                                                onChange={(e) => setWeekDate(e.target.value)}
                                                bg="white"
                                                color="gray.800"
                                                maxW="160px"
                                                size="sm"
                                            />
                                        </HStack>
                                    )}
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
                        {financialReport && (
                            <Card.Root bg="white" shadow="lg" borderRadius="2xl" overflow="hidden" mb={8}>
                                <Box
                                    bg="linear-gradient(135deg, #2d6a4f 0%, #40916c 55%, #1b4332 100%)"
                                    px={{ base: 4, md: 6 }}
                                    py={5}
                                >
                                    <Flex justify="space-between" align="center" gap={4} flexWrap="wrap">
                                        <Box>
                                            <Heading size="lg" color="white">
                                                التقرير المالي للحجوزات
                                            </Heading>
                                            <Text color="whiteAlpha.900" fontSize="sm" mt={1}>
                                                مبني على بيانات الحجوزات الفعلية وطرق الدفع المقسمة.
                                            </Text>
                                            {financialReport.period?.startDate && (
                                                <Text color="whiteAlpha.800" fontSize="xs" mt={2}>
                                                    {financialReport.period.startDate}
                                                    {financialReport.period.endDate &&
                                                        financialReport.period.endDate !== financialReport.period.startDate
                                                        ? ` — ${financialReport.period.endDate}`
                                                        : ''}
                                                </Text>
                                            )}
                                        </Box>
                                        <HStack gap={2} flexWrap="wrap">
                                            <Button
                                                variant="outline"
                                                borderColor="whiteAlpha.600"
                                                color="white"
                                                _hover={{ bg: 'whiteAlpha.200' }}
                                                onClick={() => setFinancialReportOpen((open) => !open)}
                                                aria-expanded={financialReportOpen}
                                                gap={2}
                                            >
                                                <ChevronDown
                                                    size={18}
                                                    style={{
                                                        transform: financialReportOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                                        transition: 'transform 0.2s ease',
                                                    }}
                                                />
                                                {financialReportOpen ? 'إخفاء التقرير' : 'عرض التقرير'}
                                            </Button>
                                            <Button
                                                bg="white"
                                                color="#1b4332"
                                                _hover={{ bg: 'whiteAlpha.900' }}
                                                loading={isExportingFinancialReport}
                                                onClick={() => handleExportFinancialReport('excel')}
                                                gap={2}
                                            >
                                                <Download size={18} />
                                                Excel
                                            </Button>
                                            <Button
                                                variant="outline"
                                                borderColor="whiteAlpha.600"
                                                color="white"
                                                _hover={{ bg: 'whiteAlpha.200' }}
                                                loading={isExportingFinancialReport}
                                                onClick={() => handleExportFinancialReport('pdf')}
                                                gap={2}
                                            >
                                                <FileText size={18} />
                                                PDF
                                            </Button>
                                            <Button
                                                variant="outline"
                                                borderColor="whiteAlpha.600"
                                                color="white"
                                                _hover={{ bg: 'whiteAlpha.200' }}
                                                loading={isExportingFinancialReport}
                                                onClick={() => handleExportFinancialReport('print')}
                                            >
                                                طباعة
                                            </Button>
                                        </HStack>
                                    </Flex>
                                </Box>

                                {financialReportOpen && (
                                <Card.Body p={{ base: 4, md: 6 }}>
                                    <SimpleGrid columns={{ base: 1, sm: 2, lg: 6 }} gap={4} mb={6}>
                                        <Card.Root bg="green.50" borderWidth="1px" borderColor="green.100">
                                            <Card.Body p={4}>
                                                <Text fontSize="xs" color="gray.600" fontWeight="bold">
                                                    إجمالي قيمة الحجوزات
                                                </Text>
                                                <Text fontSize="xl" fontWeight="bold" color="green.700">
                                                    {formatAmount(financialReport.cards?.totalIncome ?? financialReport.summary?.grossIncome)} EGP
                                                </Text>
                                            </Card.Body>
                                        </Card.Root>
                                        <Card.Root bg="blue.50" borderWidth="1px" borderColor="blue.100">
                                            <Card.Body p={4}>
                                                <Text fontSize="xs" color="gray.600" fontWeight="bold">
                                                    إجمالي المحصل
                                                </Text>
                                                <Text fontSize="xl" fontWeight="bold" color="blue.700">
                                                    {formatAmount(financialReport.cards?.totalPayments ?? financialReport.summary?.totalCollected)} EGP
                                                </Text>
                                            </Card.Body>
                                        </Card.Root>
                                        <Card.Root bg="orange.50" borderWidth="1px" borderColor="orange.100">
                                            <Card.Body p={4}>
                                                <Text fontSize="xs" color="gray.600" fontWeight="bold">
                                                    إجمالي المتبقي
                                                </Text>
                                                <Text fontSize="xl" fontWeight="bold" color="orange.700">
                                                    {formatAmount(financialReport.cards?.totalOutstanding ?? financialReport.summary?.totalOutstanding)} EGP
                                                </Text>
                                            </Card.Body>
                                        </Card.Root>
                                        <Card.Root bg="#fdfbf7" borderWidth="1px" borderColor="#e8e4d4">
                                            <Card.Body p={4}>
                                                <Text fontSize="xs" color="gray.600" fontWeight="bold">
                                                    عدد الحجوزات
                                                </Text>
                                                <Text fontSize="xl" fontWeight="bold" color="#615b36">
                                                    {financialReport.cards?.totalBookings ?? 0}
                                                </Text>
                                            </Card.Body>
                                        </Card.Root>
                                        <Card.Root bg="green.50" borderWidth="1px" borderColor="green.100">
                                            <Card.Body p={4}>
                                                <Text fontSize="xs" color="gray.600" fontWeight="bold">
                                                    حالات مدفوعة
                                                </Text>
                                                <Text fontSize="xl" fontWeight="bold" color="green.700">
                                                    {financialReport.cards?.paidCases ?? 0}
                                                </Text>
                                            </Card.Body>
                                        </Card.Root>
                                        <Card.Root bg="red.50" borderWidth="1px" borderColor="red.100">
                                            <Card.Body p={4}>
                                                <Text fontSize="xs" color="gray.600" fontWeight="bold">
                                                    حالات غير مدفوعة
                                                </Text>
                                                <Text fontSize="xl" fontWeight="bold" color="red.700">
                                                    {financialReport.cards?.unpaidCases ?? 0}
                                                </Text>
                                            </Card.Body>
                                        </Card.Root>
                                    </SimpleGrid>

                                    <SimpleGrid columns={{ base: 1, lg: 2 }} gap={4} mb={6}>
                                        <Box
                                            p={4}
                                            bg={financialReport.validation?.isBalanced ? 'green.50' : 'orange.50'}
                                            borderRadius="xl"
                                            borderWidth="1px"
                                            borderColor={financialReport.validation?.isBalanced ? 'green.100' : 'orange.100'}
                                        >
                                            <Flex align="center" gap={2} mb={2}>
                                                {financialReport.validation?.isBalanced ? (
                                                    <CheckCircle size={20} color="#15803d" />
                                                ) : (
                                                    <AlertTriangle size={20} color="#c2410c" />
                                                )}
                                                <Text fontWeight="bold" color="gray.800">
                                                    {financialReport.validation?.isBalanced
                                                        ? 'التقرير متوازن محاسبيًا'
                                                        : 'يوجد ملاحظات محاسبية'}
                                                </Text>
                                            </Flex>
                                            <Text fontSize="sm" color="gray.600">
                                                تطابق توزيع وسائل الدفع مع إجمالي المحصل:{' '}
                                                {financialReport.summary?.paymentBreakdownMatchesCollected ? 'نعم' : 'لا'}
                                            </Text>
                                            {financialReport.validation?.excludedCancelledOrRejectedBookings != null && (
                                                <Text fontSize="xs" color="gray.500" mt={1}>
                                                    تم استبعاد {financialReport.validation.excludedCancelledOrRejectedBookings} حجز ملغي/مرفوض.
                                                </Text>
                                            )}
                                            {validationChecks.length > 0 && (
                                                <Flex gap={2} wrap="wrap" mt={3}>
                                                    {validationChecks.map(([key, ok]) => (
                                                        <Badge
                                                            key={key}
                                                            colorPalette={ok ? 'green' : 'orange'}
                                                            variant="subtle"
                                                            borderRadius="full"
                                                            px={3}
                                                            py={1}
                                                        >
                                                            {validationCheckLabels[key] ?? key}: {ok ? 'سليم' : 'مراجعة'}
                                                        </Badge>
                                                    ))}
                                                </Flex>
                                            )}
                                            {validationAnomalies.length > 0 && (
                                                <Flex gap={2} wrap="wrap" mt={3}>
                                                    {validationAnomalies.map(([key, count]) => (
                                                        <Badge
                                                            key={key}
                                                            colorPalette="red"
                                                            variant="subtle"
                                                            borderRadius="full"
                                                            px={3}
                                                            py={1}
                                                        >
                                                            {validationAnomalyLabels[key] ?? key}: {count}
                                                        </Badge>
                                                    ))}
                                                </Flex>
                                            )}
                                        </Box>

                                        <Box p={4} bg="gray.50" borderRadius="xl" borderWidth="1px" borderColor="gray.100">
                                            <Text fontWeight="bold" color="gray.800" mb={3}>
                                                توزيع المدفوعات حسب الوسيلة
                                            </Text>
                                            <Flex gap={2} wrap="wrap">
                                                {paymentBreakdownRows.map((row, idx) => (
                                                    <Badge
                                                        key={`${row.method || row.label}-${idx}`}
                                                        colorPalette="green"
                                                        variant="subtle"
                                                        borderRadius="full"
                                                        px={3}
                                                        py={1}
                                                    >
                                                        {row.label || row.method || 'غير محدد'}: {formatAmount(row.amount)} EGP
                                                        {row.count != null ? ` (${row.count})` : ''}
                                                    </Badge>
                                                ))}
                                                {paymentBreakdownRows.length === 0 && (
                                                    <Text fontSize="sm" color="gray.500">لا توجد مدفوعات في الفترة.</Text>
                                                )}
                                            </Flex>
                                        </Box>
                                    </SimpleGrid>

                                    <SimpleGrid columns={{ base: 1, xl: 2 }} gap={4} mb={6}>
                                        <Box borderWidth="1px" borderColor="gray.100" borderRadius="xl" overflow="hidden">
                                            <Box bg="#f8fafc" p={4} borderBottomWidth="1px" borderColor="gray.100">
                                                <Heading size="md" color="#2d3748">
                                                    حسابات الأطباء
                                                </Heading>
                                                <Text fontSize="sm" color="gray.500" mt={1}>
                                                    إجمالي المستحق والمحصل والمتبقي لكل طبيب داخل الفترة.
                                                </Text>
                                            </Box>
                                            <Box overflowX="auto">
                                                <Table.Root size="sm">
                                                    <Table.Header bg="gray.50">
                                                        <Table.Row>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">الطبيب</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">الحجوزات</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">المستحق</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">المحصل</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">المتبقي</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">الحالات</Table.ColumnHeader>
                                                        </Table.Row>
                                                    </Table.Header>
                                                    <Table.Body>
                                                        {doctorRows.length > 0 ? (
                                                            doctorRows.map((doctor, idx) => (
                                                                <Table.Row key={doctor.doctorId ?? `doctor-${idx}`}>
                                                                    <Table.Cell py={3} px={3}>
                                                                        <Text fontWeight="bold">
                                                                            {doctor.doctorName || (doctor.doctorId ? `طبيب #${doctor.doctorId}` : 'بدون طبيب')}
                                                                        </Text>
                                                                        {(doctor.specialty || doctor.phone) && (
                                                                            <Text fontSize="xs" color="gray.500">
                                                                                {[doctor.specialty, doctor.phone].filter(Boolean).join(' - ')}
                                                                            </Text>
                                                                        )}
                                                                    </Table.Cell>
                                                                    <Table.Cell py={3} px={3}>{doctor.totalBookings ?? 0}</Table.Cell>
                                                                    <Table.Cell py={3} px={3}>{formatAmount(doctor.grossIncome)} EGP</Table.Cell>
                                                                    <Table.Cell py={3} px={3} color="green.700" fontWeight="bold">
                                                                        {formatAmount(doctor.totalCollected)} EGP
                                                                    </Table.Cell>
                                                                    <Table.Cell py={3} px={3} color={Number(doctor.totalOutstanding ?? 0) > 0 ? 'orange.700' : 'gray.500'} fontWeight="bold">
                                                                        {formatAmount(doctor.totalOutstanding)} EGP
                                                                    </Table.Cell>
                                                                    <Table.Cell py={3} px={3}>
                                                                        <Flex gap={1} wrap="wrap">
                                                                            <Badge colorPalette="green" variant="subtle">مدفوع {doctor.fullyPaidCases ?? 0}</Badge>
                                                                            <Badge colorPalette="orange" variant="subtle">متبقي {doctor.outstandingCases ?? 0}</Badge>
                                                                            {doctor.partialCases != null && (
                                                                                <Badge colorPalette="yellow" variant="subtle">جزئي {doctor.partialCases}</Badge>
                                                                            )}
                                                                            {doctor.overpaidCases != null && doctor.overpaidCases > 0 && (
                                                                                <Badge colorPalette="purple" variant="subtle">زائد {doctor.overpaidCases}</Badge>
                                                                            )}
                                                                        </Flex>
                                                                    </Table.Cell>
                                                                </Table.Row>
                                                            ))
                                                        ) : (
                                                            <Table.Row>
                                                                <Table.Cell colSpan={6} py={8} textAlign="center" color="gray.500">
                                                                    لا توجد بيانات أطباء في الفترة.
                                                                </Table.Cell>
                                                            </Table.Row>
                                                        )}
                                                    </Table.Body>
                                                </Table.Root>
                                            </Box>
                                        </Box>

                                        <Box borderWidth="1px" borderColor="gray.100" borderRadius="xl" overflow="hidden">
                                            <Box bg="#f8fafc" p={4} borderBottomWidth="1px" borderColor="gray.100">
                                                <Heading size="md" color="#2d3748">
                                                    تطور الدخل
                                                </Heading>
                                                <Text fontSize="sm" color="gray.500" mt={1}>
                                                    ملخص سريع من بيانات الرسوم البيانية اليومية/الأسبوعية/الشهرية.
                                                </Text>
                                            </Box>
                                            <Box overflowX="auto">
                                                <Table.Root size="sm">
                                                    <Table.Header bg="gray.50">
                                                        <Table.Row>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">الفترة</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">الحجوزات</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">المستحق</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">المحصل</Table.ColumnHeader>
                                                            <Table.ColumnHeader py={3} px={3} textAlign="right">المتبقي</Table.ColumnHeader>
                                                        </Table.Row>
                                                    </Table.Header>
                                                    <Table.Body>
                                                        {trendRows.length > 0 ? (
                                                            trendRows.slice(0, 10).map((row, idx) => (
                                                                <Table.Row key={`${row.periodStart ?? 'period'}-${idx}`}>
                                                                    <Table.Cell py={3} px={3}>{row.periodStart || '—'}</Table.Cell>
                                                                    <Table.Cell py={3} px={3}>{row.bookingCount ?? 0}</Table.Cell>
                                                                    <Table.Cell py={3} px={3}>{formatAmount(row.grossIncome)} EGP</Table.Cell>
                                                                    <Table.Cell py={3} px={3} color="green.700" fontWeight="bold">
                                                                        {formatAmount(row.totalCollected)} EGP
                                                                    </Table.Cell>
                                                                    <Table.Cell py={3} px={3} color={Number(row.totalOutstanding ?? 0) > 0 ? 'orange.700' : 'gray.500'} fontWeight="bold">
                                                                        {formatAmount(row.totalOutstanding)} EGP
                                                                    </Table.Cell>
                                                                </Table.Row>
                                                            ))
                                                        ) : (
                                                            <Table.Row>
                                                                <Table.Cell colSpan={5} py={8} textAlign="center" color="gray.500">
                                                                    لا توجد بيانات ترند في الفترة.
                                                                </Table.Cell>
                                                            </Table.Row>
                                                        )}
                                                    </Table.Body>
                                                </Table.Root>
                                            </Box>
                                        </Box>
                                    </SimpleGrid>

                                    <Box borderWidth="1px" borderColor="gray.100" borderRadius="xl" overflow="hidden">
                                        <Box bg="#f8fafc" p={4} borderBottomWidth="1px" borderColor="gray.100">
                                            <Flex justify="space-between" align="center" gap={3} wrap="wrap">
                                                <Box>
                                                    <Heading size="md" color="#2d3748">
                                                        جدول الحالات المالي
                                                    </Heading>
                                                    <Text fontSize="sm" color="gray.500" mt={1}>
                                                        بحث وتصفية حسب حالة الدفع ووسيلة الدفع.
                                                    </Text>
                                                </Box>
                                                <Badge colorPalette="gray" variant="subtle" borderRadius="full" px={3}>
                                                    {financialCases?.total ?? 0} حالة
                                                </Badge>
                                            </Flex>
                                            <Flex gap={3} mt={4} wrap="wrap">
                                                <Box flex="1" minW="220px" position="relative">
                                                    <Input
                                                        placeholder="بحث باسم الحالة أو الهاتف أو الخدمة"
                                                        value={financialSearch}
                                                        onChange={(e) => {
                                                            setFinancialSearch(e.target.value)
                                                            setFinancialCasesPage(1)
                                                        }}
                                                        bg="white"
                                                        pr={9}
                                                    />
                                                    <Box position="absolute" right={3} top="50%" transform="translateY(-50%)" color="gray.400">
                                                        <Search size={16} />
                                                    </Box>
                                                </Box>
                                                <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" px={2}>
                                                    <select
                                                        value={financialPaymentStatus}
                                                        onChange={(e) => {
                                                            setFinancialPaymentStatus(e.target.value as FinancialPaymentStatus)
                                                            setFinancialCasesPage(1)
                                                        }}
                                                        style={{ padding: '9px', background: 'transparent', outline: 'none' }}
                                                    >
                                                        <option value="all">كل حالات الدفع</option>
                                                        <option value="paid">مدفوع بالكامل</option>
                                                        <option value="partial">مدفوع جزئيًا</option>
                                                        <option value="unpaid">غير مدفوع</option>
                                                        <option value="outstanding">عليه متبقي</option>
                                                        <option value="with_payment">به أي دفع</option>
                                                        <option value="without_payment">بدون دفع</option>
                                                    </select>
                                                </Box>
                                                <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" px={2}>
                                                    <select
                                                        value={financialPaymentMethod}
                                                        onChange={(e) => {
                                                            setFinancialPaymentMethod(e.target.value as FinancialPaymentMethod)
                                                            setFinancialCasesPage(1)
                                                        }}
                                                        style={{ padding: '9px', background: 'transparent', outline: 'none' }}
                                                    >
                                                        <option value="all">كل طرق الدفع</option>
                                                        <option value="cash">نقدي</option>
                                                        <option value="vodafone_cash">فودافون كاش</option>
                                                        <option value="instapay">إنستا باي</option>
                                                        <option value="visa">فيزا</option>
                                                    </select>
                                                </Box>
                                            </Flex>
                                        </Box>

                                        <Box overflowX="auto">
                                            <Table.Root size="sm">
                                                <Table.Header bg="gray.50">
                                                    <Table.Row>
                                                        <Table.ColumnHeader py={3} px={3} textAlign="right">الحالة</Table.ColumnHeader>
                                                        <Table.ColumnHeader py={3} px={3} textAlign="right">التاريخ</Table.ColumnHeader>
                                                        <Table.ColumnHeader py={3} px={3} textAlign="right">الخدمة</Table.ColumnHeader>
                                                        <Table.ColumnHeader py={3} px={3} textAlign="right">قيمة الحجز</Table.ColumnHeader>
                                                        <Table.ColumnHeader py={3} px={3} textAlign="right">المدفوع</Table.ColumnHeader>
                                                        <Table.ColumnHeader py={3} px={3} textAlign="right">المتبقي</Table.ColumnHeader>
                                                        <Table.ColumnHeader py={3} px={3} textAlign="right">حالة الدفع</Table.ColumnHeader>
                                                        <Table.ColumnHeader py={3} px={3} textAlign="right">طرق الدفع</Table.ColumnHeader>
                                                    </Table.Row>
                                                </Table.Header>
                                                <Table.Body>
                                                    {isFinancialCasesLoading ? (
                                                        <Table.Row>
                                                            <Table.Cell colSpan={8} py={10} textAlign="center">
                                                                <Spinner color="#615b36" />
                                                            </Table.Cell>
                                                        </Table.Row>
                                                    ) : financialCases?.cases && financialCases.cases.length > 0 ? (
                                                        financialCases.cases.map((row) => (
                                                            <Table.Row key={row.bookingId}>
                                                                <Table.Cell py={3} px={3}>
                                                                    <Text fontWeight="bold">{row.patientName}</Text>
                                                                    <Text fontSize="xs" color="gray.500" dir="ltr" textAlign="right">{row.phone || '—'}</Text>
                                                                    {row.doctorName && (
                                                                        <Text fontSize="xs" color="#615b36" mt={1}>
                                                                            الطبيب: {row.doctorName}
                                                                            {row.doctorSpecialty ? ` - ${row.doctorSpecialty}` : ''}
                                                                        </Text>
                                                                    )}
                                                                </Table.Cell>
                                                                <Table.Cell py={3} px={3} color="gray.600">{row.bookingDate || '—'}</Table.Cell>
                                                                <Table.Cell py={3} px={3}>{row.service || '—'}</Table.Cell>
                                                                <Table.Cell py={3} px={3}>{formatAmount(row.totalAmount ?? row.bookingValue)} EGP</Table.Cell>
                                                                <Table.Cell py={3} px={3} color="green.700" fontWeight="bold">{formatAmount(row.amountPaid)} EGP</Table.Cell>
                                                                <Table.Cell py={3} px={3} color={Number(row.remainingAmount ?? 0) > 0 ? 'orange.700' : 'gray.500'} fontWeight="bold">
                                                                    {formatAmount(row.remainingAmount)} EGP
                                                                </Table.Cell>
                                                                <Table.Cell py={3} px={3}>
                                                                    <Badge colorPalette={paymentStatusColor(row.paymentStatus)} variant="subtle" borderRadius="full">
                                                                        {row.paymentStatusLabel || row.paymentStatus || 'غير محدد'}
                                                                    </Badge>
                                                                </Table.Cell>
                                                                <Table.Cell py={3} px={3}>
                                                                    <Flex gap={1} wrap="wrap">
                                                                        {(row.paymentMethods ?? []).map((payment, idx) => (
                                                                            <Badge key={`${row.bookingId}-${payment.method}-${idx}`} variant="outline" colorPalette="blue">
                                                                                {payment.label || payment.method}: {formatAmount(payment.amount)} EGP
                                                                            </Badge>
                                                                        ))}
                                                                        {(row.paymentMethods ?? []).length === 0 && <Text fontSize="xs" color="gray.400">—</Text>}
                                                                    </Flex>
                                                                </Table.Cell>
                                                            </Table.Row>
                                                        ))
                                                    ) : (
                                                        <Table.Row>
                                                            <Table.Cell colSpan={8} py={10} textAlign="center" color="gray.500">
                                                                لا توجد حالات مطابقة.
                                                            </Table.Cell>
                                                        </Table.Row>
                                                    )}
                                                </Table.Body>
                                            </Table.Root>
                                        </Box>

                                        <Flex p={4} justify="space-between" align="center" gap={3} wrap="wrap" bg="#f8fafc">
                                            <Text fontSize="sm" color="gray.600">
                                                صفحة {financialCases?.page ?? financialCasesPage} من {financialCases?.totalPages ?? 1}
                                            </Text>
                                            <Flex gap={2}>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={financialCasesPage <= 1 || isFinancialCasesLoading}
                                                    onClick={() => setFinancialCasesPage((p) => Math.max(1, p - 1))}
                                                >
                                                    السابق
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={
                                                        financialCasesPage >= (financialCases?.totalPages ?? 1) ||
                                                        isFinancialCasesLoading
                                                    }
                                                    onClick={() =>
                                                        setFinancialCasesPage((p) =>
                                                            Math.min(financialCases?.totalPages ?? 1, p + 1),
                                                        )
                                                    }
                                                >
                                                    التالي
                                                </Button>
                                            </Flex>
                                        </Flex>
                                    </Box>
                                </Card.Body>
                                )}
                            </Card.Root>
                        )}

                        {/* Summary Cards */}
                     

                   

                     

                        <SimpleGrid columns={{ base: 1, lg: 2 }} gap={8}>
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
                                                <Heading size="md" color="white" fontWeight="bold" lineHeight="short">
                                                    أنواع المصروفات
                                                </Heading>
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
                                            onClick={() => void refreshExpenseTaxonomy()}
                                            flexShrink={0}
                                        >
                                            <HStack gap={2}>
                                                <RefreshCw size={16} />
                                                <span>تحديث القائمة</span>
                                            </HStack>
                                        </Button>
                                    </Flex>
                                </Box>
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
                                                                flexWrap="wrap"
                                                            >
                                                                <Text fontWeight="bold" color="#615b36" fontSize="md">
                                                                    {cat.name}
                                                                </Text>
                                                                <IconButton
                                                                    aria-label="حذف التصنيف"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    colorPalette="red"
                                                                    loading={
                                                                        deletingId?.kind === 'cat' && deletingId.id === cat.id
                                                                    }
                                                                    onClick={() => void handleDeleteCategory(cat.id)}
                                                                >
                                                                    <Trash2 size={16} />
                                                                </IconButton>
                                                            </Flex>
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
                                                        </Box>
                                                    )
                                                })}
                                            </Stack>
                                        )}
                                    </Stack>
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
                                        <Button size="sm" bg="red.600" color="white" _hover={{ bg: 'red.700' }} onClick={onExpenseOpen}>
                                            <HStack gap={1} as="span">
                                                <Plus size={16} />
                                                <span>إضافة مصروف</span>
                                            </HStack>
                                        </Button>
                                    </Flex>
                                </Card.Header>
                                <Card.Body p={5}>
                                    {expenses && expenses.expenses?.length > 0 ? (
                                        <>
                                            <Flex justify="space-between" align="center" mb={4} flexWrap="wrap" gap={3}>
                                                <Text fontWeight="bold" color="gray.600" fontSize="sm">الفلترة حسب التصنيف</Text>
                                                <Box bg="gray.50" border="1px solid" borderColor="gray.200" borderRadius="lg" px={2} minW="200px">
                                                    <select
                                                        value={filterExpenseCat}
                                                        onChange={(e) => setFilterExpenseCat(e.target.value)}
                                                        style={{ width: '100%', padding: '6px', background: 'transparent', outline: 'none' }}
                                                    >
                                                        <option value="all">الكل</option>
                                                        {expenseCategoriesList.map((c) => (
                                                            <option key={c} value={c}>{c}</option>
                                                        ))}
                                                    </select>
                                                </Box>
                                            </Flex>
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
                                                <Text fontWeight="bold" color="gray.700">الإجمالي</Text>
                                                <Text fontWeight="bold" fontSize="lg" color="red.600">
                                                    {formatAmount(
                                                        filterExpenseCat === 'all'
                                                            ? Number(expenses.total ?? 0)
                                                            : filteredExpenses.reduce((acc, e) => acc + Number(e.amount ?? 0), 0),
                                                    )}{' '}
                                                    EGP
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
                                                                subcategory_id: 0,
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
                                        <Field.Root required>
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
                                                            ),
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
                                    !expenseForm.category_id ||
                                    !expenseForm.subcategory_id
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

