// File: src/lib/api/supabase-api.ts
import { supabase } from '@/integrations/supabase/client';
import { Tables, Database } from '@/integrations/supabase/types';

type ProcedureInsert = Database['public']['Tables']['procedures']['Insert'];
type MedicalRecordInsert = Database['public']['Tables']['medical_records']['Insert'];
import { toast } from 'sonner';

// Types
export type Doctor = {
  id: string;
  user_id?: string;
  specialty?: string | null;
  bio?: string | null;
  languages?: string[] | null;
  consultation_fee?: number | null;
  accepts_new_patients?: boolean | null;
  verified?: boolean | null;
  weighted_rating?: number | null;
  average_rating?: number | null;
  num_reviews?: number | null;
  appointment_count?: number | null;
  license_number?: string | null;
  profiles?: {
    full_name?: string | null;
    avatar_url?: string | null;
    email?: string | null;
    username?: string | null;
  } | null;
  practices?: {
    id?: string | null;
    name?: string | null;
    city?: string | null;
    country?: string | null;
    logo_url?: string | null;
  } | null;
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
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;
      toast.success('Password reset email sent!');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to send password reset email');
    }
  }
};

// Doctor API
export const doctorApi = {
  /**
   * NOTE:
   * - We use the doctors table with join to profiles for search/listing.
   * - This ensures data is fetched from actual tables with proper structure.
   */
  async fetchDoctors() {
    try {
      const { data, error } = await (supabase as any)
        .from('doctors')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            email,
            username
          ),
          practices:practice_id (
            id,
            name,
            city,
            country,
            logo_url
          )
        `)
        .eq('accepts_new_patients', true)
        .eq('verified', true)
        .order('weighted_rating', { ascending: false, nullsFirst: false })
        .order('appointment_count', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const mapped: Doctor[] = (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        specialty: row.specialty ?? null,
        bio: row.bio ?? null,
        languages: row.languages ?? null,
        consultation_fee: row.consultation_fee ?? null,
        accepts_new_patients: row.accepts_new_patients ?? null,
        verified: row.verified ?? true,
        weighted_rating: row.weighted_rating ?? null,
        average_rating: row.average_rating ?? null,
        num_reviews: row.num_reviews ?? null,
        appointment_count: row.appointment_count ?? null,
        license_number: row.license_number ?? null,
        profiles: row.profiles ?? null,
        practices: row.practices ?? null,
      }));

      return { data: mapped, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch doctors');
    }
  },

  async fetchTopDoctorsBySpecialty(limit: number = 6) {
    try {
      const { data, error } = await (supabase as any)
        .from('doctors')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            email,
            username
          ),
          practices:practice_id (
            id,
            name,
            city,
            country,
            logo_url
          )
        `)
        .eq('accepts_new_patients', true)
        .eq('verified', true)
        .order('weighted_rating', { ascending: false, nullsFirst: false })
        .order('appointment_count', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const allDoctors: Doctor[] = (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        specialty: row.specialty ?? null,
        bio: row.bio ?? null,
        languages: row.languages ?? null,
        consultation_fee: row.consultation_fee ?? null,
        accepts_new_patients: row.accepts_new_patients ?? null,
        verified: row.verified ?? true,
        weighted_rating: row.weighted_rating ?? null,
        average_rating: row.average_rating ?? null,
        num_reviews: row.num_reviews ?? null,
        appointment_count: row.appointment_count ?? null,
        license_number: row.license_number ?? null,
        profiles: row.profiles ?? null,
        practices: row.practices ?? null,
      }));

      const specialtyMap = new Map<string, Doctor>();
      allDoctors.forEach((doctor) => {
        const specialty = (doctor.specialty || 'General').trim();
        const existing = specialtyMap.get(specialty);
        const existingRating = existing?.weighted_rating || 0;
        const candidateRating = doctor.weighted_rating || 0;
        if (!existing || candidateRating > existingRating) {
          specialtyMap.set(specialty, doctor);
        }
      });

      const diverseDoctors = Array.from(specialtyMap.values())
        .sort((a, b) => (b.weighted_rating || 0) - (a.weighted_rating || 0))
        .slice(0, limit);

      return { data: diverseDoctors, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch top doctors by specialty');
    }
  },

  async searchDoctors(searchTerm: string, location?: string, specialty?: string) {
    try {
      let query = (supabase as any)
        .from('doctors')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            email,
            username
          ),
          practices:practice_id (
            id,
            name,
            city,
            country,
            logo_url
          )
        `)
        .eq('accepts_new_patients', true)
        .eq('verified', true);

      const cleanTerm = (searchTerm || '').trim();
      if (cleanTerm) {
        query = query.or(
          [
            `specialty.ilike.%${cleanTerm}%`,
            `bio.ilike.%${cleanTerm}%`,
            `profiles.full_name.ilike.%${cleanTerm}%`,
            `practices.name.ilike.%${cleanTerm}%`,
          ].join(',')
        );
      }

      const cleanLoc = (location || '').trim();
      if (cleanLoc) {
        query = query.or(
          [
            `practices.city.ilike.%${cleanLoc}%`,
            `practices.country.ilike.%${cleanLoc}%`,
          ].join(',')
        );
      }

      const cleanSpec = (specialty || '').trim();
      if (cleanSpec && cleanSpec !== 'all') {
        query = query.ilike('specialty', `%${cleanSpec}%`);
      }

      const { data, error } = await query
        .order('weighted_rating', { ascending: false, nullsFirst: false })
        .order('appointment_count', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const mapped: Doctor[] = (data || []).map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        specialty: row.specialty ?? null,
        bio: row.bio ?? null,
        languages: row.languages ?? null,
        consultation_fee: row.consultation_fee ?? null,
        accepts_new_patients: row.accepts_new_patients ?? null,
        verified: row.verified ?? true,
        weighted_rating: row.weighted_rating ?? null,
        average_rating: row.average_rating ?? null,
        num_reviews: row.num_reviews ?? null,
        appointment_count: row.appointment_count ?? null,
        license_number: row.license_number ?? null,
        profiles: row.profiles ?? null,
        practices: row.practices ?? null,
      }));

      return { data: mapped, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to search doctors');
    }
  },

  async fetchDoctorById(doctorId: string) {
    try {
      const { data, error } = await (supabase as any)
        .from('doctors')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            email,
            username
          ),
          practices:practice_id (
            id,
            name,
            city,
            country,
            logo_url
          )
        `)
        .eq('id', doctorId)
        .single();

      if (error) throw error;

      const mapped: Doctor = {
        id: data.id,
        user_id: data.user_id,
        specialty: data.specialty ?? null,
        bio: data.bio ?? null,
        languages: data.languages ?? null,
        consultation_fee: data.consultation_fee ?? null,
        accepts_new_patients: data.accepts_new_patients ?? null,
        verified: data.verified ?? true,
        weighted_rating: data.weighted_rating ?? null,
        average_rating: data.average_rating ?? null,
        num_reviews: data.num_reviews ?? null,
        appointment_count: data.appointment_count ?? null,
        license_number: data.license_number ?? null,
        profiles: data.profiles ?? null,
        practices: data.practices ?? null,
      };

      return { data: mapped, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch doctor details');
    }
  },

  async fetchDoctorProfile(userId: string) {
    try {
      const { data, error } = await (supabase as any)
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
      const { data, error } = await (supabase as any)
        .from('doctors')
        .update(updates)
        .eq('id', doctorId)
        .select()
        .single();

      if (error) throw error;
      toast.success('Doctor profile updated successfully!');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update doctor profile');
    }
  }
};

// Patient API
export const patientApi = {
  async fetchPatientProfile(userId: string) {
    try {
      const { data, error } = await (supabase as any)
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

  async updatePatientProfile(patientId: string, updates: any) {
    try {
      const { data, error } = await (supabase as any)
        .from('patients')
        .update(updates)
        .eq('id', patientId)
        .select()
        .single();

      if (error) throw error;
      toast.success('Patient profile updated successfully!');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update patient profile');
    }
  }
};

// Appointment API
export const appointmentApi = {
  async fetchDoctorAppointments(doctorId: string) {
    try {
      const { data, error } = await (supabase as any)
        .from('appointments')
        .select(`
          *,
          doctor:doctor_id (
            *,
            profiles:user_id (
              full_name,
              avatar_url
            )
          ),
          patient:patient_id (
            *,
            profiles:user_id (
              full_name,
              avatar_url
            )
          ),
          practice:practice_id (
            id,
            name,
            city,
            country
          ),
          procedure:procedure_id (*)
        `)
        .eq('doctor_id', doctorId)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch doctor appointments');
    }
  },

  async fetchPatientAppointments(patientId: string) {
    try {
      const { data, error } = await (supabase as any)
        .from('appointments')
        .select(`
          *,
          doctor:doctor_id (
            *,
            profiles:user_id (
              full_name,
              avatar_url
            )
          ),
          practice:practice_id (
            id,
            name,
            city,
            country
          ),
          procedure:procedure_id (*)
        `)
        .eq('patient_id', patientId)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch patient appointments');
    }
  },

  async fetchAppointmentsByDateRange(doctorId: string, startDate: string, endDate: string) {
    try {
      const { data, error } = await (supabase as any)
        .from('appointments')
        .select(`
          *,
          patient:patient_id (
            *,
            profiles:user_id (
              full_name,
              avatar_url
            )
          ),
          doctor_patient:doctor_patient_id (*),
          procedure:procedure_id (*)
        `)
        .eq('doctor_id', doctorId)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .order('appointment_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch appointments');
    }
  },

  async createAppointment(appointmentData: any) {
    try {
      const { data, error } = await (supabase as any)
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (error) throw error;
      toast.success('Appointment created successfully!');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create appointment');
    }
  },

  async updateAppointment(appointmentId: string, updates: any) {
    try {
      const { data, error } = await (supabase as any)
        .from('appointments')
        .update(updates)
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;
      toast.success('Appointment updated successfully!');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update appointment');
    }
  },

  async cancelAppointment(appointmentId: string) {
    try {
      const { error } = await (supabase as any)
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;
      toast.success('Appointment cancelled successfully!');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to cancel appointment');
    }
  },

  async deleteAppointment(appointmentId: string) {
    try {
      const { error } = await (supabase as any)
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;
      toast.success('Appointment deleted successfully!');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to delete appointment');
    }
  },

  async fetchAppointments(userId: string, role: 'patient' | 'doctor') {
    if (role === 'doctor') {
      return this.fetchDoctorAppointments(userId);
    } else {
      return this.fetchPatientAppointments(userId);
    }
  }
};

// Treatment Plan API
export const treatmentPlanApi = {
  async fetchTreatmentPlans(doctorId: string, patientId?: string) {
    try {
      let query = (supabase as any)
        .from('treatment_plans')
        .select(`
          *,
          patient:patient_id (
            *,
            profiles:user_id (
              full_name,
              avatar_url
            )
          ),
          doctor_patient:doctor_patient_id (*),
          treatment_plan_procedures (
            *,
            procedure:procedure_id (*)
          ),
          medications (*)
        `)
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false });

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch treatment plans');
    }
  },

  async createTreatmentPlan(planData: {
    doctor_id: string;
    patient_id: string;
    title: string;
    description?: string;
    procedures?: Array<{
      procedure_id: string;
      status?: string;
      notes?: string;
      scheduled_date?: string;
      sequence_order?: number;
      duration_minutes?: number;
      cost?: number;
      custom_cost?: number;
      appointment_id?: string | null;
      tooth_numbers?: number[] | null;
      priority?: string | null;
    }>;
    medications?: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration?: string;
      instructions?: string;
    }>;
    estimated_duration_weeks?: number;
    priority?: string;
    expires_at?: string | null;
    doctor_patient_id?: string | null;
  }) {
    try {
      const { data: plan, error: planError } = await (supabase as any)
        .from('treatment_plans')
        .insert({
          doctor_id: planData.doctor_id,
          patient_id: planData.patient_id,
          doctor_patient_id: planData.doctor_patient_id || null,
          title: planData.title,
          notes: planData.description || null,
          total_cost: 0,
          status: 'draft',
          estimated_duration_weeks: planData.estimated_duration_weeks || null,
          priority: planData.priority || 'medium',
          expires_at: planData.expires_at || null,
        })
        .select()
        .single();

      if (planError) throw planError;

      let totalCost = 0;

      // Insert procedures
      if (planData.procedures && planData.procedures.length > 0) {
        const proceduresWithPlanId = planData.procedures.map((proc, index) => {
          const costVal =
            typeof proc.cost === 'number'
              ? proc.cost
              : typeof proc.custom_cost === 'number'
                ? proc.custom_cost
                : null;

          if (costVal) totalCost += costVal;

          return {
            treatment_plan_id: plan.id,
            procedure_id: proc.procedure_id,
            status: proc.status || 'pending',
            notes: proc.notes || null,
            scheduled_date: proc.scheduled_date || null,
            sequence_order: proc.sequence_order || index + 1,
            cost: costVal,
            appointment_id: proc.appointment_id || null,
            duration_minutes: proc.duration_minutes || null,
            tooth_numbers: proc.tooth_numbers || null,
            priority: proc.priority || null,
          };
        });

        const { error: procedureError } = await (supabase as any)
          .from('treatment_plan_procedures')
          .insert(proceduresWithPlanId);

        if (procedureError) throw procedureError;
      }

      // Insert medications
      if (planData.medications && planData.medications.length > 0) {
        const medicationsWithPlanId = planData.medications.map((med) => ({
          treatment_plan_id: plan.id,
          patient_id: planData.patient_id,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration || null,
          instructions: med.instructions || null,
        }));

        const { error: medicationError } = await (supabase as any)
          .from('medications')
          .insert(medicationsWithPlanId);

        if (medicationError) throw medicationError;
      }

      // Update total cost
      const { error: updateError } = await (supabase as any)
        .from('treatment_plans')
        .update({ total_cost: totalCost })
        .eq('id', plan.id);

      if (updateError) throw updateError;

      toast.success('Treatment plan created successfully!');
      return { data: plan, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create treatment plan');
    }
  },

  async updateTreatmentPlanStatus(
    planId: string,
    status: 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled' | 'confirmed' | 'paused' | 'pending_confirmation'
  ) {
    try {
      const { error } = await (supabase as any)
        .from('treatment_plans')
        .update({ status })
        .eq('id', planId);

      if (error) throw error;
      toast.success('Treatment plan status updated successfully!');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update treatment plan status');
    }
  },

  async updateTreatmentPlan(planId: string, updates: any) {
    try {
      const { error } = await (supabase as any)
        .from('treatment_plans')
        .update(updates)
        .eq('id', planId);

      if (error) throw error;
      toast.success('Treatment plan updated successfully!');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update treatment plan');
    }
  }
};
// Procedure API
export const procedureApi = {
  /**
   * Fetch procedures for a doctor.
   * ✅ New schema uses `dentist_id`
   * 🔁 Falls back to `doctor_id` for older deployments
   */
  async fetchProcedures(doctorId?: string) {
    try {
      const baseQuery = () =>
        (supabase as any)
          .from('procedures')
          .select(`
            *,
            procedure_materials (*),
            procedure_files (*)
          `);

      const tryOwner = async (ownerColumn: 'dentist_id' | 'doctor_id') => {
        let q = baseQuery();
        if (doctorId) q = q.eq(ownerColumn, doctorId);
        const { data, error } = await (q as any).order('created_at', { ascending: false });
        return { data, error };
      };

      // ✅ Try dentist_id first
      let res = await tryOwner('dentist_id');

      // 🔁 If dentist_id column doesn't exist (older schema), fallback to doctor_id
      if (res.error && doctorId) {
        const msg = String((res.error as any)?.message || '').toLowerCase();
        const missingDentistId =
          msg.includes('dentist_id') &&
          (msg.includes('does not exist') ||
            msg.includes('column') ||
            msg.includes('unknown') ||
            msg.includes('schema'));

        if (missingDentistId) {
          res = await tryOwner('doctor_id');
        }
      }

      if (res.error) throw res.error;
      return { data: res.data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch procedures');
    }
  },

  /**
   * Create a procedure and automatically attach the current doctor's ID.
   * - Prefers `dentist_id` (new schema)
   * - Also writes `doctor_id` for legacy schema compatibility
   *
   * Backward compatible: existing calls can still call createProcedure(procedureData)
   */
  async createProcedure(procedureData: ProcedureInsert, doctorId?: string) {
    try {
      const payload: any = { ...(procedureData as any) };

      // If caller provided doctorId, prefer it
      if (doctorId) {
        if (payload.dentist_id == null) payload.dentist_id = doctorId;
        if (payload.doctor_id == null) payload.doctor_id = doctorId;
      }

      // If neither dentist_id nor doctor_id is present, derive from current auth user
      if (payload.dentist_id == null && payload.doctor_id == null) {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) throw authErr;

        const userId = authData?.user?.id;
        if (userId) {
          const { data: doc, error: docErr } = await (supabase as any)
            .from('doctors')
            .select('id')
            .eq('user_id', userId)
            .single();

          if (!docErr && doc?.id) {
            payload.dentist_id = doc.id;
            payload.doctor_id = doc.id;
          }
        }
      }

      // Try insert with dentist_id first (new schema)
      let { data, error } = await (supabase as any)
        .from('procedures')
        .insert(payload)
        .select()
        .single();

      // If dentist_id column doesn't exist, retry without it (legacy schema)
      if (error) {
        const msg = String((error as any)?.message || '').toLowerCase();
        const missingDentistId =
          msg.includes('dentist_id') &&
          (msg.includes('does not exist') ||
            msg.includes('column') ||
            msg.includes('unknown') ||
            msg.includes('schema'));

        if (missingDentistId) {
          const retryPayload: any = { ...payload };
          delete retryPayload.dentist_id;

          if (retryPayload.doctor_id == null && payload.dentist_id != null) {
            retryPayload.doctor_id = payload.dentist_id;
          }

          ({ data, error } = await (supabase as any)
            .from('procedures')
            .insert(retryPayload)
            .select()
            .single());
        }
      }

      if (error) throw error;

      toast.success('Procedure created successfully!');
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
      toast.success('Procedure updated successfully!');
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
      toast.success('Procedure deleted successfully!');
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
      toast.success('Medical record created successfully!');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create medical record');
    }
  }
};

// File Storage API
export const storageApi = {
  async uploadFile(bucket: string, path: string, file: File) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);

      return { data: publicUrl, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to upload file');
    }
  },

  async downloadFile(bucket: string, path: string) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to download file');
    }
  },

  getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
};

// Reviews API
export const reviewApi = {
  async createReview(reviewData: any) {
    try {
      const { data, error } = await (supabase as any)
        .from('reviews')
        .insert(reviewData)
        .select()
        .single();

      if (error) throw error;
      toast.success('Review submitted successfully!');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to submit review');
    }
  },

  async fetchDoctorReviews(doctorId: string) {
    try {
      const { data, error } = await (supabase as any)
        .from('reviews')
        .select(`
          *,
          patient:patient_id (
            *,
            profiles:user_id (
              full_name,
              avatar_url
            )
          )
        `)
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch reviews');
    }
  }
};

// Payments API
export const paymentApi = {
  async createPayment(paymentData: any) {
    try {
      const { data, error } = await (supabase as any)
        .from('payments')
        .insert(paymentData)
        .select()
        .single();

      if (error) throw error;
      toast.success('Payment created successfully!');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create payment');
    }
  },

  async fetchDoctorPayments(doctorId: string) {
    try {
      const { data, error } = await (supabase as any)
        .from('payments')
        .select(`
          *,
          appointment:appointment_id (*),
          patient:patient_id (
            *,
            profiles:user_id (
              full_name,
              avatar_url
            )
          )
        `)
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch payments');
    }
  }
};

// Notifications API
export const notificationApi = {
  async fetchNotifications(userId: string) {
    try {
      const { data, error } = await (supabase as any)
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
      const { error } = await (supabase as any)
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to mark notification read');
    }
  }
};

// Practices API
export const practiceApi = {
  async fetchTopPracticesByCountry(limit: number = 6) {
    try {
      const { data, error } = await (supabase as any)
        .from('practices')
        .select('*')
        .eq('verified', true)
        .order('num_reviews', { ascending: false, nullsFirst: false })
        .order('average_rating', { ascending: false, nullsFirst: false })
        .order('appointment_count', { ascending: false, nullsFirst: false })
        .limit(limit);

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch top practices');
    }
  },

  async searchPractices(params: { query?: string; location?: string; practiceType?: string; minRating?: number }) {
    try {
      let q = (supabase as any)
        .from('practices')
        .select('*');

      const cleanQ = (params.query || '').trim();
      if (cleanQ) {
        q = q.or(`name.ilike.%${cleanQ}%,description.ilike.%${cleanQ}%`);
      }

      const cleanLoc = (params.location || '').trim();
      if (cleanLoc) {
        q = q.or(`city.ilike.%${cleanLoc}%,country.ilike.%${cleanLoc}%`);
      }

      if (params.practiceType && params.practiceType !== 'all') {
        q = q.eq('practice_type', params.practiceType);
      }

      if (params.minRating) {
        q = q.gte('weighted_rating', params.minRating);
      }

      const { data, error } = await q
        .order('weighted_rating', { ascending: false, nullsFirst: false })
        .order('appointment_count', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const normalized = (data || []).map((row: any) => ({
        ...row,
        average_rating: row.weighted_rating,
        rating: row.weighted_rating,
      }));

      return { data: normalized, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to search practices');
    }
  }
};

// Search API for advanced searching
export const searchApi = {
  async advancedPracticeSearch(params: { 
    query?: string; 
    location?: string; 
    practiceType?: string; 
    minRating?: number;
    limit?: number;
  }) {
    return practiceApi.searchPractices(params);
  },

  async advancedDoctorSearch(params: {
    query?: string;
    location?: string;
    specialty?: string;
    minRating?: number;
  }) {
    return doctorApi.searchDoctors(params.query || '', params.location, params.specialty);
  }
};
