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
      appointment_clinical_item_templates: {
        Row: {
          created_at: string | null
          default_cost: number | null
          description: string | null
          doctor_id: string
          id: string
          is_active: boolean | null
          name: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_cost?: number | null
          description?: string | null
          doctor_id: string
          id?: string
          is_active?: boolean | null
          name: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_cost?: number | null
          description?: string | null
          doctor_id?: string
          id?: string
          is_active?: boolean | null
          name?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_clinical_item_templates_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_clinical_item_templates_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_clinical_item_templates_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_clinical_items: {
        Row: {
          appointment_id: string
          cost: number | null
          created_at: string | null
          description: string | null
          details: Json | null
          doctor_id: string
          doctor_patient_id: string | null
          dosage: string | null
          duration: string | null
          frequency: string | null
          id: string
          item_type: string
          name: string | null
          patient_id: string | null
          quantity: number | null
          template_id: string | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          appointment_id: string
          cost?: number | null
          created_at?: string | null
          description?: string | null
          details?: Json | null
          doctor_id: string
          doctor_patient_id?: string | null
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          item_type: string
          name?: string | null
          patient_id?: string | null
          quantity?: number | null
          template_id?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          appointment_id?: string
          cost?: number | null
          created_at?: string | null
          description?: string | null
          details?: Json | null
          doctor_id?: string
          doctor_patient_id?: string | null
          dosage?: string | null
          duration?: string | null
          frequency?: string | null
          id?: string
          item_type?: string
          name?: string | null
          patient_id?: string | null
          quantity?: number | null
          template_id?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_clinical_items_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_clinical_items_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_all_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_clinical_items_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_clinical_items_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_clinical_items_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_clinical_items_doctor_patient_id_fkey"
            columns: ["doctor_patient_id"]
            isOneToOne: false
            referencedRelation: "doctor_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_clinical_items_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "appointment_clinical_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "appointment_clinical_item_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_diagnoses: {
        Row: {
          appointment_id: string
          created_at: string
          created_by: string
          diagnosis_template_id: string | null
          diagnosis_title: string
          doctor_id: string
          doctor_patient_id: string | null
          icd10_code: string | null
          id: string
          notes: string | null
          patient_id: string | null
          updated_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          created_by: string
          diagnosis_template_id?: string | null
          diagnosis_title: string
          doctor_id: string
          doctor_patient_id?: string | null
          icd10_code?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          created_by?: string
          diagnosis_template_id?: string | null
          diagnosis_title?: string
          doctor_id?: string
          doctor_patient_id?: string | null
          icd10_code?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_diagnoses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_diagnoses_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_all_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_diagnoses_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_diagnoses_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_diagnoses_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_diagnoses_doctor_patient_id_fkey"
            columns: ["doctor_patient_id"]
            isOneToOne: false
            referencedRelation: "doctor_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_diagnoses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      appointment_holds: {
        Row: {
          appointment_type: string
          created_at: string
          doctor_id: string
          doctor_patient_id: string | null
          end_at: string
          expires_at: string
          id: string
          notes: string | null
          patient_id: string | null
          practice_id: string | null
          procedure_id: string | null
          start_at: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_type?: string
          created_at?: string
          doctor_id: string
          doctor_patient_id?: string | null
          end_at: string
          expires_at?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          practice_id?: string | null
          procedure_id?: string | null
          start_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_type?: string
          created_at?: string
          doctor_id?: string
          doctor_patient_id?: string | null
          end_at?: string
          expires_at?: string
          id?: string
          notes?: string | null
          patient_id?: string | null
          practice_id?: string | null
          procedure_id?: string | null
          start_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_holds_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_holds_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_holds_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_holds_doctor_patient_id_fkey"
            columns: ["doctor_patient_id"]
            isOneToOne: false
            referencedRelation: "doctor_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_holds_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_holds_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
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
      appointment_sessions: {
        Row: {
          appointment_id: string
          created_at: string
          doctor_id: string
          doctor_patient_id: string | null
          ended_at: string | null
          id: string
          notes: Json | null
          patient_id: string | null
          session_status: string
          session_type: Database["public"]["Enums"]["appointment_type"]
          specialty_data: Json | null
          started_at: string | null
          updated_at: string
          video_room_id: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          doctor_id: string
          doctor_patient_id?: string | null
          ended_at?: string | null
          id?: string
          notes?: Json | null
          patient_id?: string | null
          session_status?: string
          session_type: Database["public"]["Enums"]["appointment_type"]
          specialty_data?: Json | null
          started_at?: string | null
          updated_at?: string
          video_room_id?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          doctor_id?: string
          doctor_patient_id?: string | null
          ended_at?: string | null
          id?: string
          notes?: Json | null
          patient_id?: string | null
          session_status?: string
          session_type?: Database["public"]["Enums"]["appointment_type"]
          specialty_data?: Json | null
          started_at?: string | null
          updated_at?: string
          video_room_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "patient_all_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          appointment_type: Database["public"]["Enums"]["appointment_type"]
          completed_at: string | null
          created_at: string | null
          doctor_id: string | null
          doctor_patient_id: string | null
          end_time: string
          id: string
          notes: string | null
          patient_confirmation_status: string | null
          patient_confirmed_at: string | null
          patient_id: string | null
          practice_id: string | null
          procedure_id: string | null
          session_type: string | null
          start_requested_by_doctor: boolean | null
          start_requested_by_patient: boolean | null
          start_time: string
          started_at: string | null
          status: Database["public"]["Enums"]["appointment_status"] | null
          video_room_id: string | null
        }
        Insert: {
          appointment_date: string
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          completed_at?: string | null
          created_at?: string | null
          doctor_id?: string | null
          doctor_patient_id?: string | null
          end_time: string
          id?: string
          notes?: string | null
          patient_confirmation_status?: string | null
          patient_confirmed_at?: string | null
          patient_id?: string | null
          practice_id?: string | null
          procedure_id?: string | null
          session_type?: string | null
          start_requested_by_doctor?: boolean | null
          start_requested_by_patient?: boolean | null
          start_time: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          video_room_id?: string | null
        }
        Update: {
          appointment_date?: string
          appointment_type?: Database["public"]["Enums"]["appointment_type"]
          completed_at?: string | null
          created_at?: string | null
          doctor_id?: string | null
          doctor_patient_id?: string | null
          end_time?: string
          id?: string
          notes?: string | null
          patient_confirmation_status?: string | null
          patient_confirmed_at?: string | null
          patient_id?: string | null
          practice_id?: string | null
          procedure_id?: string | null
          session_type?: string | null
          start_requested_by_doctor?: boolean | null
          start_requested_by_patient?: boolean | null
          start_time?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          video_room_id?: string | null
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
            referencedRelation: "doctor_public_profile_view"
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
            foreignKeyName: "appointments_doctor_patient_id_fkey"
            columns: ["doctor_patient_id"]
            isOneToOne: false
            referencedRelation: "doctor_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "appointments_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: unknown
          resource_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: unknown
          resource_id?: string | null
        }
        Relationships: []
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
            referencedRelation: "doctor_public_profile_view"
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
      billing_invoices: {
        Row: {
          amount_due_cents: number
          amount_paid_cents: number
          amount_remaining_cents: number
          created_at: string
          currency: string
          description: string | null
          due_at: string | null
          entity_id: string
          entity_type: string
          hosted_invoice_url: string | null
          id: string
          invoice_pdf_url: string | null
          metadata: Json | null
          paid_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_due_cents?: number
          amount_paid_cents?: number
          amount_remaining_cents?: number
          created_at?: string
          currency?: string
          description?: string | null
          due_at?: string | null
          entity_id: string
          entity_type: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf_url?: string | null
          metadata?: Json | null
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_due_cents?: number
          amount_paid_cents?: number
          amount_remaining_cents?: number
          created_at?: string
          currency?: string
          description?: string | null
          due_at?: string | null
          entity_id?: string
          entity_type?: string
          hosted_invoice_url?: string | null
          id?: string
          invoice_pdf_url?: string | null
          metadata?: Json | null
          paid_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      billing_plans: {
        Row: {
          amount_cents: number
          code: string
          created_at: string
          currency: string
          description: string | null
          features: Json | null
          id: string
          interval: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          code: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          interval?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          code?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json | null
          id?: string
          interval?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      billing_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          entity_id: string
          entity_type: string
          id: string
          plan_id: string | null
          provider: string | null
          provider_subscription_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          entity_id: string
          entity_type: string
          id?: string
          plan_id?: string | null
          provider?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          plan_id?: string | null
          provider?: string | null
          provider_subscription_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_transactions: {
        Row: {
          amount: number
          amount_cents: number | null
          appointment_id: string | null
          created_at: string
          currency: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          invoice_id: string | null
          location_id: string | null
          metadata: Json | null
          payment_hold_id: string | null
          practice_id: string | null
          provider: string | null
          provider_data: Json | null
          provider_ref: string | null
          provider_transaction_id: string | null
          status: string
          subscription_id: string | null
          transaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          amount_cents?: number | null
          appointment_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          invoice_id?: string | null
          location_id?: string | null
          metadata?: Json | null
          payment_hold_id?: string | null
          practice_id?: string | null
          provider?: string | null
          provider_data?: Json | null
          provider_ref?: string | null
          provider_transaction_id?: string | null
          status?: string
          subscription_id?: string | null
          transaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          amount_cents?: number | null
          appointment_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          invoice_id?: string | null
          location_id?: string | null
          metadata?: Json | null
          payment_hold_id?: string | null
          practice_id?: string | null
          provider?: string | null
          provider_data?: Json | null
          provider_ref?: string | null
          provider_transaction_id?: string | null
          status?: string
          subscription_id?: string | null
          transaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_transactions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_all_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "public_practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_transactions_payment_hold_id_fkey"
            columns: ["payment_hold_id"]
            isOneToOne: false
            referencedRelation: "payment_holds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_transactions_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
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
            referencedRelation: "doctor_public_profile_view"
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
      blog_posts: {
        Row: {
          author_name: string | null
          body: Json
          cover_image: string
          created_at: string
          created_by: string | null
          excerpt: string
          featured: boolean
          group_id: string
          id: string
          keywords: string[]
          lang: string
          meta_description: string
          meta_title: string
          og_image: string
          publishable_language: boolean
          published_at: string | null
          slug: string
          status: string
          tags: string[]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          author_name?: string | null
          body?: Json
          cover_image?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string
          featured?: boolean
          group_id: string
          id?: string
          keywords?: string[]
          lang: string
          meta_description?: string
          meta_title?: string
          og_image?: string
          publishable_language?: boolean
          published_at?: string | null
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          author_name?: string | null
          body?: Json
          cover_image?: string
          created_at?: string
          created_by?: string | null
          excerpt?: string
          featured?: boolean
          group_id?: string
          id?: string
          keywords?: string[]
          lang?: string
          meta_description?: string
          meta_title?: string
          og_image?: string
          publishable_language?: boolean
          published_at?: string | null
          slug?: string
          status?: string
          tags?: string[]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      bones: {
        Row: {
          bone_category: string
          clinical_notes: string | null
          created_at: string
          description: string | null
          english_name: string
          id: string
          latin_name: string
          parent_bone_id: string | null
          position_x: number | null
          position_y: number | null
          position_z: number | null
          updated_at: string
        }
        Insert: {
          bone_category: string
          clinical_notes?: string | null
          created_at?: string
          description?: string | null
          english_name: string
          id?: string
          latin_name: string
          parent_bone_id?: string | null
          position_x?: number | null
          position_y?: number | null
          position_z?: number | null
          updated_at?: string
        }
        Update: {
          bone_category?: string
          clinical_notes?: string | null
          created_at?: string
          description?: string | null
          english_name?: string
          id?: string
          latin_name?: string
          parent_bone_id?: string | null
          position_x?: number | null
          position_y?: number | null
          position_z?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bones_parent_bone_id_fkey"
            columns: ["parent_bone_id"]
            isOneToOne: false
            referencedRelation: "bones"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_department_staff: {
        Row: {
          can_manage_equipment: boolean | null
          can_upload_results: boolean | null
          can_view_orders: boolean | null
          clinic_id: string
          created_at: string
          department_id: string
          hired_at: string | null
          id: string
          license_number: string | null
          role: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_manage_equipment?: boolean | null
          can_upload_results?: boolean | null
          can_view_orders?: boolean | null
          clinic_id: string
          created_at?: string
          department_id: string
          hired_at?: string | null
          id?: string
          license_number?: string | null
          role: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_manage_equipment?: boolean | null
          can_upload_results?: boolean | null
          can_view_orders?: boolean | null
          clinic_id?: string
          created_at?: string
          department_id?: string
          hired_at?: string | null
          id?: string
          license_number?: string | null
          role?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_department_staff_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_department_staff_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "clinic_departments"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_departments: {
        Row: {
          clinic_id: string
          created_at: string
          description: string | null
          display_name: string
          equipment_list: string[] | null
          id: string
          name: string
          status: string | null
          test_templates: Json | null
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          description?: string | null
          display_name: string
          equipment_list?: string[] | null
          id?: string
          name: string
          status?: string | null
          test_templates?: Json | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          description?: string | null
          display_name?: string
          equipment_list?: string[] | null
          id?: string
          name?: string
          status?: string | null
          test_templates?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_departments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_imaging_orders: {
        Row: {
          appointment_id: string | null
          body_part: string | null
          clinic_id: string
          clinical_notes: string | null
          completed_at: string | null
          created_at: string
          department_id: string | null
          diagnosis_codes: string[] | null
          doctor_id: string
          exam_name: string
          external_patient_ref: string | null
          findings: string | null
          id: string
          impression: string | null
          modality: string
          order_number: string
          patient_email: string | null
          patient_id: string | null
          patient_name: string | null
          patient_phone: string | null
          patient_snapshot_address: string | null
          patient_snapshot_dob: string | null
          patient_snapshot_email: string | null
          patient_snapshot_full_name: string | null
          patient_snapshot_gender: string | null
          patient_snapshot_id_number: string | null
          patient_snapshot_phone: string | null
          performed_at: string | null
          performed_by: string | null
          priority: string | null
          radiologist_id: string | null
          result_images: string[] | null
          result_report: string | null
          result_url: string | null
          scheduled_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          body_part?: string | null
          clinic_id: string
          clinical_notes?: string | null
          completed_at?: string | null
          created_at?: string
          department_id?: string | null
          diagnosis_codes?: string[] | null
          doctor_id: string
          exam_name: string
          external_patient_ref?: string | null
          findings?: string | null
          id?: string
          impression?: string | null
          modality: string
          order_number?: string
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          patient_snapshot_address?: string | null
          patient_snapshot_dob?: string | null
          patient_snapshot_email?: string | null
          patient_snapshot_full_name?: string | null
          patient_snapshot_gender?: string | null
          patient_snapshot_id_number?: string | null
          patient_snapshot_phone?: string | null
          performed_at?: string | null
          performed_by?: string | null
          priority?: string | null
          radiologist_id?: string | null
          result_images?: string[] | null
          result_report?: string | null
          result_url?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          body_part?: string | null
          clinic_id?: string
          clinical_notes?: string | null
          completed_at?: string | null
          created_at?: string
          department_id?: string | null
          diagnosis_codes?: string[] | null
          doctor_id?: string
          exam_name?: string
          external_patient_ref?: string | null
          findings?: string | null
          id?: string
          impression?: string | null
          modality?: string
          order_number?: string
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          patient_snapshot_address?: string | null
          patient_snapshot_dob?: string | null
          patient_snapshot_email?: string | null
          patient_snapshot_full_name?: string | null
          patient_snapshot_gender?: string | null
          patient_snapshot_id_number?: string | null
          patient_snapshot_phone?: string | null
          performed_at?: string | null
          performed_by?: string | null
          priority?: string | null
          radiologist_id?: string | null
          result_images?: string[] | null
          result_report?: string | null
          result_url?: string | null
          scheduled_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_imaging_orders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_imaging_orders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_all_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_imaging_orders_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_imaging_orders_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "clinic_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_imaging_orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_imaging_orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_imaging_orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_insurance: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          is_accepted: boolean | null
          plan_id: string | null
          provider_id: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          is_accepted?: boolean | null
          plan_id?: string | null
          provider_id: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          is_accepted?: boolean | null
          plan_id?: string | null
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_insurance_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_insurance_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_insurance_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "insurance_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_lab_orders: {
        Row: {
          appointment_id: string | null
          clinic_id: string
          clinical_notes: string | null
          completed_at: string | null
          created_at: string
          department_id: string | null
          diagnosis_codes: string[] | null
          doctor_id: string
          id: string
          is_abnormal: boolean | null
          order_number: string
          patient_id: string
          priority: string | null
          processed_by: string | null
          reference_range: string | null
          result_data: Json | null
          result_text: string | null
          result_url: string | null
          sample_collected_at: string | null
          sample_collected_by: string | null
          status: string | null
          test_code: string | null
          test_name: string
          test_type: string
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          clinic_id: string
          clinical_notes?: string | null
          completed_at?: string | null
          created_at?: string
          department_id?: string | null
          diagnosis_codes?: string[] | null
          doctor_id: string
          id?: string
          is_abnormal?: boolean | null
          order_number?: string
          patient_id: string
          priority?: string | null
          processed_by?: string | null
          reference_range?: string | null
          result_data?: Json | null
          result_text?: string | null
          result_url?: string | null
          sample_collected_at?: string | null
          sample_collected_by?: string | null
          status?: string | null
          test_code?: string | null
          test_name: string
          test_type: string
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          clinic_id?: string
          clinical_notes?: string | null
          completed_at?: string | null
          created_at?: string
          department_id?: string | null
          diagnosis_codes?: string[] | null
          doctor_id?: string
          id?: string
          is_abnormal?: boolean | null
          order_number?: string
          patient_id?: string
          priority?: string | null
          processed_by?: string | null
          reference_range?: string | null
          result_data?: Json | null
          result_text?: string | null
          result_url?: string | null
          sample_collected_at?: string | null
          sample_collected_by?: string | null
          status?: string | null
          test_code?: string | null
          test_name?: string
          test_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_lab_orders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_lab_orders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_all_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_lab_orders_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_lab_orders_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "clinic_departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_lab_orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_lab_orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_lab_orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_staff: {
        Row: {
          can_book_appointments: boolean | null
          can_manage_billing: boolean | null
          can_manage_patients: boolean | null
          can_view_medical_records: boolean | null
          can_view_schedule: boolean | null
          created_at: string | null
          department: string | null
          hire_date: string | null
          id: string
          invited_by: string | null
          practice_id: string
          staff_role: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_book_appointments?: boolean | null
          can_manage_billing?: boolean | null
          can_manage_patients?: boolean | null
          can_view_medical_records?: boolean | null
          can_view_schedule?: boolean | null
          created_at?: string | null
          department?: string | null
          hire_date?: string | null
          id?: string
          invited_by?: string | null
          practice_id: string
          staff_role: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_book_appointments?: boolean | null
          can_manage_billing?: boolean | null
          can_manage_patients?: boolean | null
          can_view_medical_records?: boolean | null
          can_view_schedule?: boolean | null
          created_at?: string | null
          department?: string | null
          hire_date?: string | null
          id?: string
          invited_by?: string | null
          practice_id?: string
          staff_role?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_staff_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      compensation_payouts: {
        Row: {
          adjustments_cents: number
          approved_at: string | null
          approved_by: string | null
          calculated_amount_cents: number
          compensation_profile_id: string
          created_at: string
          currency: string
          entity_id: string
          entity_type: string
          final_amount_cents: number
          id: string
          notes: string | null
          paid_at: string | null
          payment_reference: string | null
          period_end: string
          period_start: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          adjustments_cents?: number
          approved_at?: string | null
          approved_by?: string | null
          calculated_amount_cents?: number
          compensation_profile_id: string
          created_at?: string
          currency?: string
          entity_id: string
          entity_type: string
          final_amount_cents?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          period_end: string
          period_start: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          adjustments_cents?: number
          approved_at?: string | null
          approved_by?: string | null
          calculated_amount_cents?: number
          compensation_profile_id?: string
          created_at?: string
          currency?: string
          entity_id?: string
          entity_type?: string
          final_amount_cents?: number
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          period_end?: string
          period_start?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compensation_payouts_compensation_profile_id_fkey"
            columns: ["compensation_profile_id"]
            isOneToOne: false
            referencedRelation: "staff_compensation_profiles"
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
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string
          last_read_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          context_id: string | null
          context_type: string | null
          created_at: string
          created_by: string | null
          id: string
          is_locked: boolean
          last_message_at: string | null
          locked_at: string | null
          locked_reason: string | null
          metadata: Json | null
          name: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_locked?: boolean
          last_message_at?: string | null
          locked_at?: string | null
          locked_reason?: string | null
          metadata?: Json | null
          name?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_locked?: boolean
          last_message_at?: string | null
          locked_at?: string | null
          locked_reason?: string | null
          metadata?: Json | null
          name?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
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
      dental_procedures: {
        Row: {
          category: string
          code: string | null
          created_at: string
          default_cost: number | null
          description: string | null
          id: string
          is_active: boolean | null
          is_pediatric: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          category: string
          code?: string | null
          created_at?: string
          default_cost?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_pediatric?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string | null
          created_at?: string
          default_cost?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_pediatric?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      doctor_insurance: {
        Row: {
          clinic_id: string | null
          created_at: string
          doctor_id: string
          id: string
          is_accepted: boolean | null
          is_inherited: boolean | null
          plan_id: string | null
          provider_id: string
          updated_at: string
        }
        Insert: {
          clinic_id?: string | null
          created_at?: string
          doctor_id: string
          id?: string
          is_accepted?: boolean | null
          is_inherited?: boolean | null
          plan_id?: string | null
          provider_id: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string | null
          created_at?: string
          doctor_id?: string
          id?: string
          is_accepted?: boolean | null
          is_inherited?: boolean | null
          plan_id?: string | null
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_insurance_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_insurance_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_insurance_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_insurance_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_insurance_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_insurance_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "insurance_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      doctor_patients: {
        Row: {
          address: string | null
          allergies: string | null
          created_at: string
          current_medications: string | null
          date_of_birth: string
          dental_history: string | null
          doctor_id: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          full_name: string
          gender: string | null
          id: string
          medical_history: string | null
          notes: string | null
          phone: string
          profile_photo_url: string | null
          registration_date: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          created_at?: string
          current_medications?: string | null
          date_of_birth: string
          dental_history?: string | null
          doctor_id: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name: string
          gender?: string | null
          id?: string
          medical_history?: string | null
          notes?: string | null
          phone: string
          profile_photo_url?: string | null
          registration_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string | null
          created_at?: string
          current_medications?: string | null
          date_of_birth?: string
          dental_history?: string | null
          doctor_id?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          medical_history?: string | null
          notes?: string | null
          phone?: string
          profile_photo_url?: string | null
          registration_date?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctor_patients_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_patients_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctor_patients_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "doctor_public_profile_view"
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
            referencedRelation: "doctor_public_profile_view"
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
          logo_url: string | null
          num_reviews: number | null
          practice_id: string | null
          practice_location_id: string | null
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
          logo_url?: string | null
          num_reviews?: number | null
          practice_id?: string | null
          practice_location_id?: string | null
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
          logo_url?: string | null
          num_reviews?: number | null
          practice_id?: string | null
          practice_location_id?: string | null
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
            foreignKeyName: "doctors_practice_location_id_fkey"
            columns: ["practice_location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "doctors_practice_location_id_fkey"
            columns: ["practice_location_id"]
            isOneToOne: false
            referencedRelation: "public_practice_locations"
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
      entity_audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
        }
        Relationships: []
      }
      facility_patients: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          facility_id: string
          facility_type: string
          full_name: string
          gender: string | null
          id: string
          id_number: string | null
          notes: string | null
          phone: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          facility_id: string
          facility_type: string
          full_name: string
          gender?: string | null
          id?: string
          id_number?: string | null
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          facility_id?: string
          facility_type?: string
          full_name?: string
          gender?: string | null
          id?: string
          id_number?: string | null
          notes?: string | null
          phone?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      facility_verification_requests: {
        Row: {
          comment: string | null
          created_at: string
          facility_id: string
          facility_type: string
          id: string
          payload: Json | null
          rejection_reason: string | null
          requested_by: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          facility_id: string
          facility_type: string
          id?: string
          payload?: Json | null
          rejection_reason?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          facility_id?: string
          facility_type?: string
          id?: string
          payload?: Json | null
          rejection_reason?: string | null
          requested_by?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      file_assets: {
        Row: {
          attachment_type: string | null
          context_id: string
          context_type: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_type?: string | null
          context_id: string
          context_type: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_type?: string | null
          context_id?: string
          context_type?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_budgets: {
        Row: {
          budget_cents: number
          category_id: string | null
          created_at: string
          currency: string
          entity_id: string
          entity_type: string
          id: string
          month_start: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          budget_cents?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          entity_id: string
          entity_type: string
          id?: string
          month_start: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          budget_cents?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          entity_id?: string
          entity_type?: string
          id?: string
          month_start?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_categories: {
        Row: {
          color: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          is_active: boolean
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          is_active?: boolean
          kind?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          is_active?: boolean
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_entries: {
        Row: {
          amount_cents: number
          category_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          entity_id: string
          entity_type: string
          entry_type: string
          id: string
          location_id: string | null
          metadata: Json | null
          occurred_at: string
          reference: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount_cents?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          entity_id: string
          entity_type: string
          entry_type?: string
          id?: string
          location_id?: string | null
          metadata?: Json | null
          occurred_at?: string
          reference?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount_cents?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          entity_id?: string
          entity_type?: string
          entry_type?: string
          id?: string
          location_id?: string | null
          metadata?: Json | null
          occurred_at?: string
          reference?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_entries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_entries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_entries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "public_practice_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_recurring_entity_runs: {
        Row: {
          as_of: string
          created_at: string
          created_count: number
          entity_id: string
          entity_type: string
          error_count: number
          finished_at: string | null
          id: string
          notes: string | null
          skipped_count: number
          source: string
          started_at: string
        }
        Insert: {
          as_of?: string
          created_at?: string
          created_count?: number
          entity_id: string
          entity_type: string
          error_count?: number
          finished_at?: string | null
          id?: string
          notes?: string | null
          skipped_count?: number
          source: string
          started_at?: string
        }
        Update: {
          as_of?: string
          created_at?: string
          created_count?: number
          entity_id?: string
          entity_type?: string
          error_count?: number
          finished_at?: string | null
          id?: string
          notes?: string | null
          skipped_count?: number
          source?: string
          started_at?: string
        }
        Relationships: []
      }
      finance_recurring_expenses: {
        Row: {
          amount_cents: number
          autopost: boolean
          category_id: string | null
          created_at: string
          currency: string
          day_of_month: number | null
          description: string | null
          entity_id: string
          entity_type: string
          frequency: string
          id: string
          is_active: boolean
          last_posted_at: string | null
          month_of_year: number | null
          next_run_at: string | null
          notes: string | null
          updated_at: string
          weekday: number | null
        }
        Insert: {
          amount_cents?: number
          autopost?: boolean
          category_id?: string | null
          created_at?: string
          currency?: string
          day_of_month?: number | null
          description?: string | null
          entity_id: string
          entity_type: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_posted_at?: string | null
          month_of_year?: number | null
          next_run_at?: string | null
          notes?: string | null
          updated_at?: string
          weekday?: number | null
        }
        Update: {
          amount_cents?: number
          autopost?: boolean
          category_id?: string | null
          created_at?: string
          currency?: string
          day_of_month?: number | null
          description?: string | null
          entity_id?: string
          entity_type?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_posted_at?: string | null
          month_of_year?: number | null
          next_run_at?: string | null
          notes?: string | null
          updated_at?: string
          weekday?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_recurring_expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_recurring_rule_runs: {
        Row: {
          created_at: string
          created_by: string | null
          entity_run_id: string | null
          error: string | null
          finance_entry_id: string | null
          id: string
          rule_id: string
          run_date: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_run_id?: string | null
          error?: string | null
          finance_entry_id?: string | null
          id?: string
          rule_id: string
          run_date: string
          status: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_run_id?: string | null
          error?: string | null
          finance_entry_id?: string | null
          id?: string
          rule_id?: string
          run_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_recurring_rule_runs_entity_run_id_fkey"
            columns: ["entity_run_id"]
            isOneToOne: false
            referencedRelation: "finance_recurring_entity_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_recurring_rule_runs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "finance_recurring_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_recurring_rules: {
        Row: {
          active: boolean
          amount_cents: number
          category_id: string | null
          category_name: string | null
          created_at: string
          created_by: string | null
          currency: string
          day_of_month: number | null
          day_of_week: number | null
          description: string | null
          end_date: string | null
          entity_id: string
          entity_type: string
          entry_type: string
          id: string
          interval_n: number
          next_run_date: string
          schedule: string
          start_date: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          active?: boolean
          amount_cents: number
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          entity_id: string
          entity_type: string
          entry_type: string
          id?: string
          interval_n?: number
          next_run_date: string
          schedule: string
          start_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          active?: boolean
          amount_cents?: number
          category_id?: string | null
          category_name?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          day_of_month?: number | null
          day_of_week?: number | null
          description?: string | null
          end_date?: string | null
          entity_id?: string
          entity_type?: string
          entry_type?: string
          id?: string
          interval_n?: number
          next_run_date?: string
          schedule?: string
          start_date?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      finance_recurring_templates: {
        Row: {
          amount_cents: number
          category_id: string | null
          created_at: string
          currency: string
          description: string | null
          entity_id: string
          entity_type: string
          entry_type: string
          frequency: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          entity_id: string
          entity_type: string
          entry_type?: string
          frequency?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          entity_id?: string
          entity_type?: string
          entry_type?: string
          frequency?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_recurring_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_inputs: {
        Row: {
          ad_cost: number | null
          avg_customer_lifetime_months: number | null
          cogs: number | null
          created_at: string
          current_assets: number | null
          current_liabilities: number | null
          depreciation_expense: number | null
          entity_id: string
          entity_type: string
          fixed_costs: number | null
          id: string
          interest_expense: number | null
          marketing_spend: number | null
          operating_expenses: number | null
          price_per_unit: number | null
          tax_expense: number | null
          updated_at: string
          variable_cost_per_unit: number | null
        }
        Insert: {
          ad_cost?: number | null
          avg_customer_lifetime_months?: number | null
          cogs?: number | null
          created_at?: string
          current_assets?: number | null
          current_liabilities?: number | null
          depreciation_expense?: number | null
          entity_id: string
          entity_type: string
          fixed_costs?: number | null
          id?: string
          interest_expense?: number | null
          marketing_spend?: number | null
          operating_expenses?: number | null
          price_per_unit?: number | null
          tax_expense?: number | null
          updated_at?: string
          variable_cost_per_unit?: number | null
        }
        Update: {
          ad_cost?: number | null
          avg_customer_lifetime_months?: number | null
          cogs?: number | null
          created_at?: string
          current_assets?: number | null
          current_liabilities?: number | null
          depreciation_expense?: number | null
          entity_id?: string
          entity_type?: string
          fixed_costs?: number | null
          id?: string
          interest_expense?: number | null
          marketing_spend?: number | null
          operating_expenses?: number | null
          price_per_unit?: number | null
          tax_expense?: number | null
          updated_at?: string
          variable_cost_per_unit?: number | null
        }
        Relationships: []
      }
      fulfillment_orders: {
        Row: {
          assigned_to: string | null
          copay_amount: number | null
          created_at: string
          delivery_address: string | null
          delivery_notes: string | null
          dispensed_by: string | null
          estimated_ready_at: string | null
          id: string
          insurance_amount: number | null
          notes: string | null
          order_number: string
          patient_id: string
          payment_status: string | null
          pharmacy_id: string
          picked_up_at: string | null
          pickup_method: string | null
          prescription_id: string
          priority: string | null
          ready_at: string | null
          status: string | null
          total_amount: number | null
          updated_at: string
          verified_by: string | null
        }
        Insert: {
          assigned_to?: string | null
          copay_amount?: number | null
          created_at?: string
          delivery_address?: string | null
          delivery_notes?: string | null
          dispensed_by?: string | null
          estimated_ready_at?: string | null
          id?: string
          insurance_amount?: number | null
          notes?: string | null
          order_number?: string
          patient_id: string
          payment_status?: string | null
          pharmacy_id: string
          picked_up_at?: string | null
          pickup_method?: string | null
          prescription_id: string
          priority?: string | null
          ready_at?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string
          verified_by?: string | null
        }
        Update: {
          assigned_to?: string | null
          copay_amount?: number | null
          created_at?: string
          delivery_address?: string | null
          delivery_notes?: string | null
          dispensed_by?: string | null
          estimated_ready_at?: string | null
          id?: string
          insurance_amount?: number | null
          notes?: string | null
          order_number?: string
          patient_id?: string
          payment_status?: string | null
          pharmacy_id?: string
          picked_up_at?: string | null
          pickup_method?: string | null
          prescription_id?: string
          priority?: string | null
          ready_at?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_orders_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_orders_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
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
            referencedRelation: "doctor_public_profile_view"
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
      imaging_centers: {
        Row: {
          accepts_insurance: boolean | null
          accreditations: string[] | null
          address: string | null
          admin_id: string | null
          average_rating: number | null
          city: string | null
          country: string | null
          created_at: string
          email: string | null
          id: string
          is_verified: boolean | null
          license_number: string | null
          logo_url: string | null
          modalities: string[] | null
          name: string
          num_reviews: number | null
          operating_hours: Json | null
          phone: string | null
          status: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          accepts_insurance?: boolean | null
          accreditations?: string[] | null
          address?: string | null
          admin_id?: string | null
          average_rating?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_verified?: boolean | null
          license_number?: string | null
          logo_url?: string | null
          modalities?: string[] | null
          name: string
          num_reviews?: number | null
          operating_hours?: Json | null
          phone?: string | null
          status?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          accepts_insurance?: boolean | null
          accreditations?: string[] | null
          address?: string | null
          admin_id?: string | null
          average_rating?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_verified?: boolean | null
          license_number?: string | null
          logo_url?: string | null
          modalities?: string[] | null
          name?: string
          num_reviews?: number | null
          operating_hours?: Json | null
          phone?: string | null
          status?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      imaging_staff: {
        Row: {
          can_manage_equipment: boolean | null
          can_process_scans: boolean | null
          can_upload_results: boolean | null
          can_verify_results: boolean | null
          can_view_orders: boolean | null
          created_at: string
          hired_at: string | null
          id: string
          imaging_center_id: string
          license_number: string | null
          specializations: string[] | null
          staff_role: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_manage_equipment?: boolean | null
          can_process_scans?: boolean | null
          can_upload_results?: boolean | null
          can_verify_results?: boolean | null
          can_view_orders?: boolean | null
          created_at?: string
          hired_at?: string | null
          id?: string
          imaging_center_id: string
          license_number?: string | null
          specializations?: string[] | null
          staff_role?: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_manage_equipment?: boolean | null
          can_process_scans?: boolean | null
          can_upload_results?: boolean | null
          can_verify_results?: boolean | null
          can_view_orders?: boolean | null
          created_at?: string
          hired_at?: string | null
          id?: string
          imaging_center_id?: string
          license_number?: string | null
          specializations?: string[] | null
          staff_role?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "imaging_staff_imaging_center_id_fkey"
            columns: ["imaging_center_id"]
            isOneToOne: false
            referencedRelation: "imaging_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      imaging_staff_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string | null
          id: string
          imaging_center_id: string
          invited_by: string | null
          staff_role: string
          status: string
          token: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          imaging_center_id: string
          invited_by?: string | null
          staff_role?: string
          status?: string
          token?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          imaging_center_id?: string
          invited_by?: string | null
          staff_role?: string
          status?: string
          token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imaging_staff_invitations_imaging_center_id_fkey"
            columns: ["imaging_center_id"]
            isOneToOne: false
            referencedRelation: "imaging_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_plans: {
        Row: {
          coverage_type: string
          created_at: string
          description: string | null
          id: string
          plan_name: string
          provider_id: string
          updated_at: string
        }
        Insert: {
          coverage_type?: string
          created_at?: string
          description?: string | null
          id?: string
          plan_name: string
          provider_id: string
          updated_at?: string
        }
        Update: {
          coverage_type?: string
          created_at?: string
          description?: string | null
          id?: string
          plan_name?: string
          provider_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_plans_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "insurance_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_providers: {
        Row: {
          clinic_id: string | null
          country: string
          created_at: string
          created_by: string | null
          id: string
          is_global: boolean | null
          logo_url: string | null
          provider_name: string
          status: string | null
          updated_at: string
        }
        Insert: {
          clinic_id?: string | null
          country: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          logo_url?: string | null
          provider_name: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          clinic_id?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_global?: boolean | null
          logo_url?: string | null
          provider_name?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "insurance_providers_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
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
      lab_centers: {
        Row: {
          accepts_insurance: boolean | null
          accreditations: string[] | null
          address: string
          admin_id: string | null
          average_turnaround_hours: number | null
          city: string
          country: string
          created_at: string
          email: string | null
          id: string
          is_verified: boolean | null
          license_number: string | null
          logo_url: string | null
          name: string
          operating_hours: Json | null
          phone: string
          postal_code: string | null
          services_offered: string[] | null
          state: string | null
          status: string | null
          type: string
          updated_at: string
          website: string | null
        }
        Insert: {
          accepts_insurance?: boolean | null
          accreditations?: string[] | null
          address: string
          admin_id?: string | null
          average_turnaround_hours?: number | null
          city: string
          country?: string
          created_at?: string
          email?: string | null
          id?: string
          is_verified?: boolean | null
          license_number?: string | null
          logo_url?: string | null
          name: string
          operating_hours?: Json | null
          phone: string
          postal_code?: string | null
          services_offered?: string[] | null
          state?: string | null
          status?: string | null
          type?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          accepts_insurance?: boolean | null
          accreditations?: string[] | null
          address?: string
          admin_id?: string | null
          average_turnaround_hours?: number | null
          city?: string
          country?: string
          created_at?: string
          email?: string | null
          id?: string
          is_verified?: boolean | null
          license_number?: string | null
          logo_url?: string | null
          name?: string
          operating_hours?: Json | null
          phone?: string
          postal_code?: string | null
          services_offered?: string[] | null
          state?: string | null
          status?: string | null
          type?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      lab_home_collections: {
        Row: {
          address: string
          assigned_collector: string | null
          collected_at: string | null
          created_at: string
          facility_patient_id: string | null
          id: string
          lab_center_id: string
          notes: string | null
          patient_id: string | null
          patient_name: string | null
          patient_phone: string | null
          preferred_date: string | null
          preferred_time: string | null
          status: string
          test_order_id: string | null
          updated_at: string
        }
        Insert: {
          address: string
          assigned_collector?: string | null
          collected_at?: string | null
          created_at?: string
          facility_patient_id?: string | null
          id?: string
          lab_center_id: string
          notes?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          status?: string
          test_order_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          assigned_collector?: string | null
          collected_at?: string | null
          created_at?: string
          facility_patient_id?: string | null
          id?: string
          lab_center_id?: string
          notes?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          preferred_date?: string | null
          preferred_time?: string | null
          status?: string
          test_order_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_home_collections_facility_patient_id_fkey"
            columns: ["facility_patient_id"]
            isOneToOne: false
            referencedRelation: "facility_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_home_collections_test_order_id_fkey"
            columns: ["test_order_id"]
            isOneToOne: false
            referencedRelation: "test_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_samples: {
        Row: {
          barcode: string | null
          collected_at: string | null
          collected_by: string | null
          created_at: string
          facility_patient_id: string | null
          id: string
          lab_center_id: string
          notes: string | null
          patient_id: string | null
          patient_name: string | null
          sample_type: string
          status: string
          storage_location: string | null
          test_order_id: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string
          facility_patient_id?: string | null
          id?: string
          lab_center_id: string
          notes?: string | null
          patient_id?: string | null
          patient_name?: string | null
          sample_type?: string
          status?: string
          storage_location?: string | null
          test_order_id?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          collected_at?: string | null
          collected_by?: string | null
          created_at?: string
          facility_patient_id?: string | null
          id?: string
          lab_center_id?: string
          notes?: string | null
          patient_id?: string | null
          patient_name?: string | null
          sample_type?: string
          status?: string
          storage_location?: string | null
          test_order_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_samples_facility_patient_id_fkey"
            columns: ["facility_patient_id"]
            isOneToOne: false
            referencedRelation: "facility_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_samples_test_order_id_fkey"
            columns: ["test_order_id"]
            isOneToOne: false
            referencedRelation: "test_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_staff: {
        Row: {
          can_manage_equipment: boolean | null
          can_process_samples: boolean | null
          can_upload_results: boolean | null
          can_verify_results: boolean | null
          created_at: string
          hired_at: string | null
          id: string
          lab_center_id: string
          license_number: string | null
          specializations: string[] | null
          staff_role: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_manage_equipment?: boolean | null
          can_process_samples?: boolean | null
          can_upload_results?: boolean | null
          can_verify_results?: boolean | null
          created_at?: string
          hired_at?: string | null
          id?: string
          lab_center_id: string
          license_number?: string | null
          specializations?: string[] | null
          staff_role?: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_manage_equipment?: boolean | null
          can_process_samples?: boolean | null
          can_upload_results?: boolean | null
          can_verify_results?: boolean | null
          created_at?: string
          hired_at?: string | null
          id?: string
          lab_center_id?: string
          license_number?: string | null
          specializations?: string[] | null
          staff_role?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_staff_lab_center_id_fkey"
            columns: ["lab_center_id"]
            isOneToOne: false
            referencedRelation: "lab_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_staff_invitations: {
        Row: {
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          lab_center_id: string
          staff_role: string
          status: string
          token: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          lab_center_id: string
          staff_role?: string
          status?: string
          token?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          lab_center_id?: string
          staff_role?: string
          status?: string
          token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_staff_invitations_lab_center_id_fkey"
            columns: ["lab_center_id"]
            isOneToOne: false
            referencedRelation: "lab_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_sections: {
        Row: {
          content: Json | null
          created_at: string
          cta_link: string | null
          cta_text: string | null
          display_order: number
          id: string
          image_url: string | null
          is_visible: boolean
          section_key: string
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: Json | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_visible?: boolean
          section_key: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          content?: Json | null
          created_at?: string
          cta_link?: string | null
          cta_text?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_visible?: boolean
          section_key?: string
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      marketing_events: {
        Row: {
          created_at: string | null
          event_name: string
          id: string
          ip: unknown
          meta: Json | null
          page_path: string | null
          referrer: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_name: string
          id?: string
          ip?: unknown
          meta?: Json | null
          page_path?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_name?: string
          id?: string
          ip?: unknown
          meta?: Json | null
          page_path?: string | null
          referrer?: string | null
          user_agent?: string | null
          user_id?: string | null
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
            referencedRelation: "doctor_public_profile_view"
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
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages_with_attachments"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          message_type: string | null
          metadata: Json | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_permissions: {
        Row: {
          can_message_user_id: string
          context_id: string | null
          created_at: string
          id: string
          permission_type: string
          user_id: string
        }
        Insert: {
          can_message_user_id: string
          context_id?: string | null
          created_at?: string
          id?: string
          permission_type: string
          user_id: string
        }
        Update: {
          can_message_user_id?: string
          context_id?: string | null
          created_at?: string
          id?: string
          permission_type?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          level: string | null
          message: string
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          level?: string | null
          message: string
          related_id?: string | null
          related_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          level?: string | null
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
      patient_bone_annotations: {
        Row: {
          annotation_type: string
          bone_id: string
          created_at: string
          diagnosis_date: string | null
          doctor_id: string
          id: string
          notes: string | null
          patient_id: string
          severity: string | null
          updated_at: string
        }
        Insert: {
          annotation_type: string
          bone_id: string
          created_at?: string
          diagnosis_date?: string | null
          doctor_id: string
          id?: string
          notes?: string | null
          patient_id: string
          severity?: string | null
          updated_at?: string
        }
        Update: {
          annotation_type?: string
          bone_id?: string
          created_at?: string
          diagnosis_date?: string | null
          doctor_id?: string
          id?: string
          notes?: string | null
          patient_id?: string
          severity?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_bone_annotations_bone_id_fkey"
            columns: ["bone_id"]
            isOneToOne: false
            referencedRelation: "bones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_bone_annotations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_bone_annotations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_bone_annotations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_files: {
        Row: {
          category: string | null
          created_at: string
          doctor_id: string | null
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          name: string
          patient_id: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          doctor_id?: string | null
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          name: string
          patient_id: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          doctor_id?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          name?: string
          patient_id?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_files_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_files_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_files_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_insurance: {
        Row: {
          annual_limit: number | null
          card_back_url: string | null
          card_front_url: string | null
          co_pay: number | null
          covers_emergency: boolean | null
          created_at: string
          deductible: number | null
          file_url: string | null
          group_number: string | null
          id: string
          is_primary: boolean | null
          member_id: string | null
          notes: string | null
          patient_id: string
          plan_id: string | null
          provider_id: string
          provider_phone: string | null
          status: string | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          annual_limit?: number | null
          card_back_url?: string | null
          card_front_url?: string | null
          co_pay?: number | null
          covers_emergency?: boolean | null
          created_at?: string
          deductible?: number | null
          file_url?: string | null
          group_number?: string | null
          id?: string
          is_primary?: boolean | null
          member_id?: string | null
          notes?: string | null
          patient_id: string
          plan_id?: string | null
          provider_id: string
          provider_phone?: string | null
          status?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          annual_limit?: number | null
          card_back_url?: string | null
          card_front_url?: string | null
          co_pay?: number | null
          covers_emergency?: boolean | null
          created_at?: string
          deductible?: number | null
          file_url?: string | null
          group_number?: string | null
          id?: string
          is_primary?: boolean | null
          member_id?: string | null
          notes?: string | null
          patient_id?: string
          plan_id?: string | null
          provider_id?: string
          provider_phone?: string | null
          status?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_insurance_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "insurance_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_insurance_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "insurance_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_notes: {
        Row: {
          author_name: string | null
          content: string
          created_at: string
          doctor_id: string | null
          id: string
          is_pinned: boolean | null
          is_private: boolean | null
          patient_id: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          content: string
          created_at?: string
          doctor_id?: string | null
          id?: string
          is_pinned?: boolean | null
          is_private?: boolean | null
          patient_id: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          content?: string
          created_at?: string
          doctor_id?: string | null
          id?: string
          is_pinned?: boolean | null
          is_private?: boolean | null
          patient_id?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_notes_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_notes_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_notes_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_holds: {
        Row: {
          amount: number
          appointment_id: string | null
          captured_at: string | null
          created_at: string
          currency: string
          hold_expires_at: string | null
          id: string
          metadata: Json | null
          payment_provider: string | null
          provider_hold_id: string | null
          provider_payment_id: string | null
          refund_reason: string | null
          refunded_at: string | null
          released_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          captured_at?: string | null
          created_at?: string
          currency?: string
          hold_expires_at?: string | null
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          provider_hold_id?: string | null
          provider_payment_id?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          released_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          captured_at?: string | null
          created_at?: string
          currency?: string
          hold_expires_at?: string | null
          id?: string
          metadata?: Json | null
          payment_provider?: string | null
          provider_hold_id?: string | null
          provider_payment_id?: string | null
          refund_reason?: string | null
          refunded_at?: string | null
          released_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_holds_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_holds_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_all_appointments"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "payments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
      pharmacies: {
        Row: {
          accepts_insurance: boolean | null
          address: string | null
          admin_id: string | null
          average_rating: number | null
          city: string | null
          country: string | null
          created_at: string
          delivery_available: boolean | null
          email: string | null
          id: string
          license_number: string | null
          logo_url: string | null
          name: string
          num_reviews: number | null
          operating_hours: Json | null
          phone: string | null
          postal_code: string | null
          state: string | null
          tax_id: string | null
          updated_at: string
          verification_status: string | null
          verified: boolean | null
          website: string | null
        }
        Insert: {
          accepts_insurance?: boolean | null
          address?: string | null
          admin_id?: string | null
          average_rating?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          delivery_available?: boolean | null
          email?: string | null
          id?: string
          license_number?: string | null
          logo_url?: string | null
          name: string
          num_reviews?: number | null
          operating_hours?: Json | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
          verification_status?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          accepts_insurance?: boolean | null
          address?: string | null
          admin_id?: string | null
          average_rating?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          delivery_available?: boolean | null
          email?: string | null
          id?: string
          license_number?: string | null
          logo_url?: string | null
          name?: string
          num_reviews?: number | null
          operating_hours?: Json | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tax_id?: string | null
          updated_at?: string
          verification_status?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      pharmacy_inventory: {
        Row: {
          batch_number: string | null
          controlled_substance_schedule: string | null
          created_at: string
          expiry_date: string | null
          id: string
          is_controlled_substance: boolean | null
          manufacturer: string | null
          medication_code: string | null
          medication_name: string
          ndc_code: string | null
          pharmacy_id: string
          quantity_on_hand: number
          quantity_reserved: number
          reorder_level: number | null
          requires_refrigeration: boolean | null
          storage_location: string | null
          unit_cost: number | null
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          batch_number?: string | null
          controlled_substance_schedule?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_controlled_substance?: boolean | null
          manufacturer?: string | null
          medication_code?: string | null
          medication_name: string
          ndc_code?: string | null
          pharmacy_id: string
          quantity_on_hand?: number
          quantity_reserved?: number
          reorder_level?: number | null
          requires_refrigeration?: boolean | null
          storage_location?: string | null
          unit_cost?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          batch_number?: string | null
          controlled_substance_schedule?: string | null
          created_at?: string
          expiry_date?: string | null
          id?: string
          is_controlled_substance?: boolean | null
          manufacturer?: string | null
          medication_code?: string | null
          medication_name?: string
          ndc_code?: string | null
          pharmacy_id?: string
          quantity_on_hand?: number
          quantity_reserved?: number
          reorder_level?: number | null
          requires_refrigeration?: boolean | null
          storage_location?: string | null
          unit_cost?: number | null
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_inventory_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_orders: {
        Row: {
          amount: number | null
          amount_cents: number | null
          copay_amount: number | null
          created_at: string
          id: string
          insurance_amount: number | null
          notes: string | null
          order_number: string
          patient_id: string
          patient_name: string | null
          payment_status: string | null
          pharmacy_id: string
          prescription_id: string | null
          priority: string | null
          status: string
          total_amount: number | null
          total_amount_cents: number | null
          updated_at: string
        }
        Insert: {
          amount?: number | null
          amount_cents?: number | null
          copay_amount?: number | null
          created_at?: string
          id?: string
          insurance_amount?: number | null
          notes?: string | null
          order_number?: string
          patient_id: string
          patient_name?: string | null
          payment_status?: string | null
          pharmacy_id: string
          prescription_id?: string | null
          priority?: string | null
          status?: string
          total_amount?: number | null
          total_amount_cents?: number | null
          updated_at?: string
        }
        Update: {
          amount?: number | null
          amount_cents?: number | null
          copay_amount?: number | null
          created_at?: string
          id?: string
          insurance_amount?: number | null
          notes?: string | null
          order_number?: string
          patient_id?: string
          patient_name?: string | null
          payment_status?: string | null
          pharmacy_id?: string
          prescription_id?: string | null
          priority?: string | null
          status?: string
          total_amount?: number | null
          total_amount_cents?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_orders_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_orders_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_staff: {
        Row: {
          can_dispense: boolean | null
          can_manage_inventory: boolean | null
          can_process_prescriptions: boolean | null
          created_at: string
          hired_at: string | null
          id: string
          license_number: string | null
          pharmacy_id: string
          staff_role: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          can_dispense?: boolean | null
          can_manage_inventory?: boolean | null
          can_process_prescriptions?: boolean | null
          created_at?: string
          hired_at?: string | null
          id?: string
          license_number?: string | null
          pharmacy_id: string
          staff_role?: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          can_dispense?: boolean | null
          can_manage_inventory?: boolean | null
          can_process_prescriptions?: boolean | null
          created_at?: string
          hired_at?: string | null
          id?: string
          license_number?: string | null
          pharmacy_id?: string
          staff_role?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_staff_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      popular_searches: {
        Row: {
          created_at: string
          id: string
          last_searched_at: string
          search_count: number | null
          search_term: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_searched_at?: string
          search_count?: number | null
          search_term: string
        }
        Update: {
          created_at?: string
          id?: string
          last_searched_at?: string
          search_count?: number | null
          search_term?: string
        }
        Relationships: []
      }
      practice_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          custom_message: string | null
          email: string | null
          expires_at: string
          full_name: string | null
          id: string
          invite_token: string | null
          invite_type: string
          invited_by: string
          invited_user_id: string | null
          phone: string | null
          practice_id: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          custom_message?: string | null
          email?: string | null
          expires_at?: string
          full_name?: string | null
          id?: string
          invite_token?: string | null
          invite_type?: string
          invited_by: string
          invited_user_id?: string | null
          phone?: string | null
          practice_id: string
          role: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          custom_message?: string | null
          email?: string | null
          expires_at?: string
          full_name?: string | null
          id?: string
          invite_token?: string | null
          invite_type?: string
          invited_by?: string
          invited_user_id?: string | null
          phone?: string | null
          practice_id?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_invitations_practice_id_fkey"
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
          location_id: string | null
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
          location_id?: string | null
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
          location_id?: string | null
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
            referencedRelation: "doctor_public_profile_view"
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
            foreignKeyName: "practice_join_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "practice_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_join_requests_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "public_practice_locations"
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
      practice_schedule_settings: {
        Row: {
          created_at: string
          holidays: string[] | null
          id: string
          practice_id: string
          updated_at: string
          working_days: Json
        }
        Insert: {
          created_at?: string
          holidays?: string[] | null
          id?: string
          practice_id: string
          updated_at?: string
          working_days?: Json
        }
        Update: {
          created_at?: string
          holidays?: string[] | null
          id?: string
          practice_id?: string
          updated_at?: string
          working_days?: Json
        }
        Relationships: [
          {
            foreignKeyName: "practice_schedule_settings_practice_id_fkey"
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
      practice_verification: {
        Row: {
          business_email: string | null
          business_name: string | null
          business_type: string | null
          city: string | null
          country: string | null
          created_at: string | null
          full_address: string | null
          id: string
          operating_hours: Json | null
          phone: string | null
          practice_description: string | null
          practice_id: string
          practice_size: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          services_offered: string[] | null
          specialties: string[] | null
          state: string | null
          status: string | null
          submitted_at: string | null
          updated_at: string | null
          website_url: string | null
          zip_code: string | null
        }
        Insert: {
          business_email?: string | null
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          full_address?: string | null
          id?: string
          operating_hours?: Json | null
          phone?: string | null
          practice_description?: string | null
          practice_id: string
          practice_size?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          services_offered?: string[] | null
          specialties?: string[] | null
          state?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          website_url?: string | null
          zip_code?: string | null
        }
        Update: {
          business_email?: string | null
          business_name?: string | null
          business_type?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          full_address?: string | null
          id?: string
          operating_hours?: Json | null
          phone?: string | null
          practice_description?: string | null
          practice_id?: string
          practice_size?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          services_offered?: string[] | null
          specialties?: string[] | null
          state?: string | null
          status?: string | null
          submitted_at?: string | null
          updated_at?: string | null
          website_url?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "practice_verification_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: true
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
          has_imaging_service: boolean | null
          has_lab_service: boolean | null
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
          has_imaging_service?: boolean | null
          has_lab_service?: boolean | null
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
          has_imaging_service?: boolean | null
          has_lab_service?: boolean | null
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
      prescription_items: {
        Row: {
          created_at: string
          dosage: string
          frequency: string
          id: string
          instructions: string | null
          medication_code: string | null
          medication_name: string
          prescription_id: string
          quantity: number
          substitutions_allowed: boolean | null
          unit: string | null
        }
        Insert: {
          created_at?: string
          dosage: string
          frequency: string
          id?: string
          instructions?: string | null
          medication_code?: string | null
          medication_name: string
          prescription_id: string
          quantity: number
          substitutions_allowed?: boolean | null
          unit?: string | null
        }
        Update: {
          created_at?: string
          dosage?: string
          frequency?: string
          id?: string
          instructions?: string | null
          medication_code?: string | null
          medication_name?: string
          prescription_id?: string
          quantity?: number
          substitutions_allowed?: boolean | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          appointment_id: string | null
          created_at: string
          diagnosis_code: string | null
          doctor_id: string | null
          expires_at: string | null
          external_patient_ref: string | null
          id: string
          notes: string | null
          patient_email: string | null
          patient_id: string | null
          patient_name: string | null
          patient_phone: string | null
          patient_snapshot_address: string | null
          patient_snapshot_dob: string | null
          patient_snapshot_email: string | null
          patient_snapshot_full_name: string | null
          patient_snapshot_gender: string | null
          patient_snapshot_id_number: string | null
          patient_snapshot_phone: string | null
          pharmacy_id: string | null
          prescribed_at: string
          prescription_number: string
          refills_remaining: number | null
          refills_total: number | null
          signature_url: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          diagnosis_code?: string | null
          doctor_id?: string | null
          expires_at?: string | null
          external_patient_ref?: string | null
          id?: string
          notes?: string | null
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          patient_snapshot_address?: string | null
          patient_snapshot_dob?: string | null
          patient_snapshot_email?: string | null
          patient_snapshot_full_name?: string | null
          patient_snapshot_gender?: string | null
          patient_snapshot_id_number?: string | null
          patient_snapshot_phone?: string | null
          pharmacy_id?: string | null
          prescribed_at?: string
          prescription_number?: string
          refills_remaining?: number | null
          refills_total?: number | null
          signature_url?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          diagnosis_code?: string | null
          doctor_id?: string | null
          expires_at?: string | null
          external_patient_ref?: string | null
          id?: string
          notes?: string | null
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          patient_snapshot_address?: string | null
          patient_snapshot_dob?: string | null
          patient_snapshot_email?: string | null
          patient_snapshot_full_name?: string | null
          patient_snapshot_gender?: string | null
          patient_snapshot_id_number?: string | null
          patient_snapshot_phone?: string | null
          pharmacy_id?: string | null
          prescribed_at?: string
          prescription_number?: string
          refills_remaining?: number | null
          refills_total?: number | null
          signature_url?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_all_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
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
          doctor_id: string | null
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
          doctor_id?: string | null
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
          doctor_id?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_templates_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_templates_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_templates_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
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
          followup_count: number | null
          followup_interval_days: number | null
          followup_intervals_days: number[] | null
          has_followup: boolean | null
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
          followup_count?: number | null
          followup_interval_days?: number | null
          followup_intervals_days?: number[] | null
          has_followup?: boolean | null
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
          followup_count?: number | null
          followup_interval_days?: number | null
          followup_intervals_days?: number[] | null
          has_followup?: boolean | null
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
            referencedRelation: "doctor_public_profile_view"
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
          doctor_id: string | null
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
          doctor_id?: string | null
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
          doctor_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "profiles_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
      public_insurance_requests: {
        Row: {
          clinic_id: string
          created_at: string
          id: string
          original_data: Json | null
          processed_at: string | null
          provider_id: string | null
          request_type: string
          reviewer_id: string | null
          reviewer_notes: string | null
          status: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          clinic_id: string
          created_at?: string
          id?: string
          original_data?: Json | null
          processed_at?: string | null
          provider_id?: string | null
          request_type?: string
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          clinic_id?: string
          created_at?: string
          id?: string
          original_data?: Json | null
          processed_at?: string | null
          provider_id?: string | null
          request_type?: string
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "public_insurance_requests_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_insurance_requests_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "insurance_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: unknown
          key: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: unknown
          key: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: unknown
          key?: string
          user_id?: string | null
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
      referral_appointments: {
        Row: {
          appointment_date: string
          appointment_id: string | null
          booked_at: string
          booked_by: string
          checked_in_at: string | null
          completed_at: string | null
          created_at: string
          end_time: string
          id: string
          notes: string | null
          referral_id: string
          referral_slot_id: string | null
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          appointment_id?: string | null
          booked_at?: string
          booked_by: string
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string
          end_time: string
          id?: string
          notes?: string | null
          referral_id: string
          referral_slot_id?: string | null
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          appointment_id?: string | null
          booked_at?: string
          booked_by?: string
          checked_in_at?: string | null
          completed_at?: string | null
          created_at?: string
          end_time?: string
          id?: string
          notes?: string | null
          referral_id?: string
          referral_slot_id?: string | null
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_appointments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_appointments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_all_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_appointments_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_appointments_referral_slot_id_fkey"
            columns: ["referral_slot_id"]
            isOneToOne: false
            referencedRelation: "referral_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_audit_log: {
        Row: {
          action: string
          actor_id: string
          actor_role: string | null
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json | null
          notes: string | null
          old_values: Json | null
          referral_id: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id: string
          actor_role?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          referral_id: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          actor_role?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          notes?: string | null
          old_values?: Json | null
          referral_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_audit_log_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_notifications: {
        Row: {
          channel: string
          created_at: string
          delivery_status: string | null
          id: string
          is_read: boolean
          message: string
          notification_type: string
          read_at: string | null
          recipient_id: string
          referral_id: string
          sent_at: string | null
          title: string
        }
        Insert: {
          channel?: string
          created_at?: string
          delivery_status?: string | null
          id?: string
          is_read?: boolean
          message: string
          notification_type: string
          read_at?: string | null
          recipient_id: string
          referral_id: string
          sent_at?: string | null
          title: string
        }
        Update: {
          channel?: string
          created_at?: string
          delivery_status?: string | null
          id?: string
          is_read?: boolean
          message?: string
          notification_type?: string
          read_at?: string | null
          recipient_id?: string
          referral_id?: string
          sent_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_notifications_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_slots: {
        Row: {
          created_at: string
          end_time: string
          id: string
          is_available: boolean
          is_reserved: boolean
          notes: string | null
          referral_id: string
          reserved_at: string | null
          reserved_by: string | null
          slot_date: string
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          is_available?: boolean
          is_reserved?: boolean
          notes?: string | null
          referral_id: string
          reserved_at?: string | null
          reserved_by?: string | null
          slot_date: string
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          is_available?: boolean
          is_reserved?: boolean
          notes?: string | null
          referral_id?: string
          reserved_at?: string | null
          reserved_by?: string | null
          slot_date?: string
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_slots_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          attachments: Json | null
          clinical_notes: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          diagnosis_codes: string[] | null
          estimated_duration_minutes: number | null
          external_patient_ref: string | null
          facility_patient_id: string | null
          id: string
          insurance_plan_id: string | null
          insurance_provider_id: string | null
          notes: string | null
          patient_email: string | null
          patient_id: string | null
          patient_name: string | null
          patient_phone: string | null
          patient_snapshot_address: string | null
          patient_snapshot_dob: string | null
          patient_snapshot_email: string | null
          patient_snapshot_full_name: string | null
          patient_snapshot_gender: string | null
          patient_snapshot_id_number: string | null
          patient_snapshot_phone: string | null
          pre_authorization_number: string | null
          preferred_date: string | null
          preferred_time_slot: string | null
          priority: Database["public"]["Enums"]["referral_priority"] | null
          reason: string | null
          receiver_entity_id: string | null
          receiver_type:
            | Database["public"]["Enums"]["referral_entity_type"]
            | null
          receiver_user_id: string | null
          referral_number: string | null
          referral_type_enum:
            | Database["public"]["Enums"]["referral_type"]
            | null
          referred_doctor_id: string | null
          referrer_entity_id: string | null
          referrer_type:
            | Database["public"]["Enums"]["referral_entity_type"]
            | null
          referrer_user_id: string | null
          referring_doctor_id: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          result_attachments: Json | null
          result_notes: string | null
          sent_at: string | null
          status: string | null
          treatment_plan_id: string | null
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          attachments?: Json | null
          clinical_notes?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          diagnosis_codes?: string[] | null
          estimated_duration_minutes?: number | null
          external_patient_ref?: string | null
          facility_patient_id?: string | null
          id?: string
          insurance_plan_id?: string | null
          insurance_provider_id?: string | null
          notes?: string | null
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          patient_snapshot_address?: string | null
          patient_snapshot_dob?: string | null
          patient_snapshot_email?: string | null
          patient_snapshot_full_name?: string | null
          patient_snapshot_gender?: string | null
          patient_snapshot_id_number?: string | null
          patient_snapshot_phone?: string | null
          pre_authorization_number?: string | null
          preferred_date?: string | null
          preferred_time_slot?: string | null
          priority?: Database["public"]["Enums"]["referral_priority"] | null
          reason?: string | null
          receiver_entity_id?: string | null
          receiver_type?:
            | Database["public"]["Enums"]["referral_entity_type"]
            | null
          receiver_user_id?: string | null
          referral_number?: string | null
          referral_type_enum?:
            | Database["public"]["Enums"]["referral_type"]
            | null
          referred_doctor_id?: string | null
          referrer_entity_id?: string | null
          referrer_type?:
            | Database["public"]["Enums"]["referral_entity_type"]
            | null
          referrer_user_id?: string | null
          referring_doctor_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          result_attachments?: Json | null
          result_notes?: string | null
          sent_at?: string | null
          status?: string | null
          treatment_plan_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          attachments?: Json | null
          clinical_notes?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          diagnosis_codes?: string[] | null
          estimated_duration_minutes?: number | null
          external_patient_ref?: string | null
          facility_patient_id?: string | null
          id?: string
          insurance_plan_id?: string | null
          insurance_provider_id?: string | null
          notes?: string | null
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          patient_snapshot_address?: string | null
          patient_snapshot_dob?: string | null
          patient_snapshot_email?: string | null
          patient_snapshot_full_name?: string | null
          patient_snapshot_gender?: string | null
          patient_snapshot_id_number?: string | null
          patient_snapshot_phone?: string | null
          pre_authorization_number?: string | null
          preferred_date?: string | null
          preferred_time_slot?: string | null
          priority?: Database["public"]["Enums"]["referral_priority"] | null
          reason?: string | null
          receiver_entity_id?: string | null
          receiver_type?:
            | Database["public"]["Enums"]["referral_entity_type"]
            | null
          receiver_user_id?: string | null
          referral_number?: string | null
          referral_type_enum?:
            | Database["public"]["Enums"]["referral_type"]
            | null
          referred_doctor_id?: string | null
          referrer_entity_id?: string | null
          referrer_type?:
            | Database["public"]["Enums"]["referral_entity_type"]
            | null
          referrer_user_id?: string | null
          referring_doctor_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          result_attachments?: Json | null
          result_notes?: string | null
          sent_at?: string | null
          status?: string | null
          treatment_plan_id?: string | null
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_facility_patient_id_fkey"
            columns: ["facility_patient_id"]
            isOneToOne: false
            referencedRelation: "facility_patients"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "doctor_public_profile_view"
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
            referencedRelation: "doctor_public_profile_view"
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
      saved_searches: {
        Row: {
          created_at: string
          filters: Json | null
          id: string
          name: string
          search_term: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json | null
          id?: string
          name: string
          search_term?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json | null
          id?: string
          name?: string
          search_term?: string | null
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "doctor_public_profile_view"
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
      search_history: {
        Row: {
          created_at: string
          filters: Json | null
          id: string
          result_count: number | null
          search_term: string
          search_type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          filters?: Json | null
          id?: string
          result_count?: number | null
          search_term: string
          search_type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          filters?: Json | null
          id?: string
          result_count?: number | null
          search_term?: string
          search_type?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      staff_compensation_profiles: {
        Row: {
          compensation_type: string
          created_at: string
          created_by: string | null
          effective_from: string
          entity_id: string
          entity_type: string
          hourly_rate_cents: number | null
          id: string
          is_active: boolean
          notes: string | null
          payout_frequency: string
          percentage_of: string | null
          percentage_rate: number | null
          salary_amount_cents: number | null
          salary_period: string | null
          user_id: string
        }
        Insert: {
          compensation_type: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          entity_id: string
          entity_type: string
          hourly_rate_cents?: number | null
          id?: string
          is_active?: boolean
          notes?: string | null
          payout_frequency?: string
          percentage_of?: string | null
          percentage_rate?: number | null
          salary_amount_cents?: number | null
          salary_period?: string | null
          user_id: string
        }
        Update: {
          compensation_type?: string
          created_at?: string
          created_by?: string | null
          effective_from?: string
          entity_id?: string
          entity_type?: string
          hourly_rate_cents?: number | null
          id?: string
          is_active?: boolean
          notes?: string | null
          payout_frequency?: string
          percentage_of?: string | null
          percentage_rate?: number | null
          salary_amount_cents?: number | null
          salary_period?: string | null
          user_id?: string
        }
        Relationships: []
      }
      staff_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          custom_message: string | null
          email: string
          entity_id: string
          entity_type: string
          expires_at: string
          full_name: string | null
          id: string
          invite_token: string
          invite_type: string
          invited_by: string | null
          invited_user_id: string | null
          phone: string | null
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          custom_message?: string | null
          email: string
          entity_id: string
          entity_type: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invite_token?: string
          invite_type?: string
          invited_by?: string | null
          invited_user_id?: string | null
          phone?: string | null
          role: string
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          custom_message?: string | null
          email?: string
          entity_id?: string
          entity_type?: string
          expires_at?: string
          full_name?: string | null
          id?: string
          invite_token?: string
          invite_type?: string
          invited_by?: string | null
          invited_user_id?: string | null
          phone?: string | null
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
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
      test_catalog: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_global: boolean | null
          lab_center_id: string | null
          name: string
          parameters: Json | null
          preparation_instructions: string | null
          price: number | null
          requires_fasting: boolean | null
          sample_type: string | null
          subcategory: string | null
          test_code: string
          turnaround_hours: number | null
          updated_at: string
          visibility: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean | null
          lab_center_id?: string | null
          name: string
          parameters?: Json | null
          preparation_instructions?: string | null
          price?: number | null
          requires_fasting?: boolean | null
          sample_type?: string | null
          subcategory?: string | null
          test_code: string
          turnaround_hours?: number | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_global?: boolean | null
          lab_center_id?: string | null
          name?: string
          parameters?: Json | null
          preparation_instructions?: string | null
          price?: number | null
          requires_fasting?: boolean | null
          sample_type?: string | null
          subcategory?: string | null
          test_code?: string
          turnaround_hours?: number | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_catalog_lab_center_id_fkey"
            columns: ["lab_center_id"]
            isOneToOne: false
            referencedRelation: "lab_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      test_order_items: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          price: number | null
          status: string | null
          test_id: string
          test_order_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          price?: number | null
          status?: string | null
          test_id: string
          test_order_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          price?: number | null
          status?: string | null
          test_id?: string
          test_order_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_order_items_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "test_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_order_items_test_order_id_fkey"
            columns: ["test_order_id"]
            isOneToOne: false
            referencedRelation: "test_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      test_orders: {
        Row: {
          appointment_id: string | null
          clinical_notes: string | null
          completed_at: string | null
          created_at: string
          diagnosis_codes: string[] | null
          doctor_id: string | null
          external_patient_ref: string | null
          facility_patient_id: string | null
          id: string
          insurance_covered: boolean | null
          lab_center_id: string | null
          order_number: string
          patient_email: string | null
          patient_id: string | null
          patient_name: string | null
          patient_phone: string | null
          patient_snapshot_address: string | null
          patient_snapshot_dob: string | null
          patient_snapshot_email: string | null
          patient_snapshot_full_name: string | null
          patient_snapshot_gender: string | null
          patient_snapshot_id_number: string | null
          patient_snapshot_phone: string | null
          payment_status: string | null
          priority: string | null
          sample_collected_at: string | null
          sample_collected_by: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string | null
          total_amount: number | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          clinical_notes?: string | null
          completed_at?: string | null
          created_at?: string
          diagnosis_codes?: string[] | null
          doctor_id?: string | null
          external_patient_ref?: string | null
          facility_patient_id?: string | null
          id?: string
          insurance_covered?: boolean | null
          lab_center_id?: string | null
          order_number?: string
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          patient_snapshot_address?: string | null
          patient_snapshot_dob?: string | null
          patient_snapshot_email?: string | null
          patient_snapshot_full_name?: string | null
          patient_snapshot_gender?: string | null
          patient_snapshot_id_number?: string | null
          patient_snapshot_phone?: string | null
          payment_status?: string | null
          priority?: string | null
          sample_collected_at?: string | null
          sample_collected_by?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          clinical_notes?: string | null
          completed_at?: string | null
          created_at?: string
          diagnosis_codes?: string[] | null
          doctor_id?: string | null
          external_patient_ref?: string | null
          facility_patient_id?: string | null
          id?: string
          insurance_covered?: boolean | null
          lab_center_id?: string | null
          order_number?: string
          patient_email?: string | null
          patient_id?: string | null
          patient_name?: string | null
          patient_phone?: string | null
          patient_snapshot_address?: string | null
          patient_snapshot_dob?: string | null
          patient_snapshot_email?: string | null
          patient_snapshot_full_name?: string | null
          patient_snapshot_gender?: string | null
          patient_snapshot_id_number?: string | null
          patient_snapshot_phone?: string | null
          payment_status?: string | null
          priority?: string | null
          sample_collected_at?: string | null
          sample_collected_by?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          total_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_orders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_orders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_all_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_orders_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_orders_facility_patient_id_fkey"
            columns: ["facility_patient_id"]
            isOneToOne: false
            referencedRelation: "facility_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_orders_lab_center_id_fkey"
            columns: ["lab_center_id"]
            isOneToOne: false
            referencedRelation: "lab_centers"
            referencedColumns: ["id"]
          },
        ]
      }
      test_result_files: {
        Row: {
          created_at: string
          description: string | null
          file_category: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          test_result_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_category?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          id?: string
          test_result_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_category?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          id?: string
          test_result_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_result_files_test_result_id_fkey"
            columns: ["test_result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          abnormal_flag: string | null
          created_at: string
          id: string
          interpretation: string | null
          is_abnormal: boolean | null
          performed_at: string | null
          performed_by: string | null
          reference_range: string | null
          result_data: Json
          result_text: string | null
          status: string | null
          test_order_item_id: string
          unit: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          abnormal_flag?: string | null
          created_at?: string
          id?: string
          interpretation?: string | null
          is_abnormal?: boolean | null
          performed_at?: string | null
          performed_by?: string | null
          reference_range?: string | null
          result_data?: Json
          result_text?: string | null
          status?: string | null
          test_order_item_id: string
          unit?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          abnormal_flag?: string | null
          created_at?: string
          id?: string
          interpretation?: string | null
          is_abnormal?: boolean | null
          performed_at?: string | null
          performed_by?: string | null
          reference_range?: string | null
          result_data?: Json
          result_text?: string | null
          status?: string | null
          test_order_item_id?: string
          unit?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_results_test_order_item_id_fkey"
            columns: ["test_order_item_id"]
            isOneToOne: false
            referencedRelation: "test_order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      tooth_files: {
        Row: {
          created_at: string
          description: string | null
          id: string
          patient_file_id: string | null
          tooth_numbers: number[]
          tooth_record_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          patient_file_id?: string | null
          tooth_numbers: number[]
          tooth_record_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          patient_file_id?: string | null
          tooth_numbers?: number[]
          tooth_record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tooth_files_patient_file_id_fkey"
            columns: ["patient_file_id"]
            isOneToOne: false
            referencedRelation: "patient_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooth_files_tooth_record_id_fkey"
            columns: ["tooth_record_id"]
            isOneToOne: false
            referencedRelation: "tooth_records"
            referencedColumns: ["id"]
          },
        ]
      }
      tooth_procedure_history: {
        Row: {
          appointment_id: string | null
          cost: number | null
          created_at: string
          doctor_id: string | null
          id: string
          notes: string | null
          patient_id: string
          performed_at: string | null
          procedure_id: string | null
          procedure_name: string
          status: Database["public"]["Enums"]["dental_procedure_status"]
          tooth_numbers: number[]
          tooth_record_id: string | null
          updated_at: string
        }
        Insert: {
          appointment_id?: string | null
          cost?: number | null
          created_at?: string
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          performed_at?: string | null
          procedure_id?: string | null
          procedure_name: string
          status?: Database["public"]["Enums"]["dental_procedure_status"]
          tooth_numbers: number[]
          tooth_record_id?: string | null
          updated_at?: string
        }
        Update: {
          appointment_id?: string | null
          cost?: number | null
          created_at?: string
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          performed_at?: string | null
          procedure_id?: string | null
          procedure_name?: string
          status?: Database["public"]["Enums"]["dental_procedure_status"]
          tooth_numbers?: number[]
          tooth_record_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tooth_procedure_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooth_procedure_history_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_all_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooth_procedure_history_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooth_procedure_history_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooth_procedure_history_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooth_procedure_history_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "dental_procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooth_procedure_history_tooth_record_id_fkey"
            columns: ["tooth_record_id"]
            isOneToOne: false
            referencedRelation: "tooth_records"
            referencedColumns: ["id"]
          },
        ]
      }
      tooth_records: {
        Row: {
          created_at: string
          doctor_id: string | null
          id: string
          notes: string | null
          patient_id: string
          status: Database["public"]["Enums"]["tooth_status"]
          tooth_number: number
          tooth_type: Database["public"]["Enums"]["tooth_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          status?: Database["public"]["Enums"]["tooth_status"]
          tooth_number: number
          tooth_type?: Database["public"]["Enums"]["tooth_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          doctor_id?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          status?: Database["public"]["Enums"]["tooth_status"]
          tooth_number?: number
          tooth_type?: Database["public"]["Enums"]["tooth_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tooth_records_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooth_records_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tooth_records_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
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
      treatment_plan_procedure_visits: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          id: string
          scheduled_date: string | null
          scheduled_time: string | null
          treatment_plan_procedure_id: string
          visit_index: number
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          id?: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          treatment_plan_procedure_id: string
          visit_index?: number
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          id?: string
          scheduled_date?: string | null
          scheduled_time?: string | null
          treatment_plan_procedure_id?: string
          visit_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "treatment_plan_procedure_visit_treatment_plan_procedure_id_fkey"
            columns: ["treatment_plan_procedure_id"]
            isOneToOne: false
            referencedRelation: "treatment_plan_procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_procedure_visits_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plan_procedure_visits_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_all_appointments"
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
          duration_minutes: number | null
          id: string
          notes: string | null
          priority: string | null
          procedure_id: string | null
          scheduled_date: string | null
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
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          priority?: string | null
          procedure_id?: string | null
          scheduled_date?: string | null
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
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          priority?: string | null
          procedure_id?: string | null
          scheduled_date?: string | null
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
            referencedRelation: "doctor_public_profile_view"
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
          doctor_patient_id: string | null
          estimated_completion_date: string | null
          estimated_duration_weeks: number | null
          expires_at: string | null
          id: string
          notes: string | null
          patient_id: string | null
          priority: string | null
          published_at: string | null
          status: Database["public"]["Enums"]["treatment_plan_status"] | null
          title: string
          total_cost: number | null
          updated_at: string | null
          verification_code: string | null
        }
        Insert: {
          created_at?: string | null
          doctor_id?: string | null
          doctor_patient_id?: string | null
          estimated_completion_date?: string | null
          estimated_duration_weeks?: number | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          priority?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["treatment_plan_status"] | null
          title: string
          total_cost?: number | null
          updated_at?: string | null
          verification_code?: string | null
        }
        Update: {
          created_at?: string | null
          doctor_id?: string | null
          doctor_patient_id?: string | null
          estimated_completion_date?: string | null
          estimated_duration_weeks?: number | null
          expires_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string | null
          priority?: string | null
          published_at?: string | null
          status?: Database["public"]["Enums"]["treatment_plan_status"] | null
          title?: string
          total_cost?: number | null
          updated_at?: string | null
          verification_code?: string | null
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
            referencedRelation: "doctor_public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treatment_plans_doctor_patient_id_fkey"
            columns: ["doctor_patient_id"]
            isOneToOne: false
            referencedRelation: "doctor_patients"
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
            referencedRelation: "doctor_public_profile_view"
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
      user_payment_methods: {
        Row: {
          brand: string | null
          created_at: string
          exp_month: number | null
          exp_year: number | null
          id: string
          is_default: boolean
          last4: string | null
          provider: string
          provider_payment_method_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean
          last4?: string | null
          provider?: string
          provider_payment_method_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean
          last4?: string | null
          provider?: string
          provider_payment_method_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_settings: {
        Row: {
          created_at: string
          id: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          updated_at?: string
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
          entity_id: string | null
          entity_type: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          pharmacy_id: string | null
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
          entity_id?: string | null
          entity_type?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          pharmacy_id?: string | null
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
          entity_id?: string | null
          entity_type?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          pharmacy_id?: string | null
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
            foreignKeyName: "verification_documents_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_documents_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          comment: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          rejection_reason: string | null
          requested_by: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          rejection_reason?: string | null
          requested_by: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          rejection_reason?: string | null
          requested_by?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      video_consultations: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          appointment_id: string | null
          created_at: string
          doctor_id: string
          doctor_joined_at: string | null
          duration_minutes: number | null
          id: string
          notes: string | null
          patient_id: string
          patient_joined_at: string | null
          recording_url: string | null
          room_id: string
          room_url: string
          scheduled_end: string
          scheduled_start: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          appointment_id?: string | null
          created_at?: string
          doctor_id: string
          doctor_joined_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id: string
          patient_joined_at?: string | null
          recording_url?: string | null
          room_id: string
          room_url: string
          scheduled_end: string
          scheduled_start: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          appointment_id?: string | null
          created_at?: string
          doctor_id?: string
          doctor_joined_at?: string | null
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          patient_id?: string
          patient_joined_at?: string | null
          recording_url?: string | null
          room_id?: string
          room_url?: string
          scheduled_end?: string
          scheduled_start?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_consultations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_consultations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "patient_all_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_consultations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_profiles_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_consultations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctor_public_profile_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_consultations_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "doctors"
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
          appointment_count: number | null
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          consultation_fee: number | null
          consultation_types: string[] | null
          created_at: string | null
          custom_profile_link: string | null
          email: string | null
          full_name: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string | null
          languages: string[] | null
          license_number: string | null
          logo_url: string | null
          num_reviews: number | null
          phone: string | null
          practice_address: string | null
          practice_city: string | null
          practice_country: string | null
          practice_id: string | null
          practice_name: string | null
          profile_address: string | null
          profile_visibility: string | null
          specialty: string | null
          user_id: string | null
          username: string | null
          verified: boolean | null
          weighted_rating: number | null
          years_experience: number | null
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
      doctor_public_profile_view: {
        Row: {
          accepts_new_patients: boolean | null
          avatar_url: string | null
          average_rating: number | null
          bio: string | null
          consultation_fee: number | null
          consultation_types: string[] | null
          custom_profile_link: string | null
          email: string | null
          full_name: string | null
          gender: Database["public"]["Enums"]["gender_type"] | null
          id: string | null
          languages: string[] | null
          num_reviews: number | null
          phone: string | null
          practice_address: string | null
          practice_city: string | null
          practice_country: string | null
          practice_id: string | null
          practice_name: string | null
          practice_phone: string | null
          practice_verified: boolean | null
          specialty: string | null
          user_id: string | null
          username: string | null
          verified: boolean | null
          years_experience: number | null
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
      messages_with_attachments: {
        Row: {
          attachments: Json | null
          content: string | null
          conversation_id: string | null
          created_at: string | null
          id: string | null
          is_read: boolean | null
          message_type: string | null
          metadata: Json | null
          sender_id: string | null
          updated_at: string | null
        }
        Insert: {
          attachments?: never
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string | null
          is_read?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          sender_id?: string | null
          updated_at?: string | null
        }
        Update: {
          attachments?: never
          content?: string | null
          conversation_id?: string | null
          created_at?: string | null
          id?: string | null
          is_read?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          sender_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_all_appointments: {
        Row: {
          appointment_date: string | null
          appointment_type:
            | Database["public"]["Enums"]["appointment_type"]
            | null
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
            referencedRelation: "doctor_public_profile_view"
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
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
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
      accept_practice_invitation: {
        Args: { p_invite_token: string }
        Returns: Json
      }
      accept_staff_invitation: {
        Args: { p_invite_token: string }
        Returns: Json
      }
      account_analytics: {
        Args: { p_days?: number; p_user_id: string }
        Returns: Json
      }
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
      assign_initial_role: { Args: { p_role: string }; Returns: undefined }
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
      can_access_entity: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: boolean
      }
      can_access_practice: { Args: { p_practice_id: string }; Returns: boolean }
      can_send_message: { Args: { conv_id: string }; Returns: boolean }
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
      capture_payment_hold: { Args: { p_hold_id: string }; Returns: Json }
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
      check_user_exists: {
        Args: { p_email: string; p_phone?: string }
        Returns: {
          found_user_id: string
          user_exists: boolean
        }[]
      }
      cleanup_expired_appointment_holds: { Args: never; Returns: undefined }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      create_appointment_hold: {
        Args: {
          p_amount: number
          p_appointment_id: string
          p_currency?: string
        }
        Returns: Json
      }
      create_clinic_imaging_order: {
        Args: {
          p_appointment_id?: string
          p_body_part?: string
          p_clinic_id: string
          p_clinical_notes?: string
          p_diagnosis_codes?: string[]
          p_exam_name: string
          p_modality: string
          p_patient_id: string
          p_priority?: string
        }
        Returns: Json
      }
      create_clinic_lab_order: {
        Args: {
          p_appointment_id?: string
          p_clinic_id: string
          p_clinical_notes?: string
          p_diagnosis_codes?: string[]
          p_patient_id: string
          p_priority?: string
          p_test_code?: string
          p_test_name: string
          p_test_type: string
        }
        Returns: Json
      }
      create_direct_conversation: {
        Args: { target_user_id: string }
        Returns: string
      }
      create_group_conversation: {
        Args: { p_name: string; p_participant_ids: string[] }
        Returns: string
      }
      create_guest_patient_profile: {
        Args: { p_email: string; p_full_name: string; p_phone?: string }
        Returns: Json
      }
      create_or_get_patient_profile: {
        Args: { p_email: string; p_full_name: string; p_phone?: string }
        Returns: Json
      }
      create_prescription: {
        Args: {
          p_doctor_id: string
          p_items: Json
          p_notes?: string
          p_patient_id: string
          p_refills?: number
        }
        Returns: Json
      }
      create_referral_notification: {
        Args: {
          p_message: string
          p_recipient_id: string
          p_referral_id: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      doctor_can_view_patient_profile: {
        Args: { target_user_id: string }
        Returns: boolean
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
      finance_category_get_or_create: {
        Args: {
          p_category_id: string
          p_category_name: string
          p_entity_id: string
          p_entity_type: string
          p_kind: string
        }
        Returns: string
      }
      finance_entries_export: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_from_date?: string
          p_to_date?: string
        }
        Returns: {
          amount_cents: number
          category_name: string
          currency: string
          description: string
          entry_type: string
          id: string
          occurred_at: string
        }[]
      }
      finance_entry_upsert_manual: {
        Args: {
          p_amount_cents: number
          p_category_id?: string
          p_category_name?: string
          p_currency: string
          p_description?: string
          p_entity_id: string
          p_entity_type: string
          p_entry_id: string
          p_entry_type: string
          p_occurred_at: string
          p_reference?: string
        }
        Returns: {
          entry_id: string
        }[]
      }
      finance_recurring_entity_runs_list: {
        Args: { p_entity_id: string; p_entity_type: string; p_limit?: number }
        Returns: {
          as_of: string
          created_count: number
          error_count: number
          finished_at: string
          id: string
          notes: string
          skipped_count: number
          source: string
          started_at: string
        }[]
      }
      finance_recurring_entity_status: {
        Args: { p_as_of?: string; p_entity_id: string; p_entity_type: string }
        Returns: Json
      }
      finance_recurring_first_run_date: {
        Args: {
          p_day_of_month: number
          p_day_of_week: number
          p_schedule: string
          p_start_date: string
        }
        Returns: string
      }
      finance_recurring_generate_due_v2: {
        Args: {
          p_as_of?: string
          p_entity_id: string
          p_entity_run_id?: string
          p_entity_type: string
        }
        Returns: {
          finance_entry_id: string
          rule_id: string
          run_date: string
          status: string
        }[]
      }
      finance_recurring_next_run_date: {
        Args: {
          p_current_run: string
          p_day_of_month: number
          p_interval_n: number
          p_schedule: string
        }
        Returns: string
      }
      finance_recurring_rule_deactivate: {
        Args: { p_entity_id: string; p_entity_type: string; p_rule_id: string }
        Returns: undefined
      }
      finance_recurring_rule_list: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: {
          active: boolean
          amount_cents: number
          category_id: string
          category_name: string
          currency: string
          day_of_month: number
          day_of_week: number
          description: string
          end_date: string
          entry_type: string
          id: string
          interval_n: number
          next_run_date: string
          schedule: string
          start_date: string
          updated_at: string
        }[]
      }
      finance_recurring_rule_runs_for_entity_run: {
        Args: { p_entity_run_id: string; p_limit?: number }
        Returns: {
          amount_cents: number
          description: string
          entry_id: string
          id: string
          rule_id: string
        }[]
      }
      finance_recurring_rule_runs_list: {
        Args: { p_entity_id: string; p_entity_type: string; p_limit?: number }
        Returns: {
          amount_cents: number
          entry_id: string
          id: string
          rule_id: string
          run_at: string
          status: string
        }[]
      }
      finance_recurring_rule_upsert: {
        Args: {
          p_amount_cents?: number
          p_autopost?: boolean
          p_category_id?: string
          p_category_name?: string
          p_currency?: string
          p_day_of_month?: number
          p_description?: string
          p_entity_id: string
          p_entity_type: string
          p_entry_type?: string
          p_frequency?: string
          p_month_of_year?: number
          p_notes?: string
          p_rule_id?: string
          p_weekday?: number
        }
        Returns: string
      }
      finance_recurring_runs_export: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_from_date?: string
          p_to_date?: string
        }
        Returns: {
          amount_cents: number
          currency: string
          rule_description: string
          run_date: string
          status: string
        }[]
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_video_room_id: { Args: never; Returns: string }
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
      get_doctor_referral_stats: {
        Args: { p_doctor_id: string }
        Returns: {
          completed: number
          pending_received: number
          pending_sent: number
          rejected: number
          this_month_received: number
          this_month_sent: number
          total_received: number
          total_sent: number
        }[]
      }
      get_doctors_by_insurance: {
        Args: { p_plan_id?: string; p_provider_id: string }
        Returns: {
          doctor_id: string
        }[]
      }
      get_my_entity_scopes: {
        Args: never
        Returns: {
          entity_id: string
          entity_name: string
          entity_status: string
          entity_type: string
          is_admin: boolean
          permissions: Json
          scope_role: string
        }[]
      }
      get_my_unread_notifications_count: { Args: never; Returns: number }
      get_practice_appointments: {
        Args: { p_limit_count?: number; p_practice_id: string }
        Returns: {
          appointment_date: string
          doctor_name: string
          end_time: string
          id: string
          notes: string
          patient_name: string
          start_time: string
          status: string
        }[]
      }
      get_practice_messages: {
        Args: { p_limit_count?: number; p_practice_id: string }
        Returns: {
          created_at: string
          id: string
          message: string
          sender_name: string
        }[]
      }
      get_practice_patients: {
        Args: { p_limit_count?: number; p_practice_id: string }
        Returns: {
          doctor_name: string
          email: string
          full_name: string
          id: string
          last_visit: string
          phone: string
          status: string
        }[]
      }
      get_practice_payments: {
        Args: { p_limit_count?: number; p_practice_id: string }
        Returns: {
          amount: number
          created_at: string
          description: string
          id: string
          patient_name: string
          status: string
        }[]
      }
      get_practice_providers: {
        Args: { p_practice_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          id: string
          location_name: string
          practice_location_id: string
          specialty: string
        }[]
      }
      get_practice_services: {
        Args: { p_practice_id: string }
        Returns: {
          category: string
          doctor_name: string
          duration_minutes: number
          id: string
          name: string
          price: number
        }[]
      }
      get_practice_staff: {
        Args: { p_practice_id: string }
        Returns: {
          department: string
          email: string
          full_name: string
          hire_date: string
          id: string
          role: string
          status: string
          user_id: string
        }[]
      }
      get_practice_stats: { Args: { p_practice_id: string }; Returns: Json }
      get_public_doctor_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          full_name: string
          is_verified: boolean
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
          username: string
        }[]
      }
      get_staff_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          accepted_at: string | null
          created_at: string
          custom_message: string | null
          email: string
          entity_id: string
          entity_type: string
          expires_at: string
          full_name: string | null
          id: string
          invite_token: string
          invite_type: string
          invited_by: string | null
          invited_user_id: string | null
          phone: string | null
          role: string
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "staff_invitations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_staff_permissions: { Args: { p_user_id: string }; Returns: Json }
      get_user_primary_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
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
      homepage_unified_search: {
        Args: { search_location?: string; search_query?: string }
        Returns: {
          id: string
          image_url: string
          location: string
          name: string
          rating: number
          specialty: string
          type: string
          verified: boolean
        }[]
      }
      inherit_clinic_insurance_to_doctor: {
        Args: { p_clinic_id: string; p_doctor_id: string }
        Returns: undefined
      }
      is_conversation_participant: {
        Args: { p_conversation_id: string; p_user_id: string }
        Returns: boolean
      }
      is_practice_staff: {
        Args: { p_practice_id: string; p_user_id: string }
        Returns: boolean
      }
      is_verified_dentist: { Args: { p_user_id: string }; Returns: boolean }
      log_account_activity: {
        Args: {
          p_activity_type: string
          p_device_info?: string
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: Json
      }
      log_entity_action: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_new_values?: Json
          p_old_values?: Json
        }
        Returns: string
      }
      log_referral_action: {
        Args: {
          p_action: string
          p_new_values?: Json
          p_notes?: string
          p_old_values?: Json
          p_referral_id: string
        }
        Returns: string
      }
      mark_notification_as_read: {
        Args: { notification_id: string }
        Returns: Json
      }
      process_fulfillment_order: {
        Args: { p_action: string; p_fulfillment_id: string; p_notes?: string }
        Returns: Json
      }
      process_insurance_request: {
        Args: { p_action: string; p_notes?: string; p_request_id: string }
        Returns: Json
      }
      refresh_all_ratings: { Args: never; Returns: undefined }
      release_payment_hold: {
        Args: { p_hold_id: string; p_reason?: string }
        Returns: Json
      }
      request_account_action: {
        Args: { p_notes?: string; p_request_type: string }
        Returns: Json
      }
      request_entity_verification: {
        Args: { p_comment?: string; p_entity_id: string; p_entity_type: string }
        Returns: string
      }
      search_chat_users: {
        Args: { p_query: string }
        Returns: {
          avatar_url: string
          full_name: string
          highest_role: Database["public"]["Enums"]["app_role"]
          roles: Database["public"]["Enums"]["app_role"][]
          user_id: string
        }[]
      }
      send_notification_to_user:
        | {
            Args: {
              p_data?: Json
              p_message?: string
              p_notification_type?: string
              p_recipient_user_id: string
              p_title?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_data?: Json
              p_expires_at?: string
              p_message: string
              p_notification_type: string
              p_recipient_user_id: string
              p_sender_user_id?: string
              p_title: string
            }
            Returns: string
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
      send_prescription_to_pharmacy: {
        Args: { p_pharmacy_id: string; p_prescription_id: string }
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
      staff_can_view_patient_profile: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      submit_insurance_for_approval: {
        Args: { p_clinic_id: string; p_provider_id: string }
        Returns: Json
      }
      update_appointment_counts: { Args: never; Returns: undefined }
      update_doctor_weighted_ratings: { Args: never; Returns: undefined }
      update_popular_search: { Args: { term: string }; Returns: undefined }
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
      app_role:
        | "patient"
        | "doctor"
        | "admin"
        | "staff"
        | "super_admin"
        | "receptionist"
        | "nurse"
        | "billing_manager"
        | "pharmacist"
        | "lab_technician"
        | "internal_lab_tech"
        | "internal_imaging_tech"
        | "clinic_admin"
        | "clinic_staff"
        | "pharmacy_admin"
        | "pharmacy_staff"
        | "lab_admin"
        | "lab_staff"
        | "imaging_admin"
        | "imaging_staff"
      appointment_status:
        | "pending"
        | "confirmed"
        | "completed"
        | "canceled"
        | "no_show"
      appointment_type:
        | "in_person"
        | "video"
        | "home_visit"
        | "messaging"
        | "follow_up"
      consent_status: "pending" | "signed" | "declined"
      dental_procedure_status:
        | "planned"
        | "in_progress"
        | "completed"
        | "cancelled"
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
        | "preventive_care"
        | "prosthodontic"
        | "general_consultation"
        | "diagnostic_testing"
        | "diagnostic"
        | "vaccination"
        | "chronic_disease"
        | "acute_care"
        | "follow_up"
        | "minor_surgery"
        | "physical_therapy"
        | "mental_health"
        | "womens_health"
        | "pediatric_care"
        | "geriatric_care"
        | "cardiology"
        | "dermatology"
        | "orthopedics"
        | "neurology"
        | "gastroenterology"
        | "pulmonology"
        | "endocrinology"
        | "nephrology"
        | "urology"
        | "ophthalmology"
        | "ent"
        | "allergy_immunology"
        | "dental_examination"
        | "dental_cleaning"
        | "dental_checkup"
        | "crowns_bridges"
        | "root_canal"
        | "extractions"
        | "dental_implants"
        | "dentures"
        | "orthodontics"
        | "periodontics"
        | "cosmetic_dental"
        | "cosmetic_dentistry"
        | "teeth_whitening"
        | "veneers"
        | "pediatric_dentistry"
        | "pediatric_dental"
        | "tmj_treatment"
        | "emergency_dental"
        | "implantology"
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
      referral_entity_type:
        | "doctor"
        | "clinic"
        | "lab"
        | "imaging_center"
        | "pharmacy"
      referral_priority: "routine" | "urgent" | "stat"
      referral_type:
        | "consultation"
        | "lab_test"
        | "imaging_study"
        | "prescription_fulfillment"
        | "follow_up_care"
        | "specialist_referral"
      tooth_status:
        | "healthy"
        | "caries"
        | "filled"
        | "missing"
        | "crown"
        | "implant"
        | "watch"
        | "extracted"
        | "root_canal"
        | "sealant"
      tooth_type: "permanent" | "primary"
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
      app_role: [
        "patient",
        "doctor",
        "admin",
        "staff",
        "super_admin",
        "receptionist",
        "nurse",
        "billing_manager",
        "pharmacist",
        "lab_technician",
        "internal_lab_tech",
        "internal_imaging_tech",
        "clinic_admin",
        "clinic_staff",
        "pharmacy_admin",
        "pharmacy_staff",
        "lab_admin",
        "lab_staff",
        "imaging_admin",
        "imaging_staff",
      ],
      appointment_status: [
        "pending",
        "confirmed",
        "completed",
        "canceled",
        "no_show",
      ],
      appointment_type: [
        "in_person",
        "video",
        "home_visit",
        "messaging",
        "follow_up",
      ],
      consent_status: ["pending", "signed", "declined"],
      dental_procedure_status: [
        "planned",
        "in_progress",
        "completed",
        "cancelled",
      ],
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
        "preventive_care",
        "prosthodontic",
        "general_consultation",
        "diagnostic_testing",
        "diagnostic",
        "vaccination",
        "chronic_disease",
        "acute_care",
        "follow_up",
        "minor_surgery",
        "physical_therapy",
        "mental_health",
        "womens_health",
        "pediatric_care",
        "geriatric_care",
        "cardiology",
        "dermatology",
        "orthopedics",
        "neurology",
        "gastroenterology",
        "pulmonology",
        "endocrinology",
        "nephrology",
        "urology",
        "ophthalmology",
        "ent",
        "allergy_immunology",
        "dental_examination",
        "dental_cleaning",
        "dental_checkup",
        "crowns_bridges",
        "root_canal",
        "extractions",
        "dental_implants",
        "dentures",
        "orthodontics",
        "periodontics",
        "cosmetic_dental",
        "cosmetic_dentistry",
        "teeth_whitening",
        "veneers",
        "pediatric_dentistry",
        "pediatric_dental",
        "tmj_treatment",
        "emergency_dental",
        "implantology",
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
      referral_entity_type: [
        "doctor",
        "clinic",
        "lab",
        "imaging_center",
        "pharmacy",
      ],
      referral_priority: ["routine", "urgent", "stat"],
      referral_type: [
        "consultation",
        "lab_test",
        "imaging_study",
        "prescription_fulfillment",
        "follow_up_care",
        "specialist_referral",
      ],
      tooth_status: [
        "healthy",
        "caries",
        "filled",
        "missing",
        "crown",
        "implant",
        "watch",
        "extracted",
        "root_canal",
        "sealant",
      ],
      tooth_type: ["permanent", "primary"],
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
