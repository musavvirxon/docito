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
      about_content: {
        Row: {
          content: string
          created_at: string
          id: string
          is_published: boolean | null
          order_index: number | null
          section_key: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          order_index?: number | null
          section_key: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean | null
          order_index?: number | null
          section_key?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      account_activity: {
        Row: {
          activity_type: string
          created_at: string | null
          device_info: string | null
          id: string
          ip_address: unknown
          location: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          device_info?: string | null
          id?: string
          ip_address?: unknown
          location?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          device_info?: string | null
          id?: string
          ip_address?: unknown
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
          consent_ip_address: unknown
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
          consent_ip_address?: unknown
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
          consent_ip_address?: unknown
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
          ip_address: unknown
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
          ip_address?: unknown
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
          ip_address?: unknown
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
      cookie_preferences: {
        Row: {
          analytics: boolean | null
          created_at: string
          essential: boolean | null
          id: string
          marketing: boolean | null
          preferences: Json | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analytics?: boolean | null
          created_at?: string
          essential?: boolean | null
          id?: string
          marketing?: boolean | null
          preferences?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analytics?: boolean | null
          created_at?: string
          essential?: boolean | null
          id?: string
          marketing?: boolean | null
          preferences?: Json | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      doctor_verification: {
        Row: {
          created_at: string
          doctor_id: string
          id: string
          license_number: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          specialty: string
          status: string
          submitted_at: string
          updated_at: string
          verification_data: Json | null
          years_of_experience: string | null
        }
        Insert: {
          created_at?: string
          doctor_id: string
          id?: string
          license_number?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty: string
          status?: string
          submitted_at?: string
          updated_at?: string
          verification_data?: Json | null
          years_of_experience?: string | null
        }
        Update: {
          created_at?: string
          doctor_id?: string
          id?: string
          license_number?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          specialty?: string
          status?: string
          submitted_at?: string
          updated_at?: string
          verification_data?: Json | null
          years_of_experience?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_verification_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: true
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_verification_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: true
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_verification_documents: {
        Row: {
          created_at: string
          doctor_verification_id: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          uploaded_at: string
        }
        Insert: {
          created_at?: string
          doctor_verification_id: string
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          uploaded_at?: string
        }
        Update: {
          created_at?: string
          doctor_verification_id?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_verification_documents_doctor_verification_id_fkey"
            columns: ["doctor_verification_id"]
            isOneToOne: false
            referencedRelation: "doctor_verification"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_verification_payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          doctor_id: string
          id: string
          paid_at: string | null
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          doctor_id: string
          id?: string
          paid_at?: string | null
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          doctor_id?: string
          id?: string
          paid_at?: string | null
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "doctor_verification_payments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_verification_payments_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_verification_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
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
          bio_ar: string | null
          bio_en: string | null
          bio_ru: string | null
          bio_uz: string | null
          consultation_fee: number | null
          consultation_types: string[] | null
          created_at: string | null
          custom_profile_link: string | null
          id: string
          languages: string[] | null
          license_number: string | null
          num_reviews: number | null
          practice_id: string | null
          specialty: string
          specialty_ar: string | null
          specialty_en: string | null
          specialty_ru: string | null
          specialty_uz: string | null
          user_id: string | null
          verified: boolean | null
          weighted_rating: number | null
          years_experience: number | null
        }
        Insert: {
          accepts_new_patients?: boolean | null
          appointment_count?: number | null
          average_rating?: number | null
          bio?: string | null
          bio_ar?: string | null
          bio_en?: string | null
          bio_ru?: string | null
          bio_uz?: string | null
          consultation_fee?: number | null
          consultation_types?: string[] | null
          created_at?: string | null
          custom_profile_link?: string | null
          id?: string
          languages?: string[] | null
          license_number?: string | null
          num_reviews?: number | null
          practice_id?: string | null
          specialty: string
          specialty_ar?: string | null
          specialty_en?: string | null
          specialty_ru?: string | null
          specialty_uz?: string | null
          user_id?: string | null
          verified?: boolean | null
          weighted_rating?: number | null
          years_experience?: number | null
        }
        Update: {
          accepts_new_patients?: boolean | null
          appointment_count?: number | null
          average_rating?: number | null
          bio?: string | null
          bio_ar?: string | null
          bio_en?: string | null
          bio_ru?: string | null
          bio_uz?: string | null
          consultation_fee?: number | null
          consultation_types?: string[] | null
          created_at?: string | null
          custom_profile_link?: string | null
          id?: string
          languages?: string[] | null
          license_number?: string | null
          num_reviews?: number | null
          practice_id?: string | null
          specialty?: string
          specialty_ar?: string | null
          specialty_en?: string | null
          specialty_ru?: string | null
          specialty_uz?: string | null
          user_id?: string | null
          verified?: boolean | null
          weighted_rating?: number | null
          years_experience?: number | null
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
      help_articles: {
        Row: {
          category: Database["public"]["Enums"]["help_category"]
          color: string | null
          content_ar: string | null
          content_de: string | null
          content_en: string
          content_es: string | null
          content_ja: string | null
          content_ko: string | null
          content_pt: string | null
          content_ru: string | null
          content_tr: string | null
          content_uz: string | null
          content_zh: string | null
          created_at: string | null
          created_by: string | null
          description_ar: string | null
          description_de: string | null
          description_en: string
          description_es: string | null
          description_ja: string | null
          description_ko: string | null
          description_pt: string | null
          description_ru: string | null
          description_tr: string | null
          description_uz: string | null
          description_zh: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_popular: boolean | null
          is_published: boolean | null
          slug: string
          title_ar: string | null
          title_de: string | null
          title_en: string
          title_es: string | null
          title_ja: string | null
          title_ko: string | null
          title_pt: string | null
          title_ru: string | null
          title_tr: string | null
          title_uz: string | null
          title_zh: string | null
          updated_at: string | null
          views: number | null
        }
        Insert: {
          category: Database["public"]["Enums"]["help_category"]
          color?: string | null
          content_ar?: string | null
          content_de?: string | null
          content_en: string
          content_es?: string | null
          content_ja?: string | null
          content_ko?: string | null
          content_pt?: string | null
          content_ru?: string | null
          content_tr?: string | null
          content_uz?: string | null
          content_zh?: string | null
          created_at?: string | null
          created_by?: string | null
          description_ar?: string | null
          description_de?: string | null
          description_en: string
          description_es?: string | null
          description_ja?: string | null
          description_ko?: string | null
          description_pt?: string | null
          description_ru?: string | null
          description_tr?: string | null
          description_uz?: string | null
          description_zh?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_popular?: boolean | null
          is_published?: boolean | null
          slug: string
          title_ar?: string | null
          title_de?: string | null
          title_en: string
          title_es?: string | null
          title_ja?: string | null
          title_ko?: string | null
          title_pt?: string | null
          title_ru?: string | null
          title_tr?: string | null
          title_uz?: string | null
          title_zh?: string | null
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          category?: Database["public"]["Enums"]["help_category"]
          color?: string | null
          content_ar?: string | null
          content_de?: string | null
          content_en?: string
          content_es?: string | null
          content_ja?: string | null
          content_ko?: string | null
          content_pt?: string | null
          content_ru?: string | null
          content_tr?: string | null
          content_uz?: string | null
          content_zh?: string | null
          created_at?: string | null
          created_by?: string | null
          description_ar?: string | null
          description_de?: string | null
          description_en?: string
          description_es?: string | null
          description_ja?: string | null
          description_ko?: string | null
          description_pt?: string | null
          description_ru?: string | null
          description_tr?: string | null
          description_uz?: string | null
          description_zh?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_popular?: boolean | null
          is_published?: boolean | null
          slug?: string
          title_ar?: string | null
          title_de?: string | null
          title_en?: string
          title_es?: string | null
          title_ja?: string | null
          title_ko?: string | null
          title_pt?: string | null
          title_ru?: string | null
          title_tr?: string | null
          title_uz?: string | null
          title_zh?: string | null
          updated_at?: string | null
          views?: number | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          billing_details: Json | null
          created_at: string | null
          currency: string | null
          due_date: string | null
          id: string
          invoice_number: string
          line_items: Json | null
          paid_at: string | null
          pdf_url: string | null
          status: string
          stripe_invoice_id: string | null
          subscription_id: string | null
          tax_amount: number | null
          total_amount: number
          transaction_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          billing_details?: Json | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number: string
          line_items?: Json | null
          paid_at?: string | null
          pdf_url?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id?: string | null
          tax_amount?: number | null
          total_amount: number
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          billing_details?: Json | null
          created_at?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string
          line_items?: Json | null
          paid_at?: string | null
          pdf_url?: string | null
          status?: string
          stripe_invoice_id?: string | null
          subscription_id?: string | null
          tax_amount?: number | null
          total_amount?: number
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      legal_pages: {
        Row: {
          category: string | null
          content: string
          content_ar: string | null
          content_de: string | null
          content_en: string | null
          content_es: string | null
          content_ja: string | null
          content_ko: string | null
          content_pt: string | null
          content_ru: string | null
          content_tr: string | null
          content_uz: string | null
          content_zh: string | null
          created_at: string
          created_by: string | null
          description: string | null
          description_ar: string | null
          description_de: string | null
          description_en: string | null
          description_es: string | null
          description_ja: string | null
          description_ko: string | null
          description_pt: string | null
          description_ru: string | null
          description_tr: string | null
          description_uz: string | null
          description_zh: string | null
          id: string
          is_published: boolean | null
          slug: string
          title: string
          title_ar: string | null
          title_de: string | null
          title_en: string | null
          title_es: string | null
          title_ja: string | null
          title_ko: string | null
          title_pt: string | null
          title_ru: string | null
          title_tr: string | null
          title_uz: string | null
          title_zh: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          content: string
          content_ar?: string | null
          content_de?: string | null
          content_en?: string | null
          content_es?: string | null
          content_ja?: string | null
          content_ko?: string | null
          content_pt?: string | null
          content_ru?: string | null
          content_tr?: string | null
          content_uz?: string | null
          content_zh?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          description_de?: string | null
          description_en?: string | null
          description_es?: string | null
          description_ja?: string | null
          description_ko?: string | null
          description_pt?: string | null
          description_ru?: string | null
          description_tr?: string | null
          description_uz?: string | null
          description_zh?: string | null
          id?: string
          is_published?: boolean | null
          slug: string
          title: string
          title_ar?: string | null
          title_de?: string | null
          title_en?: string | null
          title_es?: string | null
          title_ja?: string | null
          title_ko?: string | null
          title_pt?: string | null
          title_ru?: string | null
          title_tr?: string | null
          title_uz?: string | null
          title_zh?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          content?: string
          content_ar?: string | null
          content_de?: string | null
          content_en?: string | null
          content_es?: string | null
          content_ja?: string | null
          content_ko?: string | null
          content_pt?: string | null
          content_ru?: string | null
          content_tr?: string | null
          content_uz?: string | null
          content_zh?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_ar?: string | null
          description_de?: string | null
          description_en?: string | null
          description_es?: string | null
          description_ja?: string | null
          description_ko?: string | null
          description_pt?: string | null
          description_ru?: string | null
          description_tr?: string | null
          description_uz?: string | null
          description_zh?: string | null
          id?: string
          is_published?: boolean | null
          slug?: string
          title?: string
          title_ar?: string | null
          title_de?: string | null
          title_en?: string | null
          title_es?: string | null
          title_ja?: string | null
          title_ko?: string | null
          title_pt?: string | null
          title_ru?: string | null
          title_tr?: string | null
          title_uz?: string | null
          title_zh?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
      page_translations: {
        Row: {
          created_at: string
          id: string
          page_key: string
          page_name: string
          seo: Json
          translations: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          page_key: string
          page_name: string
          seo?: Json
          translations?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          page_key?: string
          page_name?: string
          seo?: Json
          translations?: Json
          updated_at?: string
        }
        Relationships: []
      }
      payment_intents: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          metadata: Json | null
          payment_type: string
          status: string
          stripe_client_secret: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_type: string
          status: string
          stripe_client_secret?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          payment_type?: string
          status?: string
          stripe_client_secret?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          billing_details: Json | null
          card_brand: string | null
          card_exp_month: number | null
          card_exp_year: number | null
          card_last4: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          stripe_payment_method_id: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_details?: Json | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          stripe_payment_method_id: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_details?: Json | null
          card_brand?: string | null
          card_exp_month?: number | null
          card_exp_year?: number | null
          card_last4?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          stripe_payment_method_id?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string
          id: string
          notes: string | null
          paid_at: string | null
          patient_id: string
          payment_method: string | null
          practice_id: string
          status: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          patient_id: string
          payment_method?: string | null
          practice_id: string
          status?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          patient_id?: string
          payment_method?: string | null
          practice_id?: string
          status?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_all_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
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
      practice_locations: {
        Row: {
          address: string | null
          address_ar: string | null
          address_en: string | null
          address_ru: string | null
          address_uz: string | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          name_ar: string | null
          name_en: string | null
          name_ru: string | null
          name_uz: string | null
          operating_hours: Json | null
          phone: string | null
          photo_urls: string[] | null
          practice_id: string
          state: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          address_ar?: string | null
          address_en?: string | null
          address_ru?: string | null
          address_uz?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          name_ar?: string | null
          name_en?: string | null
          name_ru?: string | null
          name_uz?: string | null
          operating_hours?: Json | null
          phone?: string | null
          photo_urls?: string[] | null
          practice_id: string
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          address_ar?: string | null
          address_en?: string | null
          address_ru?: string | null
          address_uz?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          name_ar?: string | null
          name_en?: string | null
          name_ru?: string | null
          name_uz?: string | null
          operating_hours?: Json | null
          phone?: string | null
          photo_urls?: string[] | null
          practice_id?: string
          state?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_locations_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_restrictions: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          practice_id: string
          procedure_restriction: Json | null
          specialty_restriction: Json | null
          updated_at: string
          working_hours_restriction: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          practice_id: string
          procedure_restriction?: Json | null
          specialty_restriction?: Json | null
          updated_at?: string
          working_hours_restriction?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          practice_id?: string
          procedure_restriction?: Json | null
          specialty_restriction?: Json | null
          updated_at?: string
          working_hours_restriction?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_restrictions_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: true
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_settings: {
        Row: {
          buffer_time_minutes: number | null
          cancellation_notice_hours: number | null
          created_at: string
          currency: string | null
          default_duration_minutes: number | null
          email_booking_confirm: boolean | null
          email_reminders: boolean | null
          id: string
          max_appointments_per_day: number | null
          payments_enabled: boolean | null
          paypal_connected: boolean | null
          practice_id: string
          primary_color: string | null
          reminder_hours_before: number | null
          sms_booking_confirm: boolean | null
          sms_reminders: boolean | null
          stripe_connected: boolean | null
          tagline: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          buffer_time_minutes?: number | null
          cancellation_notice_hours?: number | null
          created_at?: string
          currency?: string | null
          default_duration_minutes?: number | null
          email_booking_confirm?: boolean | null
          email_reminders?: boolean | null
          id?: string
          max_appointments_per_day?: number | null
          payments_enabled?: boolean | null
          paypal_connected?: boolean | null
          practice_id: string
          primary_color?: string | null
          reminder_hours_before?: number | null
          sms_booking_confirm?: boolean | null
          sms_reminders?: boolean | null
          stripe_connected?: boolean | null
          tagline?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          buffer_time_minutes?: number | null
          cancellation_notice_hours?: number | null
          created_at?: string
          currency?: string | null
          default_duration_minutes?: number | null
          email_booking_confirm?: boolean | null
          email_reminders?: boolean | null
          id?: string
          max_appointments_per_day?: number | null
          payments_enabled?: boolean | null
          paypal_connected?: boolean | null
          practice_id?: string
          primary_color?: string | null
          reminder_hours_before?: number | null
          sms_booking_confirm?: boolean | null
          sms_reminders?: boolean | null
          stripe_connected?: boolean | null
          tagline?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_settings_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: true
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_staff: {
        Row: {
          created_at: string
          department: string | null
          email: string | null
          full_name: string
          hire_date: string | null
          id: string
          phone: string | null
          practice_id: string
          role: string
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name: string
          hire_date?: string | null
          id?: string
          phone?: string | null
          practice_id: string
          role: string
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          department?: string | null
          email?: string | null
          full_name?: string
          hire_date?: string | null
          id?: string
          phone?: string | null
          practice_id?: string
          role?: string
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_staff_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_verification_payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          paid_at: string | null
          practice_id: string
          status: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          paid_at?: string | null
          practice_id: string
          status?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          paid_at?: string | null
          practice_id?: string
          status?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_verification_payments_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_verification_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      practices: {
        Row: {
          address: string | null
          admin_id: string | null
          agrees_to_terms: boolean | null
          agrees_to_updates: boolean | null
          appointment_count: number | null
          average_rating: number | null
          business_owner: string | null
          business_registration_number: string | null
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          description_ar: string | null
          description_en: string | null
          description_ru: string | null
          description_uz: string | null
          email: string | null
          how_heard_about_us: string | null
          id: string
          legal_business_name: string | null
          logo_url: string | null
          name: string
          name_ar: string | null
          name_en: string | null
          name_ru: string | null
          name_uz: string | null
          num_reviews: number | null
          operating_hours: Json | null
          phone: string | null
          practice_size: string | null
          practice_type: string | null
          services_offered: string[] | null
          specialties: string[] | null
          state: string | null
          tax_id: string | null
          verification_status: string | null
          verified: boolean | null
          website: string | null
          weighted_rating: number | null
          year_established: number | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          admin_id?: string | null
          agrees_to_terms?: boolean | null
          agrees_to_updates?: boolean | null
          appointment_count?: number | null
          average_rating?: number | null
          business_owner?: string | null
          business_registration_number?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_ru?: string | null
          description_uz?: string | null
          email?: string | null
          how_heard_about_us?: string | null
          id?: string
          legal_business_name?: string | null
          logo_url?: string | null
          name: string
          name_ar?: string | null
          name_en?: string | null
          name_ru?: string | null
          name_uz?: string | null
          num_reviews?: number | null
          operating_hours?: Json | null
          phone?: string | null
          practice_size?: string | null
          practice_type?: string | null
          services_offered?: string[] | null
          specialties?: string[] | null
          state?: string | null
          tax_id?: string | null
          verification_status?: string | null
          verified?: boolean | null
          website?: string | null
          weighted_rating?: number | null
          year_established?: number | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          admin_id?: string | null
          agrees_to_terms?: boolean | null
          agrees_to_updates?: boolean | null
          appointment_count?: number | null
          average_rating?: number | null
          business_owner?: string | null
          business_registration_number?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          description_ar?: string | null
          description_en?: string | null
          description_ru?: string | null
          description_uz?: string | null
          email?: string | null
          how_heard_about_us?: string | null
          id?: string
          legal_business_name?: string | null
          logo_url?: string | null
          name?: string
          name_ar?: string | null
          name_en?: string | null
          name_ru?: string | null
          name_uz?: string | null
          num_reviews?: number | null
          operating_hours?: Json | null
          phone?: string | null
          practice_size?: string | null
          practice_type?: string | null
          services_offered?: string[] | null
          specialties?: string[] | null
          state?: string | null
          tax_id?: string | null
          verification_status?: string | null
          verified?: boolean | null
          website?: string | null
          weighted_rating?: number | null
          year_established?: number | null
          zip_code?: string | null
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
      procedure_templates: {
        Row: {
          category: string | null
          created_at: string | null
          default_price: number | null
          description: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          default_price?: number | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          default_price?: number | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
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
          is_bookable: boolean | null
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
          is_bookable?: boolean | null
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
          is_bookable?: boolean | null
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
          profile_visibility: string | null
          role: Database["public"]["Enums"]["user_role"]
          timezone: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
          username: string | null
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
          profile_visibility?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
          username?: string | null
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
          profile_visibility?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          timezone?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
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
      staff_roles: {
        Row: {
          created_at: string
          id: string
          permissions: Json
          practice_id: string
          role_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          permissions?: Json
          practice_id: string
          role_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          permissions?: Json
          practice_id?: string
          role_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_roles_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          billing_interval: string
          created_at: string | null
          currency: string | null
          description: string | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          plan_code: string
          price: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          target_audience: string
          trial_days: number | null
          updated_at: string | null
        }
        Insert: {
          billing_interval: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          plan_code: string
          price: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          target_audience: string
          trial_days?: number | null
          updated_at?: string | null
        }
        Update: {
          billing_interval?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          plan_code?: string
          price?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          target_audience?: string
          trial_days?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          metadata: Json | null
          payment_intent_id: string | null
          refund_reason: string | null
          status: string
          stripe_charge_id: string | null
          stripe_refund_id: string | null
          subscription_id: string | null
          transaction_type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_intent_id?: string | null
          refund_reason?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_refund_id?: string | null
          subscription_id?: string | null
          transaction_type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          payment_intent_id?: string | null
          refund_reason?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_refund_id?: string | null
          subscription_id?: string | null
          transaction_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_all_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payment_intent_id_fkey"
            columns: ["payment_intent_id"]
            isOneToOne: false
            referencedRelation: "payment_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      translation_glossary: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          enforce: boolean | null
          id: string
          term: string
          translations: Json
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          enforce?: boolean | null
          id?: string
          term: string
          translations?: Json
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          enforce?: boolean | null
          id?: string
          term?: string
          translations?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      translation_history: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          created_at: string | null
          environment: string | null
          id: string
          language: string
          new_text: string | null
          previous_text: string | null
          translation_key_id: string | null
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          environment?: string | null
          id?: string
          language: string
          new_text?: string | null
          previous_text?: string | null
          translation_key_id?: string | null
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          created_at?: string | null
          environment?: string | null
          id?: string
          language?: string
          new_text?: string | null
          previous_text?: string | null
          translation_key_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "translation_history_translation_key_id_fkey"
            columns: ["translation_key_id"]
            isOneToOne: false
            referencedRelation: "translation_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      translation_keys: {
        Row: {
          context: string | null
          created_at: string | null
          id: string
          key: string
          last_updated: string | null
          module: string
          source_text: string
          status: Json | null
          translations: Json | null
          updated_by: string | null
          version: number | null
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          id?: string
          key: string
          last_updated?: string | null
          module: string
          source_text: string
          status?: Json | null
          translations?: Json | null
          updated_by?: string | null
          version?: number | null
        }
        Update: {
          context?: string | null
          created_at?: string | null
          id?: string
          key?: string
          last_updated?: string | null
          module?: string
          source_text?: string
          status?: Json | null
          translations?: Json | null
          updated_by?: string | null
          version?: number | null
        }
        Relationships: []
      }
      translation_memory: {
        Row: {
          confidence_score: number | null
          created_at: string | null
          id: string
          last_used: string | null
          module: string | null
          source_language: string
          source_text: string
          target_language: string
          target_text: string
          usage_count: number | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          last_used?: string | null
          module?: string | null
          source_language?: string
          source_text: string
          target_language: string
          target_text: string
          usage_count?: number | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          last_used?: string | null
          module?: string | null
          source_language?: string
          source_text?: string
          target_language?: string
          target_text?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      treatment_plan_medications: {
        Row: {
          created_at: string | null
          dosage: string
          end_date: string
          frequency: string
          id: string
          instructions: string | null
          medication_name: string
          notification_times: string[] | null
          start_date: string
          treatment_plan_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dosage: string
          end_date: string
          frequency: string
          id?: string
          instructions?: string | null
          medication_name: string
          notification_times?: string[] | null
          start_date: string
          treatment_plan_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dosage?: string
          end_date?: string
          frequency?: string
          id?: string
          instructions?: string | null
          medication_name?: string
          notification_times?: string[] | null
          start_date?: string
          treatment_plan_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plan_medications_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
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
      user_policy_acceptances: {
        Row: {
          accepted_at: string
          id: string
          ip_address: unknown
          policy_slug: string
          policy_version: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          accepted_at?: string
          id?: string
          ip_address?: unknown
          policy_slug: string
          policy_version?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          accepted_at?: string
          id?: string
          ip_address?: unknown
          policy_slug?: string
          policy_version?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string | null
          id: string
          preferred_language: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          preferred_language?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          preferred_language?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end: string
          current_period_start: string
          id?: string
          plan_id: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      verification_documents: {
        Row: {
          created_at: string
          document_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          practice_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          practice_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          practice_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verification_documents_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_logs: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_id: string
          event_type: string
          id: string
          payload: Json
          processed: boolean | null
          processed_at: string | null
          retry_count: number | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_id: string
          event_type: string
          id?: string
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          retry_count?: number | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          retry_count?: number | null
        }
        Relationships: []
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
      public_practice_locations: {
        Row: {
          city: string | null
          country: string | null
          id: string | null
          is_primary: boolean | null
          name: string | null
          practice_id: string | null
          state: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          id?: string | null
          is_primary?: boolean | null
          name?: string | null
          practice_id?: string | null
          state?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          id?: string | null
          is_primary?: boolean | null
          name?: string | null
          practice_id?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_locations_practice_id_fkey"
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
      generate_invoice_number: { Args: never; Returns: string }
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
      get_practice_stats: { Args: { p_practice_id: string }; Returns: Json }
      get_user_profile_by_uid: { Args: never; Returns: Json }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      grant_super_admin_to_authorized_emails: {
        Args: never
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
      refresh_all_ratings: { Args: never; Returns: undefined }
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
      update_appointment_counts: { Args: never; Returns: undefined }
      update_doctor_weighted_ratings: { Args: never; Returns: undefined }
      update_practice_weighted_ratings: { Args: never; Returns: undefined }
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
      app_role: "patient" | "doctor" | "admin" | "staff" | "super_admin"
      appointment_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "canceled"
        | "no_show"
      consent_status: "pending" | "signed" | "declined"
      gender_type: "male" | "female" | "other" | "prefer_not_to_say"
      help_category:
        | "getting_started"
        | "appointments"
        | "telemedicine"
        | "medical_records"
        | "billing_payments"
        | "account_management"
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
      app_role: ["patient", "doctor", "admin", "staff", "super_admin"],
      appointment_status: [
        "pending",
        "confirmed",
        "completed",
        "canceled",
        "no_show",
      ],
      consent_status: ["pending", "signed", "declined"],
      gender_type: ["male", "female", "other", "prefer_not_to_say"],
      help_category: [
        "getting_started",
        "appointments",
        "telemedicine",
        "medical_records",
        "billing_payments",
        "account_management",
      ],
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
