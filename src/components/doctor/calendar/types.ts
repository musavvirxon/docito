export type CalendarView = 'day' | 'week' | 'month';
export type AppointmentType =
  | 'in_person'
  | 'video'
  | 'home_visit'
  | 'messaging'
  | 'follow_up'
  | 'in-person'
  | 'home';

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'canceled' | 'no_show';

export type AppointmentSource = 'direct' | 'referral';

export interface CalendarAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;

  notes?: string | null;

  doctor_id?: string | null;
  practice_id?: string | null;

  patient_id?: string | null;
  doctor_patient_id?: string | null;

  patient_name?: string | null;
  patient_avatar?: string | null;
  patient_phone?: string | null;
  patient_email?: string | null;

  appointment_type?: AppointmentType | null;
  source?: AppointmentSource;

  patient_confirmation_status?: 'pending' | 'confirmed' | 'declined' | null;
  start_requested_by_doctor?: boolean | null;
  start_requested_by_patient?: boolean | null;
  started_at?: string | null;

  referral_id?: string | null;
  
  // Procedure fields
  procedure_id?: string | null;
  procedure_name?: string | null;
  procedure_category?: string | null;
  procedure_cost?: number | null;
}

export interface BlockedTime {
  id: string;
  blocked_date: string;
  start_time: string;
  end_time: string;
  block_type: string;
  reason?: string;
}

export interface ScheduleHealth {
  status: 'fully-booked' | 'balanced' | 'many-openings';
  percentage: number;
  openSlots: number;
  totalSlots: number;
}

export interface CalendarFilters {
  appointmentTypes: AppointmentType[];
  statuses: AppointmentStatus[];
  sources: AppointmentSource[];
  showBuffers: boolean;
  searchQuery: string;
}

export const defaultFilters: CalendarFilters = {
  appointmentTypes: [],
  statuses: [],
  sources: [],
  showBuffers: false,
  searchQuery: '',
};
