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

// API: GET /accounts/income/bookings — query: month | startDate+endDate | startMonth+endMonth
export interface BookingsIncomeResponse {
    period: string;
    byCustomer: { customerName: string; amount: number }[];
    total: number;
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
    date?: string | null; // YYYY-MM-DD
    /** backward compat (لو الـ API القديم يستخدم expenseDate) */
    expenseDate?: string | null; // YYYY-MM-DD
    category_id: number;
    /** اختياري حسب التعديل الأخير */
    subcategory_id?: number | null;
    notes?: string | null;
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
}
