export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      account_activity: {
        Row: {
          activity_type: string
          created_at: string | null
          device_info: string | null
          id: string
          ip_address: unknown | null
          location: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          device_info?: string | null
          id?: string
          ip_address?: unknown | null
          location?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          device_info?: string | null
          id?: string
          ip_address?: unknown | null
          location?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      account_requests: {
        Row: {
          completed_at: string | null
          id: string
          notes: string | null
          request_type: string
          requested_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          notes?: string | null
          request_type: string
          requested_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          notes?: string | null
          request_type?: string
          requested_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      achievements: {
        Row: {
          badge_color: string | null
          category: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          requirement_type: string | null
          requirement_value: number | null
          title: string
        }
        Insert: {
          badge_color?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          requirement_type?: string | null
          requirement_value?: number | null
          title: string
        }
        Update: {
          badge_color?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          requirement_type?: string | null
          requirement_value?: number | null
          title?: string
        }
        Relationships: []
      }
      appointment_procedures: {
        Row: {
          appointment_id: string | null
          consent_ip_address: unknown | null
          consent_signed_at: string | null
          created_at: string
          estimated_cost: number | null
          id: string
          patient_consent_status: string | null
          prescribed_at: string
          prescribed_by: string | null
          procedure_id: string | null
          procedure_notes: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          consent_ip_address?: unknown | null
          consent_signed_at?: string | null
          created_at?: string
          estimated_cost?: number | null
          id?: string
          patient_consent_status?: string | null
          prescribed_at?: string
          prescribed_by?: string | null
          procedure_id?: string | null
          procedure_notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          consent_ip_address?: unknown | null
          consent_signed_at?: string | null
          created_at?: string
          estimated_cost?: number | null
          id?: string
          patient_consent_status?: string | null
          prescribed_at?: string
          prescribed_by?: string | null
          procedure_id?: string | null
          procedure_notes?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_procedures_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_procedures_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_all_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_procedures_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          created_at: string | null
          doctor_id: string | null
          end_time: string
          id: string
          notes: string | null
          patient_id: string | null
          practice_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["appointment_status"] | null
        }
        Insert: {
          appointment_date: string
          created_at?: string | null
          doctor_id?: string | null
          end_time: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          practice_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
        }
        Update: {
          appointment_date?: string
          created_at?: string | null
          doctor_id?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          practice_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["appointment_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      availability_overrides: {
        Row: {
          created_at: string
          doctor_id: string
          end_time: string
          id: string
          is_available: boolean | null
          notes: string | null
          override_date: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          end_time: string
          id?: string
          is_available?: boolean | null
          notes?: string | null
          override_date: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          end_time?: string
          id?: string
          is_available?: boolean | null
          notes?: string | null
          override_date?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_overrides_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_overrides_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_times: {
        Row: {
          block_type: string | null
          blocked_date: string
          created_at: string
          doctor_id: string
          end_time: string
          id: string
          reason: string | null
          start_time: string
          updated_at: string
        }
        Insert: {
          block_type?: string | null
          blocked_date: string
          created_at?: string
          doctor_id: string
          end_time: string
          id?: string
          reason?: string | null
          start_time: string
          updated_at?: string
        }
        Update: {
          block_type?: string | null
          blocked_date?: string
          created_at?: string
          doctor_id?: string
          end_time?: string
          id?: string
          reason?: string | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_times_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_times_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_forms: {
        Row: {
          content: string
          created_at: string | null
          digital_signature: string | null
          id: string
          ip_address: unknown | null
          patient_full_name: string | null
          patient_signature: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["consent_status"] | null
          title: string
          treatment_plan_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          digital_signature?: string | null
          id?: string
          ip_address?: unknown | null
          patient_full_name?: string | null
          patient_signature?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["consent_status"] | null
          title: string
          treatment_plan_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          digital_signature?: string | null
          id?: string
          ip_address?: unknown | null
          patient_full_name?: string | null
          patient_signature?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["consent_status"] | null
          title?: string
          treatment_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_forms_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          accepts_new_patients: boolean | null
          appointment_count: number | null
          average_rating: number | null
          bio: string | null
          consultation_fee: number | null
          created_at: string | null
          id: string
          license_number: string | null
          num_reviews: number | null
          practice_id: string | null
          specialty: string
          user_id: string | null
          verified: boolean | null
          weighted_rating: number | null
        }
        Insert: {
          accepts_new_patients?: boolean | null
          appointment_count?: number | null
          average_rating?: number | null
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          id?: string
          license_number?: string | null
          num_reviews?: number | null
          practice_id?: string | null
          specialty: string
          user_id?: string | null
          verified?: boolean | null
          weighted_rating?: number | null
        }
        Update: {
          accepts_new_patients?: boolean | null
          appointment_count?: number | null
          average_rating?: number | null
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          id?: string
          license_number?: string | null
          num_reviews?: number | null
          practice_id?: string | null
          specialty?: string
          user_id?: string | null
          verified?: boolean | null
          weighted_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_doctors_user_id"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      google_calendar_sync: {
        Row: {
          access_token: string | null
          calendar_id: string | null
          created_at: string
          doctor_id: string
          id: string
          last_sync_at: string | null
          refresh_token: string | null
          sync_enabled: boolean | null
          token_expiry: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          calendar_id?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          last_sync_at?: string | null
          refresh_token?: string | null
          sync_enabled?: boolean | null
          token_expiry?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          calendar_id?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          last_sync_at?: string | null
          refresh_token?: string | null
          sync_enabled?: boolean | null
          token_expiry?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_sync_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: true
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_calendar_sync_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: true
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          added_by: string | null
          created_at: string | null
          description: string | null
          doctor_email: string | null
          doctor_name: string | null
          doctor_phone: string | null
          id: string
          patient_id: string | null
          practice_name: string | null
          record_date: string | null
          record_type: Database["public"]["Enums"]["record_type"] | null
          status: string | null
          title: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          description?: string | null
          doctor_email?: string | null
          doctor_name?: string | null
          doctor_phone?: string | null
          id?: string
          patient_id?: string | null
          practice_name?: string | null
          record_date?: string | null
          record_type?: Database["public"]["Enums"]["record_type"] | null
          status?: string | null
          title: string
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          description?: string | null
          doctor_email?: string | null
          doctor_name?: string | null
          doctor_phone?: string | null
          id?: string
          patient_id?: string | null
          practice_name?: string | null
          record_date?: string | null
          record_type?: Database["public"]["Enums"]["record_type"] | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      medication_reminders: {
        Row: {
          created_at: string
          id: string
          medication_id: string | null
          patient_id: string
          reminder_time: string
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          medication_id?: string | null
          patient_id: string
          reminder_time: string
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          medication_id?: string | null
          patient_id?: string
          reminder_time?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medication_reminders_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          created_at: string
          doctor_id: string | null
          dosage: string
          end_date: string | null
          frequency: string
          id: string
          instructions: string | null
          name: string
          patient_id: string
          reminder_enabled: boolean | null
          route: string | null
          start_date: string
          status: string | null
          treatment_plan_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id?: string | null
          dosage: string
          end_date?: string | null
          frequency: string
          id?: string
          instructions?: string | null
          name: string
          patient_id: string
          reminder_enabled?: boolean | null
          route?: string | null
          start_date: string
          status?: string | null
          treatment_plan_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string | null
          dosage?: string
          end_date?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          name?: string
          patient_id?: string
          reminder_enabled?: boolean | null
          route?: string | null
          start_date?: string
          status?: string | null
          treatment_plan_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          related_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      practice_join_requests: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          notes: string | null
          practice_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          notes?: string | null
          practice_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          notes?: string | null
          practice_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_join_requests_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_join_requests_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_join_requests_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      practices: {
        Row: {
          address: string | null
          admin_id: string | null
          appointment_count: number | null
          average_rating: number | null
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          num_reviews: number | null
          phone: string | null
          verified: boolean | null
          weighted_rating: number | null
        }
        Insert: {
          address?: string | null
          admin_id?: string | null
          appointment_count?: number | null
          average_rating?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          num_reviews?: number | null
          phone?: string | null
          verified?: boolean | null
          weighted_rating?: number | null
        }
        Update: {
          address?: string | null
          admin_id?: string | null
          appointment_count?: number | null
          average_rating?: number | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          num_reviews?: number | null
          phone?: string | null
          verified?: boolean | null
          weighted_rating?: number | null
        }
        Relationships: []
      }
      procedure_files: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          procedure_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          procedure_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          procedure_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedure_files_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_materials: {
        Row: {
          created_at: string
          id: string
          is_required: boolean | null
          material_name: string
          notes: string | null
          procedure_id: string | null
          quantity: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          material_name: string
          notes?: string | null
          procedure_id?: string | null
          quantity?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean | null
          material_name?: string
          notes?: string | null
          procedure_id?: string | null
          quantity?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_materials_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          category: Database["public"]["Enums"]["procedure_category"] | null
          created_at: string | null
          default_cost: number | null
          default_notes_template: string | null
          default_time_interval: number | null
          dentist_id: string | null
          description: string | null
          duration_minutes: number | null
          estimated_duration_minutes: number | null
          id: string
          informed_consent_template: string | null
          is_active: boolean | null
          name: string
          notes: string | null
          price: number | null
          tooth_range: number[] | null
          type: Database["public"]["Enums"]["procedure_type"] | null
          updated_at: string | null
          what_to_expect: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["procedure_category"] | null
          created_at?: string | null
          default_cost?: number | null
          default_notes_template?: string | null
          default_time_interval?: number | null
          dentist_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          informed_consent_template?: string | null
          is_active?: boolean | null
          name: string
          notes?: string | null
          price?: number | null
          tooth_range?: number[] | null
          type?: Database["public"]["Enums"]["procedure_type"] | null
          updated_at?: string | null
          what_to_expect?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["procedure_category"] | null
          created_at?: string | null
          default_cost?: number | null
          default_notes_template?: string | null
          default_time_interval?: number | null
          dentist_id?: string | null
          description?: string | null
          duration_minutes?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          informed_consent_template?: string | null
          is_active?: boolean | null
          name?: string
          notes?: string | null
          price?: number | null
          tooth_range?: number[] | null
          type?: Database["public"]["Enums"]["procedure_type"] | null
          updated_at?: string | null
          what_to_expect?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "procedures_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedures_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string
          full_name: string
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string
          is_verified: boolean | null
          language: string | null
          notification_settings: Json | null
          phone: string | null
          privacy_settings: Json | null
          role: Database["public"]["Enums"]["user_role"]
          timezone: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
          verification_token: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          full_name: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_verified?: boolean | null
          language?: string | null
          notification_settings?: Json | null
          phone?: string | null
          privacy_settings?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
          verification_token?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          full_name?: string
          gender?: Database["public"]["Enums"]["gender_type"] | null
          id?: string
          is_verified?: boolean | null
          language?: string | null
          notification_settings?: Json | null
          phone?: string | null
          privacy_settings?: Json | null
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
          verification_token?: string | null
        }
        Relationships: []
      }
      real_time_notifications: {
        Row: {
          created_at: string
          data: Json | null
          expires_at: string | null
          id: string
          message: string
          notification_type: string
          read_at: string | null
          recipient_user_id: string | null
          sender_user_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          message: string
          notification_type: string
          read_at?: string | null
          recipient_user_id?: string | null
          sender_user_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          expires_at?: string | null
          id?: string
          message?: string
          notification_type?: string
          read_at?: string | null
          recipient_user_id?: string | null
          sender_user_id?: string | null
          title?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          patient_id: string
          referred_doctor_id: string | null
          referring_doctor_id: string | null
          status: string | null
          treatment_plan_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_id: string
          referred_doctor_id?: string | null
          referring_doctor_id?: string | null
          status?: string | null
          treatment_plan_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          patient_id?: string
          referred_doctor_id?: string | null
          referring_doctor_id?: string | null
          status?: string | null
          treatment_plan_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_doctor_id_fkey"
            columns: ["referred_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_doctor_id_fkey"
            columns: ["referred_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referring_doctor_id_fkey"
            columns: ["referring_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referring_doctor_id_fkey"
            columns: ["referring_doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_settings: {
        Row: {
          buffer_time: number | null
          created_at: string | null
          doctor_id: string
          holidays: string[] | null
          id: string
          updated_at: string | null
          working_days: Json
        }
        Insert: {
          buffer_time?: number | null
          created_at?: string | null
          doctor_id: string
          holidays?: string[] | null
          id?: string
          updated_at?: string | null
          working_days?: Json
        }
        Update: {
          buffer_time?: number | null
          created_at?: string | null
          doctor_id?: string
          holidays?: string[] | null
          id?: string
          updated_at?: string | null
          working_days?: Json
        }
        Relationships: [
          {
            foreignKeyName: "schedule_settings_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: true
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_settings_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: true
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      settings_audit_log: {
        Row: {
          changed_at: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
          setting_type: string
          user_id: string
        }
        Insert: {
          changed_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          setting_type: string
          user_id: string
        }
        Update: {
          changed_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          setting_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sms_notifications: {
        Row: {
          created_at: string | null
          error_message: string | null
          id: string
          message: string
          patient_id: string | null
          phone: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          patient_id?: string | null
          phone: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          patient_id?: string | null
          phone?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sms_notifications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      treatment_plan_procedures: {
        Row: {
          appointment_id: string | null
          consent_form_id: string | null
          consent_required: boolean | null
          cost: number | null
          created_at: string | null
          id: string
          notes: string | null
          procedure_id: string | null
          sequence_order: number | null
          status: string | null
          tooth_numbers: number[] | null
          treatment_plan_id: string | null
        }
        Insert: {
          appointment_id?: string | null
          consent_form_id?: string | null
          consent_required?: boolean | null
          cost?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          procedure_id?: string | null
          sequence_order?: number | null
          status?: string | null
          tooth_numbers?: number[] | null
          treatment_plan_id?: string | null
        }
        Update: {
          appointment_id?: string | null
          consent_form_id?: string | null
          consent_required?: boolean | null
          cost?: number | null
          created_at?: string | null
          id?: string
          notes?: string | null
          procedure_id?: string | null
          sequence_order?: number | null
          status?: string | null
          tooth_numbers?: number[] | null
          treatment_plan_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plan_procedures_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_procedures_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_all_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_procedures_consent_form_id_fkey"
            columns: ["consent_form_id"]
            isOneToOne: false
            referencedRelation: "consent_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_procedures_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_procedures_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plan_templates: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          doctor_id: string | null
          id: string
          is_public: boolean | null
          name: string
          template_data: Json
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          doctor_id?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          template_data: Json
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          doctor_id?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          template_data?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plan_templates_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_templates_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      treatment_plans: {
        Row: {
          created_at: string | null
          doctor_id: string | null
          estimated_completion_date: string | null
          estimated_duration_weeks: number | null
          id: string
          notes: string | null
          patient_id: string | null
          priority: string | null
          published_at: string | null
          status: Database["public"]["Enums"]["treatment_plan_status"] | null
          title: string
          total_cost: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id?: string | null
          estimated_completion_date?: string | null
          estimated_duration_weeks?: number | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          priority?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["treatment_plan_status"] | null
          title: string
          total_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string | null
          estimated_completion_date?: string | null
          estimated_duration_weeks?: number | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          priority?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["treatment_plan_status"] | null
          title?: string
          total_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plans_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          doctor_id: string
          earned_at: string | null
          id: string
          is_claimed: boolean | null
          progress: number | null
        }
        Insert: {
          achievement_id: string
          doctor_id: string
          earned_at?: string | null
          id?: string
          is_claimed?: boolean | null
          progress?: number | null
        }
        Update: {
          achievement_id?: string
          doctor_id?: string
          earned_at?: string | null
          id?: string
          is_claimed?: boolean | null
          progress?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      doctor_profiles_view: {
        Row: {
          accepts_new_patients: boolean | null
          avatar_url: string | null
          bio: string | null
          consultation_fee: number | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          license_number: string | null
          phone: string | null
          practice_id: string | null
          specialty: string | null
          user_id: string | null
          verified: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_doctors_user_id"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      patient_all_appointments: {
        Row: {
          appointment_date: string | null
          created_at: string | null
          doctor_id: string | null
          end_time: string | null
          id: string | null
          notes: string | null
          patient_id: string | null
          practice_id: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["appointment_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_medication_to_treatment_plan: {
        Args: {
          dosage: string
          end_date?: string
          frequency: string
          instructions?: string
          medication_name: string
          reminder_enabled?: boolean
          start_date: string
          treatment_plan_id: string
        }
        Returns: Json
      }
      add_procedure_to_treatment_plan: {
        Args: {
          cost?: number
          notes?: string
          procedure_id: string
          sequence_order?: number
          tooth_numbers?: number[]
          treatment_plan_id: string
        }
        Returns: Json
      }
      book_appointment: {
        Args: {
          appointment_date: string
          doctor_id: string
          end_time: string
          notes?: string
          patient_id: string
          payment_intent_id?: string
          practice_id: string
          start_time: string
        }
        Returns: Json
      }
      calculate_avg_response_time: {
        Args: { p_doctor_id: string }
        Returns: number
      }
      cancel_or_update_appointment: {
        Args: {
          appointment_id: string
          new_date?: string
          new_end_time?: string
          new_notes?: string
          new_start_time?: string
          new_status?: Database["public"]["Enums"]["appointment_status"]
        }
        Returns: Json
      }
      check_and_award_achievements: {
        Args: { p_doctor_id: string }
        Returns: {
          achievement_id: string
          newly_earned: boolean
          title: string
        }[]
      }
      check_user_access: {
        Args: {
          access_type?: string
          resource_id: string
          resource_type: string
        }
        Returns: boolean
      }
      create_guest_patient_profile: {
        Args: { p_email: string; p_full_name: string; p_phone?: string }
        Returns: Json
      }
      create_or_get_patient_profile: {
        Args: { p_email: string; p_full_name: string; p_phone?: string }
        Returns: Json
      }
      fetch_available_slots: {
        Args: {
          date_from: string
          date_to: string
          doctor_id: string
          procedure_duration?: number
        }
        Returns: Json
      }
      get_doctor_monthly_trends: {
        Args: { p_doctor_id: string; p_months?: number }
        Returns: {
          appointments_count: number
          month_date: string
          month_name: string
          new_patients: number
          revenue: number
        }[]
      }
      get_practice_stats: {
        Args: { p_practice_id: string }
        Returns: Json
      }
      get_user_profile_by_uid: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      log_account_activity: {
        Args: {
          p_activity_type: string
          p_device_info?: string
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: Json
      }
      mark_notification_as_read: {
        Args: { notification_id: string }
        Returns: Json
      }
      refresh_all_ratings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      request_account_action: {
        Args: { p_notes?: string; p_request_type: string }
        Returns: Json
      }
      send_notification_to_user: {
        Args: {
          data?: Json
          expires_at?: string
          message: string
          notification_type: string
          recipient_user_id: string
          sender_user_id?: string
          title: string
        }
        Returns: Json
      }
      send_patient_invitation_sms: {
        Args: {
          p_appointment_date: string
          p_doctor_name: string
          p_patient_id: string
          p_phone: string
          p_verification_token: string
        }
        Returns: Json
      }
      sign_informed_consent: {
        Args: {
          consent_form_id: string
          digital_signature?: string
          ip_address?: unknown
          patient_full_name: string
          patient_signature?: string
        }
        Returns: Json
      }
      update_appointment_counts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_doctor_weighted_ratings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_practice_weighted_ratings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Returns: Json
      }
      validate_appointment_slot: {
        Args: {
          appointment_date: string
          doctor_id: string
          end_time: string
          exclude_appointment_id?: string
          start_time: string
        }
        Returns: Json
      }
    }
    Enums: {
      appointment_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "canceled"
        | "no_show"
      consent_status: "pending" | "signed" | "declined"
      gender_type: "male" | "female" | "other" | "prefer_not_to_say"
      procedure_category:
        | "general"
        | "preventive"
        | "restorative"
        | "cosmetic"
        | "orthodontic"
        | "oral_surgery"
        | "endodontic"
        | "periodontic"
      procedure_type:
        | "single_visit"
        | "multi_visit"
        | "tooth_based"
        | "full_mouth"
      record_type:
        | "note"
        | "diagnosis"
        | "condition"
        | "examination"
        | "treatment"
      treatment_plan_status:
        | "draft"
        | "published"
        | "in_progress"
        | "completed"
        | "confirmed"
        | "paused"
        | "cancelled"
        | "pending_confirmation"
      user_role: "patient" | "doctor" | "admin" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      appointment_status: [
        "pending",
        "confirmed",
        "completed",
        "canceled",
        "no_show",
      ],
      consent_status: ["pending", "signed", "declined"],
      gender_type: ["male", "female", "other", "prefer_not_to_say"],
      procedure_category: [
        "general",
        "preventive",
        "restorative",
        "cosmetic",
        "orthodontic",
        "oral_surgery",
        "endodontic",
        "periodontic",
      ],
      procedure_type: [
        "single_visit",
        "multi_visit",
        "tooth_based",
        "full_mouth",
      ],
      record_type: [
        "note",
        "diagnosis",
        "condition",
        "examination",
        "treatment",
      ],
      treatment_plan_status: [
        "draft",
        "published",
        "in_progress",
        "completed",
        "confirmed",
        "paused",
        "cancelled",
        "pending_confirmation",
      ],
      user_role: ["patient", "doctor", "admin", "staff"],
    },
  },
} as const
