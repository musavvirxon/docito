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

      if (specialty) {
        query = query.ilike('specialty', `%${specialty}%`);
      }

      if (searchTerm && !specialty) {
        // Clean the search term by removing problematic characters
        const cleanSearchTerm = searchTerm.replace(/[,()]/g, ' ').trim();
        if (cleanSearchTerm) {
          // Split into words and search each separately to avoid SQL parsing issues
          const words = cleanSearchTerm.split(/\s+/).filter(word => word.length > 0);
          if (words.length > 0) {
            // Use the first word for the main search to avoid complex OR queries
            const mainWord = words[0];
            query = query.or(`specialty.ilike.%${mainWord}%,bio.ilike.%${mainWord}%`);
          }
        }
      }

      const { data, error } = await query
        .order('weighted_rating', { ascending: false })
        .order('appointment_count', { ascending: false });
      if (error) throw error;

      // Filter by location if provided
      let filteredData = data || [];
      if (location) {
        filteredData = filteredData.filter(doctor => 
          doctor.practices?.city?.toLowerCase().includes(location.toLowerCase()) ||
          doctor.practices?.country?.toLowerCase().includes(location.toLowerCase())
        );
      }

      return { data: filteredData, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to search doctors');
    }
  },

  async updateDoctorProfile(doctorId: string, updates: Partial<Tables<'doctors'>>) {
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
        const { data, error } = await supabase
          .from('patient_all_appointments')
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
          .order('appointment_date', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) throw error;
        return { data: data || [], success: true };
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
    appointment_date: string;
    start_time: string;
    end_time: string;
    notes?: string;
  }) {
    try {
      const { data, error } = await supabase.functions.invoke('create_appointment', {
        body: appointmentData
      });

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
      notes?: string;
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
          description: planData.description,
          status: 'draft'
        })
        .select()
        .single();

      if (planError) throw planError;

      // Add procedures if provided
      if (planData.procedures && planData.procedures.length > 0) {
        const proceduresData = planData.procedures.map((proc, index) => ({
          treatment_plan_id: plan.id,
          procedure_id: proc.procedure_id,
          cost: proc.cost,
          notes: proc.notes,
          sequence_order: index + 1
        }));

        const { error: procError } = await supabase
          .from('treatment_plan_procedures')
          .insert(proceduresData);

        if (procError) throw procError;
      }

      toast.success('Treatment plan created successfully!');
      return { data: plan, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to create treatment plan');
    }
  }
};

// Procedure API
export const procedureApi = {
  async fetchDoctorProcedures(userId: string) {
    try {
      // First get doctor ID
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (!doctorData) {
        return { data: [], success: true };
      }

      const { data, error } = await supabase
        .from('procedures')
        .select(`
          *,
          procedure_materials (*),
          procedure_files (*)
        `)
        .eq('dentist_id', doctorData.id)
        .eq('is_active', true)
        .order('name');

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
        .order('record_date', { ascending: false });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch medical records');
    }
  },

  async addMedicalRecord(recordData: MedicalRecordInsert) {
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .insert(recordData)
        .select()
        .single();

      if (error) throw error;
      toast.success('Medical record added successfully!');
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to add medical record');
    }
  }
};

// Storage API
export const storageApi = {
  async uploadFile(bucket: string, path: string, file: File) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file);

      if (error) throw error;
      toast.success('File uploaded successfully!');
      return { data, success: true };
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
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);
    
    return data.publicUrl;
  }
};

// Doctor Dashboard API
export const doctorDashboardApi = {
  async fetchDoctorProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email,
            avatar_url,
            phone
          ),
          practices:practice_id (
            name,
            city,
            country,
            verified
          )
        `)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return { data, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch doctor profile');
    }
  },

  async fetchTodaysAppointments(doctorId: string) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          start_time,
          end_time,
          status,
          notes,
          profiles:patient_id (
            full_name
          )
        `)
        .eq('doctor_id', doctorId)
        .eq('appointment_date', today)
        .order('start_time', { ascending: true });

      if (error) throw error;
      return { data: data || [], success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch today\'s appointments');
    }
  },

  async fetchPerformanceStats(doctorId: string) {
    try {
      // Get unique patients count
      const { data: appointments } = await supabase
        .from('appointments')
        .select('patient_id, status')
        .eq('doctor_id', doctorId)
        .neq('status', 'canceled');

      const uniquePatients = new Set(appointments?.map(a => a.patient_id) || []);
      const completedAppointments = appointments?.filter(a => a.status === 'completed') || [];

      // Get doctor profile for additional stats
      const { data: doctorProfile } = await supabase
        .from('doctors')
        .select('appointment_count, average_rating, num_reviews, consultation_fee')
        .eq('id', doctorId)
        .single();

      const revenue = completedAppointments.length * (doctorProfile?.consultation_fee || 150);

      return {
        data: {
          totalPatients: uniquePatients.size,
          totalAppointments: doctorProfile?.appointment_count || 0,
          totalRevenue: revenue,
          averageRating: doctorProfile?.average_rating || 0,
          numReviews: doctorProfile?.num_reviews || 0,
        },
        success: true
      };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch performance stats');
    }
  }
};

// Practice API
export const practiceApi = {
  async fetchTopPracticesByCountry(limit: number = 6) {
    try {
      // Get all verified practices
      const { data: allPractices, error } = await supabase
        .from('practices')
        .select('*')
        .eq('verified', true)
        .order('weighted_rating', { ascending: false });

      if (error) throw error;

      // Group by country and pick top practice from each
      const countryMap = new Map<string, any>();
      allPractices?.forEach(practice => {
        const country = practice.country || 'Unknown';
        if (!countryMap.has(country) || 
            (countryMap.get(country).weighted_rating || 0) < (practice.weighted_rating || 0)) {
          countryMap.set(country, practice);
        }
      });

      // Get top N practices from different countries
      const diversePractices = Array.from(countryMap.values())
        .sort((a, b) => (b.weighted_rating || 0) - (a.weighted_rating || 0))
        .slice(0, limit);

      return { data: diversePractices, success: true };
    } catch (error: any) {
      return handleApiError(error, 'Failed to fetch top practices by country');
    }
  }
};