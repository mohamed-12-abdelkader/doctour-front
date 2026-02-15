export type BookingType = 'online' | 'clinic';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'rejected';
export type VisitType = 'checkup' | 'followup';
export type ExaminationStatus = 'waiting' | 'done';

export interface Booking {
    id: number;
    customerName: string;
    customerPhone: string;
    appointmentDate: string; // ISO 8601 format
    bookingType: BookingType;
    amountPaid: string | number; // API returns string, but we can work with both
    status: BookingStatus;
    visitType?: VisitType; // كشف أو إعادة
    examinationStatus?: ExaminationStatus; // حالة الكشف: انتظار | تم (Admin only)
    /** تقرير المريض — API يرجع الحقل باسم PatientReport */
    report?: PatientReport | null;
    PatientReport?: PatientReport | null;
    createdAt: string;
    updatedAt: string;
}

// For creating/updating bookings
export interface CreateClinicBookingData {
    name: string;
    phone: string;
    date: string; // ISO 8601 format
    amountPaid?: number;
    visitType: VisitType; // كشف أو إعادة
}

export interface UpdateBookingData {
    name?: string;
    phone?: string;
    date?: string; // ISO 8601 format
    amountPaid?: number;
    visitType?: VisitType;
}

// Patient History Types
export interface LastVisit {
    date: string;
    visitType: VisitType;
    amountPaid: string;
    status: BookingStatus;
}

export interface PatientHistory {
    totalPastVisits: number;
    totalAmountPaid: string;
    lastVisit: LastVisit | null;
    pastBookings: Booking[];
}

// Patient Report (تقرير المريض) — Admin only — يطابق استجابة API
export interface Medication {
    id?: number;
    reportId?: number;
    medicationName: string;
    dosage: string;
    frequency?: string | null;
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export interface PatientReport {
    id?: number;
    bookingId?: number;
    medicalCondition: string;
    notes?: string | null;
    medications: Medication[];
    createdAt?: string;
    updatedAt?: string;
}

export interface BookingHistoryResponse {
    currentBooking: Booking;
    patientHistory: PatientHistory;
}

// Body for POST/PUT report
export interface CreateReportData {
    medicalCondition: string;
    notes?: string;
    medications: Medication[];
}
