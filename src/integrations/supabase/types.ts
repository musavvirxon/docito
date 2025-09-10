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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      consent_forms: {
        Row: {
          content: string
          created_at: string
          id: string
          ip_address: unknown | null
          patient_full_name: string | null
          patient_signature: string | null
          signed_at: string | null
          status: Database["public"]["Enums"]["consent_status"]
          title: string
          treatment_plan_id: string
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          patient_full_name?: string | null
          patient_signature?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          title: string
          treatment_plan_id: string
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          ip_address?: unknown | null
          patient_full_name?: string | null
          patient_signature?: string | null
          signed_at?: string | null
          status?: Database["public"]["Enums"]["consent_status"]
          title?: string
          treatment_plan_id?: string
          updated_at?: string
          user_agent?: string | null
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
      dentist_settings: {
        Row: {
          created_at: string
          default_tooth_numbering: Database["public"]["Enums"]["tooth_numbering_system"]
          dentist_id: string
          id: string
          practice_address: string | null
          practice_email: string | null
          practice_name: string | null
          practice_phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_tooth_numbering?: Database["public"]["Enums"]["tooth_numbering_system"]
          dentist_id: string
          id?: string
          practice_address?: string | null
          practice_email?: string | null
          practice_name?: string | null
          practice_phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_tooth_numbering?: Database["public"]["Enums"]["tooth_numbering_system"]
          dentist_id?: string
          id?: string
          practice_address?: string | null
          practice_email?: string | null
          practice_name?: string | null
          practice_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      doctors: {
        Row: {
          created_at: string
          email: string
          id: string
          is_verified: boolean | null
          license_number: string | null
          name: string
          phone: string | null
          practice_name: string | null
          specialties: string[] | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_verified?: boolean | null
          license_number?: string | null
          name: string
          phone?: string | null
          practice_name?: string | null
          specialties?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_verified?: boolean | null
          license_number?: string | null
          name?: string
          phone?: string | null
          practice_name?: string | null
          specialties?: string[] | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      medical_record_audit: {
        Row: {
          access_type: string
          accessed_at: string | null
          accessed_by: string | null
          id: string
          ip_address: unknown | null
          record_id: string | null
          user_agent: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string | null
          accessed_by?: string | null
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string | null
          accessed_by?: string | null
          id?: string
          ip_address?: unknown | null
          record_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "medical_record_audit_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "medical_records"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_records: {
        Row: {
          added_by: string
          created_at: string
          description: string | null
          doctor_email: string | null
          doctor_id: string | null
          doctor_name: string | null
          doctor_phone: string | null
          file_uploads: string[] | null
          id: string
          license_number: string | null
          patient_id: string
          practice_name: string | null
          record_date: string
          record_type: string
          status: string
          title: string
          updated_at: string
          verification_log: Json | null
        }
        Insert: {
          added_by: string
          created_at?: string
          description?: string | null
          doctor_email?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          doctor_phone?: string | null
          file_uploads?: string[] | null
          id?: string
          license_number?: string | null
          patient_id: string
          practice_name?: string | null
          record_date: string
          record_type: string
          status?: string
          title: string
          updated_at?: string
          verification_log?: Json | null
        }
        Update: {
          added_by?: string
          created_at?: string
          description?: string | null
          doctor_email?: string | null
          doctor_id?: string | null
          doctor_name?: string | null
          doctor_phone?: string | null
          file_uploads?: string[] | null
          id?: string
          license_number?: string | null
          patient_id?: string
          practice_name?: string | null
          record_date?: string
          record_type?: string
          status?: string
          title?: string
          updated_at?: string
          verification_log?: Json | null
        }
        Relationships: []
      }
      procedure_attachments: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          id: string
          procedure_id: string | null
          treatment_plan_id: string | null
          treatment_plan_procedure_id: string | null
          uploaded_by: string
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
          treatment_plan_id?: string | null
          treatment_plan_procedure_id?: string | null
          uploaded_by: string
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
          treatment_plan_id?: string | null
          treatment_plan_procedure_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_attachments_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_attachments_treatment_plan_id_fkey"
            columns: ["treatment_plan_id"]
            isOneToOne: false
            referencedRelation: "treatment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "procedure_attachments_treatment_plan_procedure_id_fkey"
            columns: ["treatment_plan_procedure_id"]
            isOneToOne: false
            referencedRelation: "treatment_plan_procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          category: Database["public"]["Enums"]["procedure_category"]
          created_at: string
          default_cost: number | null
          dentist_id: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          tooth_range: number[] | null
          type: Database["public"]["Enums"]["procedure_type"]
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["procedure_category"]
          created_at?: string
          default_cost?: number | null
          dentist_id: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          tooth_range?: number[] | null
          type: Database["public"]["Enums"]["procedure_type"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["procedure_category"]
          created_at?: string
          default_cost?: number | null
          dentist_id?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          tooth_range?: number[] | null
          type?: Database["public"]["Enums"]["procedure_type"]
          updated_at?: string
        }
        Relationships: []
      }
      treatment_plan_procedures: {
        Row: {
          completed_at: string | null
          created_at: string
          custom_cost: number | null
          custom_notes: string | null
          id: string
          procedure_id: string
          sequence_order: number
          status: Database["public"]["Enums"]["procedure_status"]
          tooth_numbers: number[] | null
          treatment_plan_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          custom_cost?: number | null
          custom_notes?: string | null
          id?: string
          procedure_id: string
          sequence_order?: number
          status?: Database["public"]["Enums"]["procedure_status"]
          tooth_numbers?: number[] | null
          treatment_plan_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          custom_cost?: number | null
          custom_notes?: string | null
          id?: string
          procedure_id?: string
          sequence_order?: number
          status?: Database["public"]["Enums"]["procedure_status"]
          tooth_numbers?: number[] | null
          treatment_plan_id?: string
          updated_at?: string
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
      treatment_plans: {
        Row: {
          completed_at: string | null
          created_at: string
          dentist_id: string
          description: string | null
          id: string
          patient_id: string
          published_at: string | null
          status: Database["public"]["Enums"]["treatment_plan_status"]
          title: string
          total_cost: number | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          dentist_id: string
          description?: string | null
          id?: string
          patient_id: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["treatment_plan_status"]
          title: string
          total_cost?: number | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          dentist_id?: string
          description?: string | null
          id?: string
          patient_id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["treatment_plan_status"]
          title?: string
          total_cost?: number | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_doctor_contact_for_booking: {
        Args: { doctor_id: string }
        Returns: {
          contact_allowed: boolean
          doctor_name: string
          practice_name: string
        }[]
      }
    }
    Enums: {
      consent_status: "pending" | "signed" | "declined"
      procedure_category:
        | "restorative"
        | "surgical"
        | "orthodontic"
        | "periodontal"
        | "endodontic"
        | "prosthodontic"
        | "oral_surgery"
        | "preventive"
        | "cosmetic"
        | "other"
      procedure_status: "planned" | "in_progress" | "completed" | "cancelled"
      procedure_type: "tooth_based" | "oral_cavity_region"
      tooth_numbering_system: "international_fdi" | "universal" | "palmer"
      treatment_plan_status:
        | "draft"
        | "published"
        | "in_progress"
        | "completed"
        | "cancelled"
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
      consent_status: ["pending", "signed", "declined"],
      procedure_category: [
        "restorative",
        "surgical",
        "orthodontic",
        "periodontal",
        "endodontic",
        "prosthodontic",
        "oral_surgery",
        "preventive",
        "cosmetic",
        "other",
      ],
      procedure_status: ["planned", "in_progress", "completed", "cancelled"],
      procedure_type: ["tooth_based", "oral_cavity_region"],
      tooth_numbering_system: ["international_fdi", "universal", "palmer"],
      treatment_plan_status: [
        "draft",
        "published",
        "in_progress",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
