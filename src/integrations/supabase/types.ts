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
      consent_forms: {
        Row: {
          content: string
          created_at: string | null
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
          bio: string | null
          consultation_fee: number | null
          created_at: string | null
          id: string
          license_number: string | null
          practice_id: string | null
          specialty: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          accepts_new_patients?: boolean | null
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          id?: string
          license_number?: string | null
          practice_id?: string | null
          specialty: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          accepts_new_patients?: boolean | null
          bio?: string | null
          consultation_fee?: number | null
          created_at?: string | null
          id?: string
          license_number?: string | null
          practice_id?: string | null
          specialty?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "doctors_practice_id_fkey"
            columns: ["practice_id"]
            isOneToOne: false
            referencedRelation: "practices"
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
      practices: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string | null
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          verified: boolean | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          verified?: boolean | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      procedures: {
        Row: {
          category: Database["public"]["Enums"]["procedure_category"] | null
          created_at: string | null
          default_cost: number | null
          dentist_id: string | null
          duration_minutes: number | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          tooth_range: number[] | null
          type: Database["public"]["Enums"]["procedure_type"] | null
          updated_at: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["procedure_category"] | null
          created_at?: string | null
          default_cost?: number | null
          dentist_id?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          tooth_range?: number[] | null
          type?: Database["public"]["Enums"]["procedure_type"] | null
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["procedure_category"] | null
          created_at?: string | null
          default_cost?: number | null
          dentist_id?: string | null
          duration_minutes?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          tooth_range?: number[] | null
          type?: Database["public"]["Enums"]["procedure_type"] | null
          updated_at?: string | null
        }
        Relationships: [
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
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          user_id: string
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
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id: string
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
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          user_id?: string
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
            referencedRelation: "doctors"
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
      treatment_plan_procedures: {
        Row: {
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
            referencedRelation: "doctors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
      treatment_plan_status: "draft" | "published" | "in_progress" | "completed"
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
      treatment_plan_status: ["draft", "published", "in_progress", "completed"],
      user_role: ["patient", "doctor", "admin", "staff"],
    },
  },
} as const
