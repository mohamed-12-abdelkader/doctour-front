export type AppointmentStatus = 'pending' | 'examined' | 'cancelled';
export type AppointmentType = 'online' | 'clinic';

export interface Medicine {
    id: string;
    name: string;
    dosage: string;
    duration: string;
}

export interface Prescription {
    id: string;
    date: string;
    medicines: Medicine[];
    notes?: string;
}

export interface Examination {
    id: string;
    date: string; // ISO or formatted string
    diagnosis: string;
    notes?: string;
    prescriptionId?: string;
}

export interface Patient {
    id: string;
    name: string;
    phone: string;
    age: number;
    gender: 'male' | 'female';
    chronicDiseases?: string[]; // e.g. ["Diabetes", "Hypertension"]
    allergies?: string[]; // e.g. ["Penicillin"]
    lastVisit?: string;
    examinations: Examination[];
    prescriptions: Prescription[];
    notes?: string;
}

export interface Appointment {
    id: string;
    patientId: string;
    patientName: string;
    time: string;
    type: AppointmentType;
    status: AppointmentStatus;
    reason?: string;
}
