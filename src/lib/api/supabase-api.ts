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
   * - We use the anon-safe views for search/listing so public pages work (anon can SELECT these views).
   * - We avoid embedded PostgREST joins like `profiles:user_id` because FK naming can differ per project,
   *   which caused missing doctor names and empty lists.
   */
  async fetchDoctors() {
    try {
      const { data, error } = await supabase
        .from('doctor_public_search_view')
        .select('*')
        .eq('accepts_new_patients', true)
        .order('rating', { ascending: false, nullsFirst: false })
        .order('appointment_count', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const mapped: Doctor[] = (data || []).map((row: any) => ({
        id: row.id,
        specialty: row.specialty ?? null,
        bio: row.bio ?? null,
        languages: row.languages ?? null,
        consultation_fee: row.consultation_fee ?? null,
        accepts_new_patients: row.accepts_new_patients ?? null,
        verified: true,
        weighted_rating: row.rating ?? null,
        average_rating: row.rating ?? null,
        num_reviews: row.num_reviews ?? null,
        appointment_count: row.appointment_count ?? null,
        profiles: {
          full_name: row.full_name ?? null,
          avatar_url: row.avatar_url ?? null,
          email: null,
          username: row.username ?? null,
        },
        practices: {
          id: row.practice_id ?? null,
          name: row.practice_name ?? null,
          city: row.practice_city ?? null,
          country: row.practice_country ?? null,
          logo_url: null,
        },
      }));

      return { data: mapped, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch doctors');
    }
  },

  async fetchTopDoctorsBySpecialty(limit: number = 6) {
    try {
      const { data, error } = await supabase
        .from('doctor_public_search_view')
        .select('*')
        .eq('accepts_new_patients', true)
        .order('rating', { ascending: false, nullsFirst: false })
        .order('appointment_count', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const allDoctors: Doctor[] = (data || []).map((row: any) => ({
        id: row.id,
        specialty: row.specialty ?? null,
        bio: row.bio ?? null,
        languages: row.languages ?? null,
        consultation_fee: row.consultation_fee ?? null,
        accepts_new_patients: row.accepts_new_patients ?? null,
        verified: true,
        weighted_rating: row.rating ?? null,
        average_rating: row.rating ?? null,
        num_reviews: row.num_reviews ?? null,
        appointment_count: row.appointment_count ?? null,
        profiles: {
          full_name: row.full_name ?? null,
          avatar_url: row.avatar_url ?? null,
          email: null,
          username: row.username ?? null,
        },
        practices: {
          id: row.practice_id ?? null,
          name: row.practice_name ?? null,
          city: row.practice_city ?? null,
          country: row.practice_country ?? null,
          logo_url: null,
        },
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
      let query = supabase
        .from('doctor_public_search_view')
        .select('*')
        .eq('accepts_new_patients', true);

      if (specialty) {
        query = query.ilike('specialty', `%${specialty}%`);
      }

      if (location) {
        const cleanLoc = location.replace(/[,()]/g, ' ').trim();
        if (cleanLoc) {
          query = query.or(`practice_city.ilike.%${cleanLoc}%,practice_country.ilike.%${cleanLoc}%`);
        }
      }

      if (searchTerm && !specialty) {
        const cleanSearchTerm = searchTerm.replace(/[,()]/g, ' ').trim();
        if (cleanSearchTerm) {
          const words = cleanSearchTerm.split(/\s+/).filter((w) => w.length > 0);
          if (words.length > 0) {
            const w = words[0];
            query = query.or(
              `full_name.ilike.%${w}%,specialty.ilike.%${w}%,bio.ilike.%${w}%,practice_name.ilike.%${w}%,username.ilike.%${w}%`,
            );
          }
        }
      }

      const { data, error } = await query
        .order('rating', { ascending: false, nullsFirst: false })
        .order('appointment_count', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const mapped: Doctor[] = (data || []).map((row: any) => ({
        id: row.id,
        specialty: row.specialty ?? null,
        bio: row.bio ?? null,
        languages: row.languages ?? null,
        consultation_fee: row.consultation_fee ?? null,
        accepts_new_patients: row.accepts_new_patients ?? null,
        verified: true,
        weighted_rating: row.rating ?? null,
        average_rating: row.rating ?? null,
        num_reviews: row.num_reviews ?? null,
        appointment_count: row.appointment_count ?? null,
        profiles: {
          full_name: row.full_name ?? null,
          avatar_url: row.avatar_url ?? null,
          email: null,
          username: row.username ?? null,
        },
        practices: {
          id: row.practice_id ?? null,
          name: row.practice_name ?? null,
          city: row.practice_city ?? null,
          country: row.practice_country ?? null,
          logo_url: null,
        },
      }));

      return { data: mapped, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to search doctors');
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
        const { data: rows, error } = await supabase
          .from('patient_all_appointments')
          .select('*')
          .order('appointment_date', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) throw error;

        const doctorIds = Array.from(
          new Set((rows || []).map((r: any) => r.doctor_id).filter(Boolean)),
        ) as string[];
        const practiceIds = Array.from(
          new Set((rows || []).map((r: any) => r.practice_id).filter(Boolean)),
        ) as string[];

        const doctorMap = new Map<string, any>();
        if (doctorIds.length > 0) {
          const { data: docRows, error: docErr } = await supabase
            .from('doctor_public_profile_view')
            .select('id, specialty, full_name, avatar_url')
            .in('id', doctorIds);

          if (!docErr && docRows) {
            docRows.forEach((d: any) => {
              doctorMap.set(d.id, {
                id: d.id,
                specialty: d.specialty,
                profiles: { full_name: d.full_name, avatar_url: d.avatar_url },
              });
            });
          }
        }

        const practiceMap = new Map<string, any>();
        if (practiceIds.length > 0) {
          // Prefer full practices table (more fields), but fall back to public view if RLS blocks it.
          const { data: pRows, error: pErr } = await supabase
            .from('practices')
            .select('id, name, address, phone, city, country')
            .in('id', practiceIds);

          if (!pErr && pRows) {
            pRows.forEach((p: any) => practiceMap.set(p.id, p));
          } else {
            const { data: pvRows, error: pvErr } = await supabase
              .from('practice_public_search_view')
              .select('id, name, city, country')
              .in('id', practiceIds);

            if (!pvErr && pvRows) {
              pvRows.forEach((p: any) => practiceMap.set(p.id, p));
            }
          }
        }

        const hydrated = (rows || []).map((apt: any) => ({
          ...apt,
          doctor: apt.doctor_id ? doctorMap.get(apt.doctor_id) : null,
          practice: apt.practice_id ? practiceMap.get(apt.practice_id) : null,
        }));

        return { data: hydrated, success: true };
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

        const { data: rows, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('doctor_id', doctorData.id)
          .order('appointment_date', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) throw error;

        const practiceIds = Array.from(
          new Set((rows || []).map((r: any) => r.practice_id).filter(Boolean)),
        ) as string[];

        const practiceMap = new Map<string, any>();
        if (practiceIds.length > 0) {
          const { data: pRows, error: pErr } = await supabase
            .from('practices')
            .select('id, name, address, phone, city, country')
            .in('id', practiceIds);

          if (!pErr && pRows) {
            pRows.forEach((p: any) => practiceMap.set(p.id, p));
          } else {
            const { data: pvRows, error: pvErr } = await supabase
              .from('practice_public_search_view')
              .select('id, name, city, country')
              .in('id', practiceIds);

            if (!pvErr && pvRows) {
              pvRows.forEach((p: any) => practiceMap.set(p.id, p));
            }
          }
        }

        const hydrated = (rows || []).map((apt: any) => ({
          ...apt,
          practice: apt.practice_id ? practiceMap.get(apt.practice_id) : null,
        }));

        return { data: hydrated, success: true };
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

  async createTreatmentPlan(planData: {
    doctor_id: string;
    patient_id: string;
    title: string;
    description?: string;
    procedures?: Array<{
      procedure_id: string;
      cost?: number;
    }>;
    medications?: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration?: string;
      instructions?: string;
    }>;
  }) {
    try {
      // Create treatment plan
      const { data: plan, error: planError } = await supabase
        .from('treatment_plans')
        .insert({
          doctor_id: planData.doctor_id,
          patient_id: planData.patient_id,
          title: planData.title,
          description: planData.description || null,
          status: 'active'
        })
        .select()
        .single();

      if (planError) throw planError;

      // Add procedures if provided
      if (planData.procedures && planData.procedures.length > 0) {
        const proceduresData = planData.procedures.map(proc => ({
          treatment_plan_id: plan.id,
          procedure_id: proc.procedure_id,
          cost: proc.cost || null
        }));

        const { error: procError } = await supabase
          .from('treatment_plan_procedures')
          .insert(proceduresData);

        if (procError) throw procError;
      }

      // Add medications if provided
      if (planData.medications && planData.medications.length > 0) {
        const medicationsData = planData.medications.map(med => ({
          treatment_plan_id: plan.id,
          patient_id: planData.patient_id,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration || null,
          instructions: med.instructions || null,
          prescribed_by: planData.doctor_id
        }));

        const { error: medError } = await supabase
          .from('medications')
          .insert(medicationsData);

        if (medError) throw medError;
      }

      toast.success('Treatment plan created successfully!');
      return { data: plan, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create treatment plan');
    }
  },

  async updateTreatmentPlanStatus(planId: string, status: string) {
    try {
      const { error } = await supabase
        .from('treatment_plans')
        .update({ status })
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
  async fetchProcedures(doctorId?: string) {
    try {
      let query = supabase
        .from('procedures')
        .select(`
          *,
          procedure_materials (*),
          procedure_files (*)
        `);

      if (doctorId) {
        query = query.eq('doctor_id', doctorId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch procedures');
    }
  },

  async createProcedure(procedureData: ProcedureInsert) {
    try {
      const { data, error } = await supabase
        .from('procedures')
        .insert(procedureData)
        .select()
        .single();

      if (error) throw error;
      toast.success('Procedure created successfully!');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create procedure');
    }
  },

  async updateProcedure(procedureId: string, updates: Partial<ProcedureInsert>) {
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
  async fetchMedicalRecords(patientId: string) {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select(`
          *,
          doctor:doctors (
            id,
            profiles:user_id (
              full_name
            )
          ),
          practice:practices (
            name
          )
        `)
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

  async deleteFile(bucket: string, path: string) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
      toast.success('File deleted successfully!');
      return { success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to delete file');
    }
  }
};

// Doctor Dashboard Stats API
export const doctorDashboardApi = {
  async getDashboardStats(doctorId: string) {
    try {
      // Get appointments for today
      const today = new Date().toISOString().split('T')[0];
      const { data: todayAppointments, error: todayError } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', today);

      if (todayError) throw todayError;

      // Get total patients count
      const { count: patientCount, error: patientError } = await supabase
        .from('doctor_patients')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', doctorId);

      if (patientError) throw patientError;

      // Get active treatment plans count
      const { count: activePlans, error: plansError } = await supabase
        .from('treatment_plans')
        .select('*', { count: 'exact', head: true })
        .eq('doctor_id', doctorId)
        .eq('status', 'active');

      if (plansError) throw plansError;

      return {
        data: {
          todayAppointments: todayAppointments?.length || 0,
          totalPatients: patientCount || 0,
          activeTreatmentPlans: activePlans || 0,
        },
        success: true
      };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch dashboard stats');
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
        .eq('verified', true)
        .order('weighted_rating', { ascending: false });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch practices');
    }
  }
};

export const searchApi = {
  async advancedDoctorSearch(params: {
    query?: string;
    specialty?: string;
    location?: string;
    minRating?: number;
    minPrice?: number;
    maxPrice?: number;
    acceptsNewPatients?: boolean;
    videoConsultation?: boolean;
    acceptsInsurance?: boolean;
    language?: string;
    gender?: string;
  }) {
    try {
      // Use anon-safe search view so Find Doctors works publicly
      let q = supabase
        .from('doctor_public_search_view')
        .select('*');

      if (params.query) {
        const cleanQuery = params.query.replace(/[,()]/g, ' ').trim();
        if (cleanQuery) {
          const words = cleanQuery.split(/\s+/).filter((w) => w.length > 0);
          if (words.length > 0) {
            const w = words[0];
            q = q.or(
              `full_name.ilike.%${w}%,specialty.ilike.%${w}%,bio.ilike.%${w}%,practice_name.ilike.%${w}%,username.ilike.%${w}%`,
            );
          }
        }
      }

      if (params.specialty) {
        q = q.ilike('specialty', `%${params.specialty}%`);
      }

      if (params.location) {
        const cleanLoc = params.location.replace(/[,()]/g, ' ').trim();
        if (cleanLoc) {
          q = q.or(`practice_city.ilike.%${cleanLoc}%,practice_country.ilike.%${cleanLoc}%`);
        }
      }

      if (params.minRating) {
        q = q.gte('rating', params.minRating);
      }

      if (params.minPrice !== undefined) {
        q = q.gte('consultation_fee', params.minPrice);
      }
      if (params.maxPrice !== undefined) {
        q = q.lte('consultation_fee', params.maxPrice);
      }

      if (params.acceptsNewPatients) {
        q = q.eq('accepts_new_patients', true);
      }

      // videoConsultation/gender/acceptsInsurance are not exposed by the public view; we ignore them safely.
      if (params.language) {
        q = q.contains('languages', [params.language]);
      }

      const { data, error } = await q
        .order('rating', { ascending: false, nullsFirst: false })
        .order('appointment_count', { ascending: false, nullsFirst: false });

      if (error) throw error;

      // Normalize fields so UI components that expect doctors-table-like columns still work
      const normalized = (data || []).map((row: any) => ({
        ...row,
        weighted_rating: row.rating,
        average_rating: row.rating,
      }));

      return { data: normalized, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to search doctors');
    }
  },

  async advancedPracticeSearch(params: {
    query?: string;
    location?: string;
    practiceType?: string;
    minRating?: number;
  }) {
    try {
      // Use anon-safe search view so Find Practices works publicly
      let q = supabase
        .from('practice_public_search_view')
        .select('*');

      if (params.query) {
        const cleanQuery = params.query.replace(/[,()]/g, ' ').trim();
        if (cleanQuery) {
          q = q.or(`name.ilike.%${cleanQuery}%,description.ilike.%${cleanQuery}%`);
        }
      }

      if (params.location) {
        const cleanLoc = params.location.replace(/[,()]/g, ' ').trim();
        if (cleanLoc) {
          q = q.or(`city.ilike.%${cleanLoc}%,country.ilike.%${cleanLoc}%`);
        }
      }

      if (params.practiceType && params.practiceType !== 'all') {
        q = q.eq('practice_type', params.practiceType);
      }

      if (params.minRating) {
        q = q.gte('rating', params.minRating);
      }

      const { data, error } = await q
        .order('rating', { ascending: false, nullsFirst: false })
        .order('appointment_count', { ascending: false, nullsFirst: false });

      if (error) throw error;

      const normalized = (data || []).map((row: any) => ({
        ...row,
        average_rating: row.rating,
        weighted_rating: row.rating,
      }));

      return { data: normalized, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to search practices');
    }
  }
};
