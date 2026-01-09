// Doctor Calendar Types

export type CalendarView = 'day' | 'week' | 'month';

export type AppointmentType = 'in-person' | 'video' | 'home' | 'chat';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'canceled' | 'no-show';
export type AppointmentSource = 'direct' | 'referral';

export interface CalendarAppointment {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes?: string;
  patient_id?: string;
  patient_name?: string;
  patient_avatar?: string;
  patient_phone?: string;
  patient_email?: string;
  appointment_type?: AppointmentType;
  source?: AppointmentSource;
  referral_id?: string;
  procedure_name?: string;
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
