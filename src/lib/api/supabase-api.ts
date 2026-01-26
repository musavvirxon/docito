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
  async fetchDoctors() {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            email
          ),
          practices:practice_id (
            name,
            city,
            country,
            logo_url
          )
        `)
        .eq('verified', true)
        .eq('accepts_new_patients', true)
        .order('weighted_rating', { ascending: false })
        .order('appointment_count', { ascending: false });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch doctors');
    }
  },

  async fetchTopDoctorsBySpecialty(limit: number = 6) {
    try {
      // Get all doctors first
      const { data: allDoctors, error } = await supabase
        .from('doctors')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            email
          ),
          practices:practice_id (
            name,
            city,
            country,
            logo_url
          )
        `)
        .eq('verified', true)
        .eq('accepts_new_patients', true)
        .order('weighted_rating', { ascending: false });

      if (error) throw error;

      // Group by specialty and pick top doctor from each
      const specialtyMap = new Map<string, any>();
      allDoctors?.forEach(doctor => {
        const specialty = doctor.specialty;
        if (!specialtyMap.has(specialty) || 
            (specialtyMap.get(specialty).weighted_rating || 0) < (doctor.weighted_rating || 0)) {
          specialtyMap.set(specialty, doctor);
        }
      });

      // Get top N doctors from different specialties
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
      let query = supabase
        .from('doctors')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            email
          ),
          practices:practice_id (
            name,
            city,
            country,
            logo_url
          )
        `)
        .eq('verified', true)
        .eq('accepts_new_patients', true);

      if (searchTerm) {
        query = query.or(`specialty.ilike.%${searchTerm}%,bio.ilike.%${searchTerm}%`);
      }

      if (location) {
        // Search by practice city/country
        query = query.or(`practices.city.ilike.%${location}%,practices.country.ilike.%${location}%`);
      }

      if (specialty) {
        query = query.eq('specialty', specialty);
      }

      const { data, error } = await query
        .order('weighted_rating', { ascending: false })
        .order('appointment_count', { ascending: false });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to search doctors');
    }
  },

  async fetchDoctorById(doctorId: string) {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url,
            email,
            phone
          ),
          practices:practice_id (
            name,
            city,
            country,
            logo_url,
            address,
            phone
          )
        `)
        .eq('id', doctorId)
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch doctor details');
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

  async updateDoctorProfile(doctorId: string, updates: any) {
    try {
      const { error } = await supabase
        .from('doctors')
        .update(updates)
        .eq('id', doctorId);

      if (error) throw error;
      toast.success('Doctor profile updated successfully!');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to update doctor profile');
    }
  }
};

// Appointment API
export const appointmentApi = {
  async fetchAppointments(userId: string, userRole: 'patient' | 'doctor') {
    try {
      if (userRole === 'patient') {
        // Use unified view for patients - includes appointments matched by email/phone
        // NOTE: patient_all_appointments is a VIEW (a.*) without PostgREST relationships,
        // so we fetch appointments first, then hydrate doctor + practice manually.
        const { data: appts, error } = await supabase
          .from('patient_all_appointments')
          .select('*')
          .order('appointment_date', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) throw error;

        const appointments = appts || [];
        if (appointments.length === 0) {
          return { data: [], success: true };
        }

        const doctorIds = Array.from(
          new Set(
            appointments
              .map((a: any) => a.doctor_id)
              .filter((v: any) => typeof v === 'string' && v.length > 0)
          )
        ) as string[];

        const practiceIds = Array.from(
          new Set(
            appointments
              .map((a: any) => a.practice_id)
              .filter((v: any) => typeof v === 'string' && v.length > 0)
          )
        ) as string[];

        const doctorMap = new Map<string, any>();
        if (doctorIds.length > 0) {
          const { data: doctors, error: dErr } = await supabase
            .from('doctors')
            .select(`
              *,
              profiles:user_id (
                full_name,
                avatar_url,
                email
              ),
              practices:practice_id (
                name,
                city,
                country,
                logo_url
              )
            `)
            .in('id', doctorIds);

          if (dErr) throw dErr;
          (doctors || []).forEach((d: any) => {
            if (d?.id) doctorMap.set(String(d.id), d);
          });
        }

        const practiceMap = new Map<string, any>();
        if (practiceIds.length > 0) {
          const { data: practices, error: pErr } = await supabase
            .from('practices')
            .select('*')
            .in('id', practiceIds);

          if (pErr) throw pErr;
          (practices || []).forEach((pr: any) => {
            if (pr?.id) practiceMap.set(String(pr.id), pr);
          });
        }

        const hydrated = appointments.map((a: any) => ({
          ...a,
          doctor: a.doctor_id ? doctorMap.get(String(a.doctor_id)) || null : null,
          practice: a.practice_id ? practiceMap.get(String(a.practice_id)) || null : null
        }));

        return { data: hydrated || [], success: true };
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
          .select(`
            *,
            doctor:doctors(
              id,
              specialty,
              user_id,
              profiles:user_id (
                full_name,
                avatar_url
              )
            ),
            practice:practices(
              id,
              name,
              address,
              phone
            )
          `)
          .eq('doctor_id', doctorData.id)
          .order('appointment_date', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) throw error;
        return { data: data || [], success: true };
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
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'canceled' })
        .eq('id', appointmentId);

      if (error) throw error;
      toast.success('Appointment cancelled successfully!');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to cancel appointment');
    }
  }
};

// Treatment Plan API
export const treatmentPlanApi = {
  async fetchTreatmentPlans(userId: string, userRole: 'patient' | 'doctor') {
    try {
      let query = supabase
        .from('treatment_plans')
        .select(`
          *,
          treatment_plan_procedures (
            *,
            procedures (
              name,
              description,
              default_cost
            )
          ),
          medications (*)
        `);

      if (userRole === 'patient') {
        query = query.eq('patient_id', userId);
      } else {
        // For doctors, find treatment plans where doctor_id matches their doctor record
        const { data: doctorData } = await supabase
          .from('doctors')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (doctorData) {
          query = query.eq('doctor_id', doctorData.id);
        }
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch treatment plans');
    }
  },

  async createTreatmentPlan(treatmentPlan: any) {
    try {
      const { data, error } = await supabase
        .from('treatment_plans')
        .insert(treatmentPlan)
        .select()
        .single();

      if (error) throw error;
      toast.success('Treatment plan created successfully!');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create treatment plan');
    }
  },

  async updateTreatmentPlan(planId: string, updates: any) {
    try {
      const { error } = await supabase
        .from('treatment_plans')
        .update(updates)
        .eq('id', planId);

      if (error) throw error;
      toast.success('Treatment plan updated successfully!');
      return { success: true };
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
      toast.success('Treatment plan deleted successfully!');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to delete treatment plan');
    }
  }
};

// Procedure API
export const procedureApi = {
  async fetchProcedures() {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .select(`
          *,
          procedure_materials (*),
          procedure_files (*)
        `)
        .order('name', { ascending: true });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch procedures');
    }
  },

  async createProcedure(procedure: ProcedureInsert) {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .insert(procedure)
        .select()
        .single();

      if (error) throw error;
      toast.success('Procedure created successfully!');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create procedure');
    }
  },

  async updateProcedure(procedureId: string, updates: any) {
    try {
      const { error } = await supabase
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
  async fetchMedicalRecords(userId: string) {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', userId)
        .order('record_date', { ascending: false });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch medical records');
    }
  },

  async createMedicalRecord(medicalRecord: MedicalRecordInsert) {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .insert(medicalRecord)
        .select()
        .single();

      if (error) throw error;
      toast.success('Medical record created successfully!');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create medical record');
    }
  },

  async updateMedicalRecord(recordId: string, updates: any) {
    try {
      const { error } = await supabase
        .from('medical_records')
        .update(updates)
        .eq('id', recordId);

      if (error) throw error;
      toast.success('Medical record updated successfully!');
      return { success: true };
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
      toast.success('Medical record deleted successfully!');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to delete medical record');
    }
  }
};

// Storage API
export const storageApi = {
  async uploadFile(bucket: string, path: string, file: File) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to upload file');
    }
  },

  async getPublicUrl(bucket: string, path: string) {
    try {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to get file URL');
    }
  },

  async deleteFile(bucket: string, path: string) {
    try {
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (error) throw error;
      toast.success('File deleted successfully!');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to delete file');
    }
  }
};

// Doctor Dashboard API
export const doctorDashboardApi = {
  async getDoctorStats(doctorId: string) {
    try {
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId);

      if (appointmentsError) throw appointmentsError;

      const today = new Date().toISOString().split('T')[0];
      const upcomingAppointments = appointments?.filter(a => a.appointment_date >= today) || [];
      const totalAppointments = appointments?.length || 0;

      // Get treatment plans count
      const { data: treatmentPlans, error: treatmentPlansError } = await supabase
        .from('treatment_plans')
        .select('id')
        .eq('doctor_id', doctorId);

      if (treatmentPlansError) throw treatmentPlansError;

      // Get procedures count
      const { data: procedures, error: proceduresError } = await supabase
        .from('procedures')
        .select('id')
        .eq('doctor_id', doctorId);

      if (proceduresError) throw proceduresError;

      return {
        data: {
          totalAppointments,
          upcomingAppointments: upcomingAppointments.length,
          totalTreatmentPlans: treatmentPlans?.length || 0,
          totalProcedures: procedures?.length || 0
        },
        success: true
      };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch doctor stats');
    }
  },

  async getRecentAppointments(doctorId: string, limit: number = 5) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:profiles!appointments_patient_id_fkey (
            full_name,
            avatar_url,
            email
          )
        `)
        .eq('doctor_id', doctorId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch recent appointments');
    }
  }
};

// Practice API
export const practiceApi = {
  async fetchPractices() {
    try {
      const { data, error } = await supabase
        .from('practices')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch practices');
    }
  },

  async fetchPracticeById(practiceId: string) {
    try {
      const { data, error } = await supabase
        .from('practices')
        .select('*')
        .eq('id', practiceId)
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch practice details');
    }
  }
};

// Search API
export const searchApi = {
  async searchPractices(searchTerm: string) {
    try {
      const { data, error } = await supabase
        .from('practices')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%,country.ilike.%${searchTerm}%`)
        .order('name', { ascending: true });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to search practices');
    }
  },

  async searchDoctors(searchTerm: string, location?: string, specialty?: string) {
    return doctorApi.searchDoctors(searchTerm, location, specialty);
  }
};
