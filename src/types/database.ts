// AUTO-GENERATED — do not edit by hand.
// Regenerate after any schema change: python sync.py --get_database_schema

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          log_id: string
          notes: string | null
          target_id: string | null
          target_type: string | null
          timestamp: string
        }
        Insert: {
          action: string
          admin_id: string
          log_id?: string
          notes?: string | null
          target_id?: string | null
          target_type?: string | null
          timestamp?: string
        }
        Update: {
          action?: string
          admin_id?: string
          log_id?: string
          notes?: string | null
          target_id?: string | null
          target_type?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "admins"
            referencedColumns: ["admin_id"]
          },
        ]
      }
      admins: {
        Row: {
          admin_id: string
          assigned_at: string
          user_id: string
        }
        Insert: {
          admin_id?: string
          assigned_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string
          assigned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      channel_posts: {
        Row: {
          channel_id: string
          content: string | null
          deleted_flag: boolean
          file_attachment_url: string | null
          flag_level: number
          image_url: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          channel_id: string
          content?: string | null
          deleted_flag?: boolean
          file_attachment_url?: string | null
          flag_level?: number
          image_url?: string | null
          post_id?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          content?: string | null
          deleted_flag?: boolean
          file_attachment_url?: string | null
          flag_level?: number
          image_url?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["channel_id"]
          },
          {
            foreignKeyName: "channel_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      channels: {
        Row: {
          channel_id: string
          created_at: string
          ministry_id: string
        }
        Insert: {
          channel_id?: string
          created_at?: string
          ministry_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          ministry_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channels_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: true
            referencedRelation: "ministries"
            referencedColumns: ["ministry_id"]
          },
        ]
      }
      content_flags: {
        Row: {
          flag_id: string
          flagged_by_user_id: string
          reason: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          severity: number
          target_id: string
          target_type: string
        }
        Insert: {
          flag_id?: string
          flagged_by_user_id: string
          reason?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          severity: number
          target_id: string
          target_type: string
        }
        Update: {
          flag_id?: string
          flagged_by_user_id?: string
          reason?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          severity?: number
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_flags_flagged_by_user_id_fkey"
            columns: ["flagged_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "content_flags_resolved_by_user_id_fkey"
            columns: ["resolved_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      decline_reasons: {
        Row: {
          created_at: string
          decline_stage: string
          opt_out_reason: string | null
          reason_id: string
        }
        Insert: {
          created_at?: string
          decline_stage: string
          opt_out_reason?: string | null
          reason_id?: string
        }
        Update: {
          created_at?: string
          decline_stage?: string
          opt_out_reason?: string | null
          reason_id?: string
        }
        Relationships: []
      }
      incomplete_enrollments: {
        Row: {
          created_at: string
          enrollment_type: string
          exited_at_step: string | null
          opt_out_reason: string | null
          record_id: string
        }
        Insert: {
          created_at?: string
          enrollment_type: string
          exited_at_step?: string | null
          opt_out_reason?: string | null
          record_id?: string
        }
        Update: {
          created_at?: string
          enrollment_type?: string
          exited_at_step?: string | null
          opt_out_reason?: string | null
          record_id?: string
        }
        Relationships: []
      }
      kv_store_78e2f486: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      leader_interviews: {
        Row: {
          flag_level: number
          interview_id: string
          interviewed_user_id: string
          ministry_id: string
          posted_at: string
          status: string | null
          text_content: string | null
          type: string
          video_url: string | null
        }
        Insert: {
          flag_level?: number
          interview_id?: string
          interviewed_user_id: string
          ministry_id: string
          posted_at?: string
          status?: string | null
          text_content?: string | null
          type: string
          video_url?: string | null
        }
        Update: {
          flag_level?: number
          interview_id?: string
          interviewed_user_id?: string
          ministry_id?: string
          posted_at?: string
          status?: string | null
          text_content?: string | null
          type?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leader_interviews_interviewed_user_id_fkey"
            columns: ["interviewed_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "leader_interviews_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["ministry_id"]
          },
        ]
      }
      member_agreements: {
        Row: {
          agreement_id: string
          effective_date: string | null
          text_content: string | null
          version: string
        }
        Insert: {
          agreement_id?: string
          effective_date?: string | null
          text_content?: string | null
          version: string
        }
        Update: {
          agreement_id?: string
          effective_date?: string | null
          text_content?: string | null
          version?: string
        }
        Relationships: []
      }
      member_notes: {
        Row: {
          content: string | null
          ministry_id: string
          note_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          ministry_id: string
          note_id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          ministry_id?: string
          note_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_notes_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["ministry_id"]
          },
          {
            foreignKeyName: "member_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      ministries: {
        Row: {
          annual_budget: number | null
          annual_reports: string[] | null
          contact: string | null
          contact_id: string | null
          contact_role: string | null
          contact_role_details: string | null
          created_at: string
          ein: string | null
          exec_director_name: string | null
          flag_level: number
          form_990_source: string | null
          generated_citations_report_1: string[] | null
          generated_citations_report_2: string[] | null
          generated_report_1: string | null
          generated_report_2: string | null
          hq_city: string | null
          hq_country: string | null
          hq_state: string | null
          irs_reports: string[] | null
          leader_or_representative_user_id: string | null
          location_served: string[] | null
          logo_url: string | null
          ministry_id: string
          ministry_name: string
          ministry_type: string | null
          mission: string | null
          model_name: string | null
          NRM_1_version: string | null
          NRM_2_version: string | null
          people_groups_served: string[] | null
          questionnaire: string | null
          slug: string | null
          status: string
          subsidiary_irs_reports: string[] | null
          subsidiary_status: boolean
          website_url: string | null
        }
        Insert: {
          annual_budget?: number | null
          annual_reports?: string[] | null
          contact?: string | null
          contact_id?: string | null
          contact_role?: string | null
          contact_role_details?: string | null
          created_at?: string
          ein?: string | null
          exec_director_name?: string | null
          flag_level?: number
          form_990_source?: string | null
          generated_citations_report_1?: string[] | null
          generated_citations_report_2?: string[] | null
          generated_report_1?: string | null
          generated_report_2?: string | null
          hq_city?: string | null
          hq_country?: string | null
          hq_state?: string | null
          irs_reports?: string[] | null
          leader_or_representative_user_id?: string | null
          location_served?: string[] | null
          logo_url?: string | null
          ministry_id?: string
          ministry_name: string
          ministry_type?: string | null
          mission?: string | null
          model_name?: string | null
          NRM_1_version?: string | null
          NRM_2_version?: string | null
          people_groups_served?: string[] | null
          questionnaire?: string | null
          slug?: string | null
          status?: string
          subsidiary_irs_reports?: string[] | null
          subsidiary_status?: boolean
          website_url?: string | null
        }
        Update: {
          annual_budget?: number | null
          annual_reports?: string[] | null
          contact?: string | null
          contact_id?: string | null
          contact_role?: string | null
          contact_role_details?: string | null
          created_at?: string
          ein?: string | null
          exec_director_name?: string | null
          flag_level?: number
          form_990_source?: string | null
          generated_citations_report_1?: string[] | null
          generated_citations_report_2?: string[] | null
          generated_report_1?: string | null
          generated_report_2?: string | null
          hq_city?: string | null
          hq_country?: string | null
          hq_state?: string | null
          irs_reports?: string[] | null
          leader_or_representative_user_id?: string | null
          location_served?: string[] | null
          logo_url?: string | null
          ministry_id?: string
          ministry_name?: string
          ministry_type?: string | null
          mission?: string | null
          model_name?: string | null
          NRM_1_version?: string | null
          NRM_2_version?: string | null
          people_groups_served?: string[] | null
          questionnaire?: string | null
          slug?: string | null
          status?: string
          subsidiary_irs_reports?: string[] | null
          subsidiary_status?: boolean
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ministries_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ministries_leader_or_representative_user_id_fkey"
            columns: ["leader_or_representative_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "ministries_questionnaire_fkey"
            columns: ["questionnaire"]
            isOneToOne: false
            referencedRelation: "ministry_questionnaires"
            referencedColumns: ["questionnaire_id"]
          },
        ]
      }
      ministry_newsletters: {
        Row: {
          content: string | null
          ministry_id: string
          newsletter_id: string
          pulled_at: string
          source_url: string | null
        }
        Insert: {
          content?: string | null
          ministry_id: string
          newsletter_id?: string
          pulled_at?: string
          source_url?: string | null
        }
        Update: {
          content?: string | null
          ministry_id?: string
          newsletter_id?: string
          pulled_at?: string
          source_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ministry_newsletters_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["ministry_id"]
          },
        ]
      }
      ministry_questionnaires: {
        Row: {
          NRM_1_review: string | null
          question_1: string | null
          question_2: string | null
          question_3: string | null
          question_4: string | null
          question_5: string | null
          question_6: string | null
          question_7: string | null
          questionnaire_id: string
        }
        Insert: {
          NRM_1_review?: string | null
          question_1?: string | null
          question_2?: string | null
          question_3?: string | null
          question_4?: string | null
          question_5?: string | null
          question_6?: string | null
          question_7?: string | null
          questionnaire_id?: string
        }
        Update: {
          NRM_1_review?: string | null
          question_1?: string | null
          question_2?: string | null
          question_3?: string | null
          question_4?: string | null
          question_5?: string | null
          question_6?: string | null
          question_7?: string | null
          questionnaire_id?: string
        }
        Relationships: []
      }
      ministry_updates: {
        Row: {
          content: string | null
          image_url: string | null
          ministry_id: string
          posted_by_user_id: string
          published_at: string
          update_id: string
        }
        Insert: {
          content?: string | null
          image_url?: string | null
          ministry_id: string
          posted_by_user_id: string
          published_at?: string
          update_id?: string
        }
        Update: {
          content?: string | null
          image_url?: string | null
          ministry_id?: string
          posted_by_user_id?: string
          published_at?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ministry_updates_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["ministry_id"]
          },
          {
            foreignKeyName: "ministry_updates_posted_by_user_id_fkey"
            columns: ["posted_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      testimonies: {
        Row: {
          flag_level: number
          is_advocate: boolean
          ministry_id: string
          role_type: string | null
          sentiment: string | null
          service_date: string | null
          status: string
          testimony_id: string
          text_content: string | null
          type: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          flag_level?: number
          is_advocate?: boolean
          ministry_id: string
          role_type?: string | null
          sentiment?: string | null
          service_date?: string | null
          status?: string
          testimony_id?: string
          text_content?: string | null
          type: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          flag_level?: number
          is_advocate?: boolean
          ministry_id?: string
          role_type?: string | null
          sentiment?: string | null
          service_date?: string | null
          status?: string
          testimony_id?: string
          text_content?: string | null
          type?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "testimonies_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["ministry_id"]
          },
          {
            foreignKeyName: "testimonies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_agreement_acknowledgments: {
        Row: {
          accepted_at: string
          ack_id: string
          agreement_id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          ack_id?: string
          agreement_id: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          ack_id?: string
          agreement_id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_agreement_acknowledgments_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "member_agreements"
            referencedColumns: ["agreement_id"]
          },
          {
            foreignKeyName: "user_agreement_acknowledgments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_private_details: {
        Row: {
          birth_year: number | null
          home_address: string | null
          mobile_phone: string | null
          spouse_name: string | null
          user_id: string
        }
        Insert: {
          birth_year?: number | null
          home_address?: string | null
          mobile_phone?: string | null
          spouse_name?: string | null
          user_id: string
        }
        Update: {
          birth_year?: number | null
          home_address?: string | null
          mobile_phone?: string | null
          spouse_name?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_private_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          ministry_id: string
          role_id: string
          role_in_ministry: string | null
          role_on_testify: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          ministry_id: string
          role_id?: string
          role_in_ministry?: string | null
          role_on_testify: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          ministry_id?: string
          role_id?: string
          role_in_ministry?: string | null
          role_on_testify?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_ministry_id_fkey"
            columns: ["ministry_id"]
            isOneToOne: false
            referencedRelation: "ministries"
            referencedColumns: ["ministry_id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          bio: string | null
          created_at: string
          email: string
          first_name: string | null
          home_church: string | null
          last_name: string | null
          ministry_interests: string[] | null
          profile_photo_url: string | null
          profile_visibility: string[]
          referral_source: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email: string
          first_name?: string | null
          home_church?: string | null
          last_name?: string | null
          ministry_interests?: string[] | null
          profile_photo_url?: string | null
          profile_visibility?: string[]
          referral_source?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string
          first_name?: string | null
          home_church?: string | null
          last_name?: string | null
          ministry_interests?: string[] | null
          profile_photo_url?: string | null
          profile_visibility?: string[]
          referral_source?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
