export type BookingType = 'online' | 'clinic';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'rejected';
export type VisitType = 'checkup' | 'followup' | 'consultation';
export type ExaminationStatus = 'waiting' | 'done';

export interface Booking {
    id: number;
    customerName: string;
    customerPhone: string;
    doctorId?: number | null;
    /** null للحجوزات الأونلاين المعلقة */
    appointmentDate: string | null;
    bookingType: BookingType;
    amountPaid: string | number;
    status: BookingStatus;
    /** نوع الزيارة: checkup/followup/consultation أو اسم الخدمة من BOOKING_SERVICES */
    visitType?: VisitType | string;
    /** نوع الإجراء/الخدمة (clinic) */
    procedureType?: string | null;
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
    /** اختياري: وقت الحجز (HH:mm) — يُرسل في حقل time حسب توثيق الـ API */
    time?: string;
    doctorId?: number;
    amountPaid?: number;
    /** نوع الحجز: من قائمة الخدمات (BOOKING_SERVICES) أو القيم القديمة checkup/followup/consultation */
    visitType?: VisitType | string;
}

// ─── Clinic booking update ────────────────────────────────────────────────────
export interface UpdateBookingData {
    name?: string;
    phone?: string;
    date?: string;        // YYYY-MM-DD
    time?: string;
    doctorId?: number;
    amountPaid?: number;
    visitType?: VisitType | string;
}

// ─── Online booking creation (Public) ────────────────────────────────────────
export interface CreateOnlineBookingData {
    name: string;
    phone: string;
    doctorId?: number;
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
    doctorId?: number;
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

/** استجابة GET /api/bookings/available-slots — المواعيد المتاحة فقط (سلاطات 10 دقائق، حجز واحد لكل موعد) */
export interface AvailableSlotsResponse {
    /** من الـ API: available_slots (snake_case) */
    available_slots?: string[];
    /** توافق مع كود قديم */
    availableSlots?: string[];
    date?: string;
    workingHours?: { start: string; end: string };
    /** عند عدم التوفر: available: false و message */
    available?: boolean;
    message?: string;
    doctorId?: number;
    /** توافق قديم: قائمة بكل السلات مع count/available */
    slots?: SlotInfo[];
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
    doctorId?: number;
    bookingType?: 'online' | 'clinic';
}

export interface UpsertPatientData {
    phone: string;
    name?: string;
    email?: string;
}
