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

// API: GET /accounts/income/bookings?month=YYYY-MM
export interface BookingsIncomeResponse {
    month: string;
    byCustomer: { customerName: string; amount: number }[];
    total: number;
}

// API: POST /accounts/income — Body
export interface AddIncomeBody {
    description: string;
    amount: number;
    entryDate?: string; // YYYY-MM-DD
}

// API: GET /accounts/income/manual?month=YYYY-MM
export interface ManualIncomeEntry {
    id?: number;
    description: string;
    amount: number;
    entryDate: string;
    createdAt?: string;
}
export interface ManualIncomeResponse {
    month: string;
    entries: ManualIncomeEntry[];
    total: number;
}

// API: POST /accounts/expenses — Body
export interface AddExpenseBody {
    description: string;
    amount: number;
    expenseDate?: string; // YYYY-MM-DD
    notes?: string;
}

// API: GET /accounts/expenses?month=YYYY-MM
export interface ExpenseEntry {
    id?: number;
    description: string;
    amount: number;
    expenseDate: string;
    notes?: string;
    createdAt?: string;
}
export interface ExpensesResponse {
    month: string;
    expenses: ExpenseEntry[];
    total: number;
}

// API: GET /accounts/summary?month=YYYY-MM
export interface AccountsSummaryResponse {
    month: string;
    incomeFromBookings: number;
    manualIncome: number;
    totalIncome: number;
    totalExpenses: number;
    balance: number;
}
