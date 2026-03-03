export type BookingType = 'online' | 'clinic';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'rejected';
export type VisitType = 'checkup' | 'followup' | 'consultation';
export type ExaminationStatus = 'waiting' | 'done';

export interface Booking {
    id: number;
    customerName: string;
    customerPhone: string;
    /** null للحجوزات الأونلاين المعلقة */
    appointmentDate: string | null;
    bookingType: BookingType;
    amountPaid: string | number;
    status: BookingStatus;
    visitType?: VisitType;
    examinationStatus?: ExaminationStatus;
    /** الأونلاين فقط: التاريخ المفضل */
    preferredDate?: string | null;
    /** الأونلاين فقط: الوقت المفضل */
    preferredTime?: string | null;
    /** الـ API الجديد بيرجع reports[] — مصفوفة تقارير */
    reports?: PatientReport[];
    /** backward compat مع الـ API القديم */
    report?: PatientReport | null;
    PatientReport?: PatientReport | null;
    createdAt: string;
    updatedAt: string;
}

// ─── Clinic booking creation ──────────────────────────────────────────────────
export interface CreateClinicBookingData {
    name: string;
    phone: string;
    date: string;        // YYYY-MM-DD (الـ API بيتوقع date مش dateTime)
    amountPaid?: number;
    visitType?: VisitType;
}

// ─── Clinic booking update ────────────────────────────────────────────────────
export interface UpdateBookingData {
    name?: string;
    phone?: string;
    date?: string;        // YYYY-MM-DD
    amountPaid?: number;
    visitType?: VisitType;
}

// ─── Online booking creation (Public) ────────────────────────────────────────
export interface CreateOnlineBookingData {
    name: string;
    phone: string;
    preferredDate?: string;   // YYYY-MM-DD
    preferredTime?: string;   // HH:MM
    visitType?: VisitType;
}

// ─── Patient History ──────────────────────────────────────────────────────────
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

// ─── Patient Report ───────────────────────────────────────────────────────────
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
    prescriptionImageUrl?: string | null;
    prescriptionPublicId?: string | null;
    medications: Medication[];
    createdAt?: string;
    updatedAt?: string;
}

export interface BookingHistoryResponse {
    currentBooking: Booking;   // has .reports[]
    patientHistory: PatientHistory;
}

// Body for POST/PUT report
export interface CreateReportData {
    medicalCondition: string;
    notes?: string;
    medications: Medication[];
}

// ─── Notifications ────────────────────────────────────────────────────────────
export type NotificationType =
    | 'new_online_booking'
    | 'booking_confirmed'
    | 'booking_rejected'
    | 'booking_cancelled';

export interface NotificationData {
    bookingId?: number;
    patientName?: string;
    patientPhone?: string;
    preferredDate?: string;
    preferredTime?: string;
    [key: string]: any;
}

export interface Notification {
    id: number;
    type: NotificationType;
    title: string;
    message: string;
    data?: NotificationData;
    isRead: boolean;
    targetRole?: string;
    createdAt: string;
}

export interface NotificationsResponse {
    total: number;
    unreadCount: number;
    page: number;
    notifications: Notification[];
}

// ─── Slot-Based System (legacy) ───────────────────────────────────────────────
export interface WorkingDay {
    id: number;
    date: string;        // YYYY-MM-DD
    startTime: string;   // e.g. "10:00"
    endTime: string;     // e.g. "18:00"
    isActive: boolean;
    createdBy?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface Patient {
    id: number;
    name: string;
    phone: string;
    email?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface SlotInfo {
    timeSlot: string;
    count: number;
    available: boolean;
}

export interface AvailableSlotsResponse {
    available: boolean;
    date?: string;
    workingHours?: { start: string; end: string };
    slots?: SlotInfo[];
    availableSlots?: string[];
    message?: string;
}

export interface SlotBooking {
    id: number;
    patientId: number;
    slotDate: string;
    timeSlot: string;
    bookingType: BookingType;
    status: BookingStatus;
    customerName?: string;
    customerPhone?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface CreateSlotBookingData {
    patientId: number;
    date: string;
    timeSlot: string;
    bookingType?: 'online' | 'clinic';
}

export interface UpsertPatientData {
    phone: string;
    name?: string;
    email?: string;
}
