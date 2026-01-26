// File: src/lib/api/supabase-api.ts
import { supabase } from '@/integrations/supabase/client';
import { Tables, Database } from '@/integrations/supabase/types';

type ProcedureInsert = Database['public']['Tables']['procedures']['Insert'];
type MedicalRecordInsert = Database['public']['Tables']['medical_records']['Insert'];
import { toast } from 'sonner';

// Types
export type Doctor = Tables<'doctors'> & {
  profiles?: any;
  practices?: any;
};

export type Appointment = Tables<'appointments'> & {
  doctor?: any;
  practice?: any;
};

export type TreatmentPlan = Tables<'treatment_plans'> & {
  treatment_plan_procedures?: any[];
  medications?: any[];
};

export type Procedure = Tables<'procedures'> & {
  procedure_materials?: any[];
  procedure_files?: any[];
};

// Error handler utility
const handleApiError = (error: any, defaultMessage: string) => {
  console.error(defaultMessage, error);
  const message = error?.message || defaultMessage;
  toast.error(message);
  return { error: message };
};

// Authentication API
export const authApi = {
  async signUp(email: string, password: string, userData: any = {}) {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: userData.fullName || email,
            role: userData.role || 'patient'
          }
        }
      });

      if (error) throw error;
      toast.success('Account created successfully! Please check your email to verify your account.');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create account');
    }
  },

  async signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      toast.success('Successfully signed in!');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to sign in');
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Successfully signed out!');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to sign out');
    }
  },

  async resetPassword(email: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      toast.success('Password reset instructions sent to your email!');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to send password reset email');
    }
  },

  async updatePassword(newPassword: string) {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
      toast.success('Password updated successfully!');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update password');
    }
  },
};

// Profile API
export const profileApi = {
  async fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch profile');
    }
  },

  async updateProfile(userId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      toast.success('Profile updated successfully!');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update profile');
    }
  },

  async updateNotificationSettings(userId: string, settings: any) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ notification_settings: settings })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      toast.success('Notification settings updated!');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update notification settings');
    }
  },

  async updatePrivacySettings(userId: string, settings: any) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ privacy_settings: settings })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      toast.success('Privacy settings updated!');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update privacy settings');
    }
  },
};

// Doctor API
export const doctorApi = {
  async fetchDoctors() {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('verified', true);

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch doctors');
    }
  },

  async fetchDoctorById(doctorId: string) {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select('*')
        .eq('id', doctorId)
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch doctor');
    }
  },

  async fetchDoctorAvailability(doctorId: string, date: string) {
    try {
      const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('date', date)
        .eq('is_available', true)
        .order('start_time', { ascending: true });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch doctor availability');
    }
  },
};

// Appointment API
export const appointmentApi = {
  async fetchAppointments(userId: string, userRole: 'patient' | 'doctor') {
    try {
      const attachDoctorProfiles = async (rows: any[]) => {
        if (!rows || rows.length === 0) return rows;

        const asOne = (v: any) => (Array.isArray(v) ? v[0] ?? null : v ?? null);

        const doctorUserIds = Array.from(
          new Set(
            rows
              .map((r) => asOne(r?.doctor)?.user_id)
              .filter((v) => typeof v === 'string' && v.length > 0)
          )
        ) as string[];

        if (doctorUserIds.length === 0) return rows;

        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', doctorUserIds);

        if (profilesError) throw profilesError;

        const profileMap = new Map<string, any>();
        (profiles || []).forEach((p: any) => {
          if (p?.user_id) profileMap.set(String(p.user_id), p);
        });

        return rows.map((r) => {
          const doctorRaw = r?.doctor;

          if (Array.isArray(doctorRaw)) {
            r.doctor = doctorRaw.map((d: any) => {
              const uid = d?.user_id ? String(d.user_id) : '';
              const prof = uid ? profileMap.get(uid) : null;
              return prof ? { ...d, profiles: prof } : d;
            });
            return r;
          }

          const d = doctorRaw;
          const uid = d?.user_id ? String(d.user_id) : '';
          const prof = uid ? profileMap.get(uid) : null;
          r.doctor = prof ? { ...d, profiles: prof } : d;
          return r;
        });
      };

      if (userRole === 'patient') {
        // Use unified view for patients - includes appointments matched by email/phone
        const { data, error } = await supabase
          .from('patient_all_appointments')
          .select(
            `
            *,
            doctor:doctors(
              id,
              specialty,
              user_id,
              verified
            ),
            practice:practices(
              id,
              name,
              address,
              phone
            )
          `
          )
          .order('appointment_date', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) throw error;

        const enriched = await attachDoctorProfiles(data || []);
        return { data: enriched || [], success: true };
      } else {
        // For doctors, use regular appointments table
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (!doctorData) {
          return { data: [], success: true };
        }

        const { data, error } = await supabase
          .from('appointments')
          .select(
            `
            *,
            doctor:doctors(
              id,
              specialty,
              user_id,
              verified
            ),
            practice:practices(
              id,
              name,
              address,
              phone
            )
          `
          )
          .eq('doctor_id', doctorData.id)
          .order('appointment_date', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) throw error;

        const enriched = await attachDoctorProfiles(data || []);
        return { data: enriched || [], success: true };
      }
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch appointments');
    }
  },

  async bookAppointment(appointmentData: {
    doctor_id: string;
    patient_id: string;
    practice_id?: string;
    appointment_date: string;
    start_time: string;
    end_time: string;
    notes?: string;
  }) {
    try {
      // Insert appointment directly
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          doctor_id: appointmentData.doctor_id,
          patient_id: appointmentData.patient_id,
          practice_id: appointmentData.practice_id || null,
          appointment_date: appointmentData.appointment_date,
          start_time: appointmentData.start_time,
          end_time: appointmentData.end_time,
          notes: appointmentData.notes || null,
          status: 'confirmed'
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Appointment booked successfully!');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to book appointment');
    }
  },

  async cancelAppointment(appointmentId: string) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({ status: 'canceled' })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;
      toast.success('Appointment cancelled');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to cancel appointment');
    }
  },

  async updateAppointmentStatus(appointmentId: string, status: string) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;
      toast.success('Appointment status updated');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update appointment status');
    }
  },
};

// Medication API
export const medicationApi = {
  async fetchMedications(userId: string) {
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .eq('patient_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch medications');
    }
  },

  async addMedication(medication: {
    patient_id: string;
    name: string;
    dosage: string;
    frequency: string;
    start_date?: string;
    end_date?: string;
    instructions?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('medications')
        .insert({
          patient_id: medication.patient_id,
          name: medication.name,
          dosage: medication.dosage,
          frequency: medication.frequency,
          start_date: medication.start_date || null,
          end_date: medication.end_date || null,
          instructions: medication.instructions || null,
          created_by: medication.patient_id,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Medication added');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to add medication');
    }
  },

  async deleteMedication(medicationId: string) {
    try {
      const { error } = await supabase
        .from('medications')
        .delete()
        .eq('id', medicationId);

      if (error) throw error;
      toast.success('Medication deleted');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to delete medication');
    }
  },

  async updateMedication(medicationId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('medications')
        .update(updates)
        .eq('id', medicationId)
        .select()
        .single();

      if (error) throw error;
      toast.success('Medication updated');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update medication');
    }
  },
};

// Reminders API
export const remindersApi = {
  async fetchReminders(userId: string) {
    try {
      const { data, error } = await supabase
        .from('medication_reminders')
        .select(`
          *,
          medication:medications(*)
        `)
        .eq('patient_id', userId)
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch reminders');
    }
  },

  async updateReminderStatus(reminderId: string, status: string) {
    try {
      const { data, error } = await supabase
        .from('medication_reminders')
        .update({ status })
        .eq('id', reminderId)
        .select()
        .single();

      if (error) throw error;
      toast.success('Reminder updated');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update reminder');
    }
  },

  async createReminder(reminder: {
    medication_id: string;
    patient_id: string;
    scheduled_time: string;
    status?: string;
    notes?: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('medication_reminders')
        .insert({
          medication_id: reminder.medication_id,
          patient_id: reminder.patient_id,
          scheduled_time: reminder.scheduled_time,
          status: reminder.status || 'pending',
          notes: reminder.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Reminder created');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create reminder');
    }
  },
};

// Medical Records API
export const medicalRecordsApi = {
  async fetchMedicalRecords(userId: string) {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch medical records');
    }
  },

  async addMedicalRecord(record: MedicalRecordInsert) {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .insert(record)
        .select()
        .single();

      if (error) throw error;
      toast.success('Medical record added');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to add medical record');
    }
  },

  async deleteMedicalRecord(recordId: string) {
    try {
      const { error } = await supabase
        .from('medical_records')
        .delete()
        .eq('id', recordId);

      if (error) throw error;
      toast.success('Medical record deleted');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to delete medical record');
    }
  },
};

// Test Results API
export const testResultsApi = {
  async fetchTestResults(userId: string) {
    try {
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('patient_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch test results');
    }
  },

  async addTestResult(result: any) {
    try {
      const { data, error } = await supabase
        .from('test_results')
        .insert(result)
        .select()
        .single();

      if (error) throw error;
      toast.success('Test result added');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to add test result');
    }
  },

  async deleteTestResult(resultId: string) {
    try {
      const { error } = await supabase
        .from('test_results')
        .delete()
        .eq('id', resultId);

      if (error) throw error;
      toast.success('Test result deleted');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to delete test result');
    }
  },
};

// Treatment Plans API
export const treatmentPlansApi = {
  async fetchTreatmentPlans(userId: string) {
    try {
      const { data, error } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          treatment_plan_procedures(*),
          medications(*)
        `)
        .eq('patient_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch treatment plans');
    }
  },

  async addTreatmentPlan(plan: any) {
    try {
      const { data, error } = await supabase
        .from('treatment_plans')
        .insert(plan)
        .select()
        .single();

      if (error) throw error;
      toast.success('Treatment plan created');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create treatment plan');
    }
  },

  async updateTreatmentPlan(planId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('treatment_plans')
        .update(updates)
        .eq('id', planId)
        .select()
        .single();

      if (error) throw error;
      toast.success('Treatment plan updated');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update treatment plan');
    }
  },

  async deleteTreatmentPlan(planId: string) {
    try {
      const { error } = await supabase
        .from('treatment_plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      toast.success('Treatment plan deleted');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to delete treatment plan');
    }
  },
};

// Procedures API
export const proceduresApi = {
  async fetchProcedures() {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select(`
          *,
          procedure_materials(*),
          procedure_files(*)
        `)
        .order('name', { ascending: true });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch procedures');
    }
  },

  async addProcedure(procedure: ProcedureInsert) {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .insert(procedure)
        .select()
        .single();

      if (error) throw error;
      toast.success('Procedure created');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create procedure');
    }
  },

  async updateProcedure(procedureId: string, updates: any) {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .update(updates)
        .eq('id', procedureId)
        .select()
        .single();

      if (error) throw error;
      toast.success('Procedure updated');
      return { data, success: true };
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
      toast.success('Procedure deleted');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to delete procedure');
    }
  },
};
