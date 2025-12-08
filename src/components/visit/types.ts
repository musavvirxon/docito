import type { ToothData as DentalToothData, ToothType, ToothStatus, ToothProcedure } from "@/components/dental/types";

export type VisitMode = "current" | "past";

// Re-export dental types for backward compatibility
export type ToothData = DentalToothData;
export type { ToothType, ToothStatus, ToothProcedure };

export interface Diagnosis {
  id: string;
  code: string; // ICD-10
  name: string;
  type: "primary" | "secondary";
  notes?: string;
  createdAt: string;
  toothNumbers?: number[]; // For dental
}

export interface Treatment {
  id: string;
  procedureId?: string;
  name: string;
  code?: string;
  notes?: string;
  cost?: number;
  status: "planned" | "in_progress" | "completed";
  toothNumbers?: number[];
  createdAt: string;
}

export interface VisitPrescription {
  id: string;
  medication: string;
  dosage: string;
  strength?: string;
  frequency: string;
  duration: string;
  instructions?: string;
  createdAt: string;
}

export interface VisitFile {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
  uploadedBy?: string;
  uploadedAt: string;
  category?: string;
}

export interface SOAPNotes {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export interface Vitals {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number;
  temperature?: number;
  height?: number;
  weight?: number;
  bmi?: number;
  oxygenSaturation?: number;
}

export interface VisitData {
  id: string;
  appointmentId: string;
  visitType: "initial" | "follow_up" | "emergency";
  chiefComplaint?: string;
  vitals?: Vitals;
  diagnoses: Diagnosis[];
  treatments: Treatment[];
  prescriptions: VisitPrescription[];
  files: VisitFile[];
  notes?: SOAPNotes;
  dentalChart?: ToothData[];
  specialtyAssessment?: Record<string, any>;
  status: "in_progress" | "completed";
  createdAt: string;
  updatedAt: string;
}

export interface PatientData {
  id: string;
  full_name: string;
  date_of_birth?: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  profile_photo_url?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  blood_group?: string;
  allergies?: string;
  medical_history?: string;
  dental_history?: string;
  current_medications?: string;
}

export interface DoctorData {
  id: string;
  name: string;
  specialty: string;
  practiceName?: string;
  practiceId?: string;
}

export interface AppointmentData {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
}
