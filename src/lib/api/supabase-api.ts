// File: src/lib/api/supabase-api.ts
import { supabase } from '@/integrations/supabase/client';
import { Tables, Database } from '@/integrations/supabase/types';

type ProcedureInsert = Database['public']['Tables']['procedures']['Insert'];
type MedicalRecordInsert = Database['public']['Tables']['medical_records']['Insert'];
type AppointmentInsert = Database['public']['Tables']['appointments']['Insert'];
type TreatmentPlanInsert = Database['public']['Tables']['treatment_plans']['Insert'];
type PrescriptionInsert = Database['public']['Tables']['prescriptions']['Insert'];

export type Doctor = Tables<'doctors'>;
export type Patient = Tables<'patients'>;
export type Appointment = Tables<'appointments'>;
export type Procedure = Tables<'procedures'>;
export type TreatmentPlan = Tables<'treatment_plans'>;
export type Prescription = Tables<'prescriptions'>;
export type MedicalRecord = Tables<'medical_records'>;

const handleApiError = (error: any, defaultMessage: string) => {
  console.error(defaultMessage, error);

  let message = defaultMessage;
  if (error?.message) message = error.message;
  if (error?.error_description) message = error.error_description;

  return { error: message, success: false };
};

// Doctor API
export const doctorApi = {
  async fetchDoctorProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch doctor profile');
    }
  },

  async updateDoctorProfile(doctorId: string, updates: Partial<Doctor>) {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .update(updates)
        .eq('id', doctorId)
        .select()
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update doctor profile');
    }
  },

  async fetchDoctorAppointments(doctorId: string) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('appointment_date', { ascending: true });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch appointments');
    }
  }
};

// Patient API
export const patientApi = {
  async fetchPatientProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch patient profile');
    }
  },

  async updatePatientProfile(patientId: string, updates: Partial<Patient>) {
    try {
      const { data, error } = await supabase
        .from('patients')
        .update(updates)
        .eq('id', patientId)
        .select()
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update patient profile');
    }
  }
};

// Appointment API
export const appointmentApi = {
  async fetchAppointments(doctorId: string, startDate?: string, endDate?: string) {
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          patients (*),
          doctor_patients (*),
          procedures (*)
        `)
        .eq('doctor_id', doctorId);

      if (startDate) query = query.gte('appointment_date', startDate);
      if (endDate) query = query.lte('appointment_date', endDate);

      const { data, error } = await query.order('appointment_date', { ascending: true });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch appointments');
    }
  },

  async createAppointment(appointmentData: AppointmentInsert) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create appointment');
    }
  },

  async updateAppointment(appointmentId: string, updates: Partial<Appointment>) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update appointment');
    }
  },

  async deleteAppointment(appointmentId: string) {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to delete appointment');
    }
  }
};

// Treatment Plan API
export const treatmentPlanApi = {
  async fetchTreatmentPlans(doctorId: string, patientId?: string) {
    try {
      let query = supabase
        .from('treatment_plans')
        .select(`
          *,
          patients (*),
          doctor_patients (*),
          treatment_plan_procedures (
            *,
            procedures (*)
          )
        `)
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false });

      if (patientId) query = query.eq('patient_id', patientId);

      const { data, error } = await query;

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch treatment plans');
    }
  },

  async createTreatmentPlan(planData: any) {
    try {
      // Create treatment plan record
      const planInsert: TreatmentPlanInsert = {
        doctor_id: planData.doctor_id,
        patient_id: planData.patient_id,
        doctor_patient_id: planData.doctor_patient_id || null,
        title: planData.title,
        notes: planData.notes || null,
        status: planData.status || 'draft',
        total_cost: planData.total_cost || 0,
        estimated_duration_weeks: planData.estimated_duration_weeks || null,
        priority: planData.priority || 'medium',
        expires_at: planData.expires_at || null,
      };

      const { data: plan, error: planError } = await supabase
        .from('treatment_plans')
        .insert(planInsert)
        .select()
        .single();

      if (planError) throw planError;

      // Add procedures if provided
      if (planData.procedures && planData.procedures.length > 0) {
        const proceduresData = planData.procedures.map((proc: any, index: number) => ({
          treatment_plan_id: plan.id,
          procedure_id: proc.procedure_id,
          status: proc.status || 'pending',
          notes: proc.notes || null,
          scheduled_date: proc.scheduled_date || null,
          sequence_order: index + 1,
          cost: proc.cost || proc.custom_cost || null,
          appointment_id: proc.appointment_id || null,
          duration_minutes: proc.duration_minutes || null,
          tooth_numbers: proc.tooth_numbers || null,
          priority: proc.priority || null,
        }));

        const { error: procError } = await (supabase as any)
          .from('treatment_plan_procedures')
          .insert(proceduresData);

        if (procError) throw procError;
      }

      // Add medications if provided
      if (planData.medications && planData.medications.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const medicationsData = planData.medications.map((med: any) => ({
          treatment_plan_id: plan.id,
          patient_id: planData.patient_id,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          start_date: today,
          instructions: med.instructions || null,
        }));

        const { error: medError } = await supabase
          .from('medications')
          .insert(medicationsData);

        if (medError) throw medError;
      }

      return { data: plan, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create treatment plan');
    }
  },

  async updateTreatmentPlanStatus(
    planId: string,
    status:
      | 'draft'
      | 'published'
      | 'in_progress'
      | 'completed'
      | 'cancelled'
      | 'confirmed'
      | 'paused'
      | 'pending_confirmation'
  ) {
    try {
      const { error } = await supabase
        .from('treatment_plans')
        .update({ status })
        .eq('id', planId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update treatment plan');
    }
  }
};

// Procedure API
export const procedureApi = {
  async fetchProcedures(doctorId?: string) {
    try {
      const buildQuery = (ownerColumn: 'dentist_id' | 'doctor_id') => {
        let q = (supabase as any)
          .from('procedures')
          .select(`
            *,
            procedure_materials (*),
            procedure_files (*)
          `);

        if (doctorId) {
          q = q.eq(ownerColumn, doctorId);
        }

        return q;
      };

      // ✅ New schema uses dentist_id. Try that first.
      let query = buildQuery('dentist_id');
      let { data, error } = await (query as any).order('created_at', { ascending: false });

      // 🔁 Backward-compatible fallback for older DBs using doctor_id
      if (error && doctorId) {
        const msg = String((error as any)?.message || '').toLowerCase();
        const missingDentistId =
          msg.includes('dentist_id') &&
          (msg.includes('does not exist') || msg.includes('column') || msg.includes('unknown') || msg.includes('schema'));

        if (missingDentistId) {
          query = buildQuery('doctor_id');
          ({ data, error } = await (query as any).order('created_at', { ascending: false }));
        }
      }

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch procedures');
    }
  },

  async createProcedure(procedureData: ProcedureInsert) {
    try {
      const { data, error } = await (supabase as any)
        .from('procedures')
        .insert(procedureData)
        .select()
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create procedure');
    }
  },

  async updateProcedure(procedureId: string, updates: any) {
    try {
      const { error } = await (supabase as any)
        .from('procedures')
        .update(updates)
        .eq('id', procedureId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update procedure');
    }
  },

  async deleteProcedure(procedureId: string) {
    try {
      const { error } = await supabase
        .from('procedures')
        .delete()
        .eq('id', procedureId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to delete procedure');
    }
  }
};

// Medical Records API
export const medicalRecordsApi = {
  async fetchMedicalRecords(patientId: string) {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch medical records');
    }
  },

  async createMedicalRecord(recordData: MedicalRecordInsert) {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .insert(recordData)
        .select()
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create medical record');
    }
  },

  async updateMedicalRecord(recordId: string, updates: Partial<MedicalRecord>) {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .update(updates)
        .eq('id', recordId)
        .select()
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update medical record');
    }
  },

  async deleteMedicalRecord(recordId: string) {
    try {
      const { error } = await supabase
        .from('medical_records')
        .delete()
        .eq('id', recordId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to delete medical record');
    }
  }
};

// Prescription API
export const prescriptionApi = {
  async fetchPrescriptions(patientId: string) {
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          doctors (*),
          patients (*),
          doctor_patients (*)
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch prescriptions');
    }
  },

  async createPrescription(prescriptionData: PrescriptionInsert) {
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .insert(prescriptionData)
        .select()
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create prescription');
    }
  },

  async updatePrescription(prescriptionId: string, updates: Partial<Prescription>) {
    try {
      const { data, error } = await supabase
        .from('prescriptions')
        .update(updates)
        .eq('id', prescriptionId)
        .select()
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update prescription');
    }
  },

  async deletePrescription(prescriptionId: string) {
    try {
      const { error } = await supabase
        .from('prescriptions')
        .delete()
        .eq('id', prescriptionId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to delete prescription');
    }
  }
};

// ----------------------------
// Extra helpers / misc API
// ----------------------------

export const miscApi = {
  async fetchDoctorPatients(doctorId: string) {
    try {
      const { data, error } = await supabase
        .from('doctor_patients')
        .select('*')
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch doctor patients');
    }
  },

  async createDoctorPatient(payload: any) {
    try {
      const { data, error } = await supabase
        .from('doctor_patients')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create doctor patient');
    }
  },

  async updateDoctorPatient(id: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('doctor_patients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update doctor patient');
    }
  },

  async deleteDoctorPatient(id: string) {
    try {
      const { error } = await supabase
        .from('doctor_patients')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to delete doctor patient');
    }
  }
};

// Notifications API (if you have RPCs or tables for it)
export const notificationApi = {
  async fetchNotifications(userId: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch notifications');
    }
  },

  async markNotificationRead(notificationId: string) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to mark notification as read');
    }
  }
};

export default {
  doctorApi,
  patientApi,
  appointmentApi,
  treatmentPlanApi,
  procedureApi,
  medicalRecordsApi,
  prescriptionApi,
  miscApi,
  notificationApi,
};
