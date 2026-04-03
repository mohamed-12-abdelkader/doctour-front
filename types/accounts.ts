export type TransactionType = 'income' | 'expense';
export type PaymentMethod = 'cash' | 'visa' | 'transfer';
export type TransactionCategory =
    | 'consultation' | 'service' | 'procedure' // Income
    | 'rent' | 'salary' | 'equipment' | 'utilities' | 'other'; // Expense

export interface Transaction {
    id: string;
    description?: string; // Optional client name or title
    clientName?: string; // Specifically for income mainly
    phoneNumber?: string;
    type: TransactionType;
    category: TransactionCategory;
    amount: number;
    paymentMethod: PaymentMethod;
    date: number; // Timestamp
    notes?: string;
}

export interface AccountSummary {
    totalIncome: number;
    totalExpense: number;
    netProfit: number;
    clientsCount: number;
}

/** صف واحد في توزيع دخل الحجوزات حسب الطبيب — doctorId null = «بدون طبيب» */
export interface BookingIncomeByDoctorRow {
    doctorId: number | null;
    doctorName: string;
    specialty?: string | null;
    amount: number;
}

// API: GET /accounts/income/bookings — query: month | startDate+endDate | startMonth+endMonth
export interface BookingsIncomeResponse {
    period: string;
    byCustomer: { customerName: string; amount: number }[];
    total: number;
    byDoctor?: BookingIncomeByDoctorRow[];
    /** مجموع صفوف byDoctor — يطابق إجمالي دخل الحجوزات عادة */
    totalByDoctor?: number;
}

// API: POST /accounts/income — Body
export interface AddIncomeBody {
    description: string;
    amount: number;
    entryDate?: string; // YYYY-MM-DD
}

// API: GET /accounts/income/manual
export interface ManualIncomeEntry {
    id?: number;
    description: string;
    /** قد يُعاد كنص عشري من الـ API */
    amount: number | string;
    entryDate: string;
    createdAt?: string;
}
export interface ManualIncomeResponse {
    period: string;
    entries: ManualIncomeEntry[];
    total: number;
}

// API: POST /accounts/expenses — Body
export interface AddExpenseBody {
    description: string;
    amount: number;
    /** مستحسن حسب الـ doc */
    date?: string; // YYYY-MM-DD
    /** backward compat (لو الـ API القديم يستخدم expenseDate) */
    expenseDate?: string; // YYYY-MM-DD
    /** مطلوب حسب الـ doc */
    category_id: number;
    /** مطلوب حسب الـ doc */
    subcategory_id: number;
    notes?: string;
}

export interface ExpenseCategory {
    id: number;
    name: string;
}

export interface ExpenseSubcategory {
    id: number;
    name: string;
    categoryId: number;
}

// API: GET /accounts/expenses — يشمل أسماء التصنيف في category / subcategory
export interface ExpenseEntry {
    id?: number;
    description: string;
    amount: string | number;
    expenseDate: string;
    notes?: string | null;
    categoryId?: number;
    subcategoryId?: number;
    category?: ExpenseCategory;
    subcategory?: ExpenseSubcategory;
    createdAt?: string;
}
export interface ExpensesResponse {
    period: string;
    expenses: ExpenseEntry[];
    total: number;
}

// API: GET /accounts/summary
export interface AccountsSummaryResponse {
    period: string;
    incomeFromBookings: number;
    manualIncome: number;
    totalIncome: number;
    totalExpenses: number;
    balance: number;
    incomeFromBookingsByDoctor?: BookingIncomeByDoctorRow[];
    /** يوضح أن التوزيع بالطبيب للحجوزات فقط، واليدوي/المصروفات على مستوى العيادة */
    note?: string;
}
