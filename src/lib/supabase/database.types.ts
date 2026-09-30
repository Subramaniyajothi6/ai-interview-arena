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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_evaluations: {
        Row: {
          answer_id: string
          answer_quality: number
          clarity: number
          communication: number
          completeness: number
          created_at: string
          feedback: string
          id: string
          interview_id: string
          model: string | null
          needs_follow_up: boolean
          problem_solving: number
          question_score: number
          relevance: number
          technical_accuracy: number
          user_id: string
        }
        Insert: {
          answer_id: string
          answer_quality: number
          clarity: number
          communication: number
          completeness: number
          created_at?: string
          feedback: string
          id?: string
          interview_id: string
          model?: string | null
          needs_follow_up?: boolean
          problem_solving: number
          question_score: number
          relevance: number
          technical_accuracy: number
          user_id: string
        }
        Update: {
          answer_id?: string
          answer_quality?: number
          clarity?: number
          communication?: number
          completeness?: number
          created_at?: string
          feedback?: string
          id?: string
          interview_id?: string
          model?: string | null
          needs_follow_up?: boolean
          problem_solving?: number
          question_score?: number
          relevance?: number
          technical_accuracy?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_evaluations_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: true
            referencedRelation: "candidate_answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_evaluations_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_evaluations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          allow_follow_ups: boolean
          allow_voice_answers: boolean
          id: number
          max_follow_ups_per_question: number
          max_resume_mb: number
          questions_per_interview: number
          show_question_scores: boolean
          updated_at: string
        }
        Insert: {
          allow_follow_ups?: boolean
          allow_voice_answers?: boolean
          id?: number
          max_follow_ups_per_question?: number
          max_resume_mb?: number
          questions_per_interview?: number
          show_question_scores?: boolean
          updated_at?: string
        }
        Update: {
          allow_follow_ups?: boolean
          allow_voice_answers?: boolean
          id?: number
          max_follow_ups_per_question?: number
          max_resume_mb?: number
          questions_per_interview?: number
          show_question_scores?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      candidate_answers: {
        Row: {
          answer_text: string
          duration_seconds: number | null
          id: string
          interview_id: string
          mode: Database["public"]["Enums"]["answer_mode"]
          question_id: string
          skipped: boolean
          submitted_at: string
          user_id: string
        }
        Insert: {
          answer_text?: string
          duration_seconds?: number | null
          id?: string
          interview_id: string
          mode?: Database["public"]["Enums"]["answer_mode"]
          question_id: string
          skipped?: boolean
          submitted_at?: string
          user_id: string
        }
        Update: {
          answer_text?: string
          duration_seconds?: number | null
          id?: string
          interview_id?: string
          mode?: Database["public"]["Enums"]["answer_mode"]
          question_id?: string
          skipped?: boolean
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_answers_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "interview_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_skills: {
        Row: {
          created_at: string
          skill_id: number
          source: Database["public"]["Enums"]["skill_source"]
          user_id: string
        }
        Insert: {
          created_at?: string
          skill_id: number
          source?: Database["public"]["Enums"]["skill_source"]
          user_id: string
        }
        Update: {
          created_at?: string
          skill_id?: number
          source?: Database["public"]["Enums"]["skill_source"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      improvement_plans: {
        Row: {
          created_at: string
          id: string
          interview_id: string
          practice_questions: Json
          preparation_tips: string[]
          recommended_topics: Json
          report_id: string
          suggested_projects: Json
          user_id: string
          weeks: Json
        }
        Insert: {
          created_at?: string
          id?: string
          interview_id: string
          practice_questions?: Json
          preparation_tips?: string[]
          recommended_topics?: Json
          report_id: string
          suggested_projects?: Json
          user_id: string
          weeks?: Json
        }
        Update: {
          created_at?: string
          id?: string
          interview_id?: string
          practice_questions?: Json
          preparation_tips?: string[]
          recommended_topics?: Json
          report_id?: string
          suggested_projects?: Json
          user_id?: string
          weeks?: Json
        }
        Relationships: [
          {
            foreignKeyName: "improvement_plans_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_plans_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: true
            referencedRelation: "interview_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "improvement_plans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_questions: {
        Row: {
          bank_question_id: string | null
          created_at: string
          expected_points: string | null
          follow_up_index: number
          id: string
          interview_id: string
          parent_id: string | null
          position: number
          question: string
          skill: string | null
          source: Database["public"]["Enums"]["question_source"]
          user_id: string
        }
        Insert: {
          bank_question_id?: string | null
          created_at?: string
          expected_points?: string | null
          follow_up_index?: number
          id?: string
          interview_id: string
          parent_id?: string | null
          position: number
          question: string
          skill?: string | null
          source: Database["public"]["Enums"]["question_source"]
          user_id: string
        }
        Update: {
          bank_question_id?: string | null
          created_at?: string
          expected_points?: string | null
          follow_up_index?: number
          id?: string
          interview_id?: string
          parent_id?: string | null
          position?: number
          question?: string
          skill?: string | null
          source?: Database["public"]["Enums"]["question_source"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_questions_bank_question_id_fkey"
            columns: ["bank_question_id"]
            isOneToOne: false
            referencedRelation: "question_bank"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_questions_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_questions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "interview_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_reports: {
        Row: {
          answer_quality: number | null
          clarity: number | null
          communication: number | null
          completeness: number | null
          created_at: string
          id: string
          improvements: string[]
          interview_id: string
          overall_score: number
          problem_solving: number | null
          relevance: number | null
          skill_scores: Json
          strengths: string[]
          summary: string | null
          technical_knowledge: number | null
          user_id: string
        }
        Insert: {
          answer_quality?: number | null
          clarity?: number | null
          communication?: number | null
          completeness?: number | null
          created_at?: string
          id?: string
          improvements?: string[]
          interview_id: string
          overall_score: number
          problem_solving?: number | null
          relevance?: number | null
          skill_scores?: Json
          strengths?: string[]
          summary?: string | null
          technical_knowledge?: number | null
          user_id: string
        }
        Update: {
          answer_quality?: number | null
          clarity?: number | null
          communication?: number | null
          completeness?: number | null
          created_at?: string
          id?: string
          improvements?: string[]
          interview_id?: string
          overall_score?: number
          problem_solving?: number | null
          relevance?: number | null
          skill_scores?: Json
          strengths?: string[]
          summary?: string | null
          technical_knowledge?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_reports_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: true
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          created_at: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          ended_at: string | null
          experience_level: Database["public"]["Enums"]["experience_level"]
          id: string
          interview_type: Database["public"]["Enums"]["interview_type"]
          job_role: Database["public"]["Enums"]["job_role"]
          overall_score: number | null
          question_count: number
          resume_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["interview_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty: Database["public"]["Enums"]["difficulty"]
          ended_at?: string | null
          experience_level: Database["public"]["Enums"]["experience_level"]
          id?: string
          interview_type: Database["public"]["Enums"]["interview_type"]
          job_role: Database["public"]["Enums"]["job_role"]
          overall_score?: number | null
          question_count?: number
          resume_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["interview_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: Database["public"]["Enums"]["difficulty"]
          ended_at?: string | null
          experience_level?: Database["public"]["Enums"]["experience_level"]
          id?: string
          interview_type?: Database["public"]["Enums"]["interview_type"]
          job_role?: Database["public"]["Enums"]["job_role"]
          overall_score?: number | null
          question_count?: number
          resume_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["interview_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          education: string | null
          email: string
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          experience_summary: string | null
          full_name: string
          id: string
          last_active_at: string | null
          phone: string | null
          preferred_role: Database["public"]["Enums"]["job_role"] | null
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["account_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          education?: string | null
          email: string
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          experience_summary?: string | null
          full_name?: string
          id: string
          last_active_at?: string | null
          phone?: string | null
          preferred_role?: Database["public"]["Enums"]["job_role"] | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          education?: string | null
          email?: string
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          experience_summary?: string | null
          full_name?: string
          id?: string
          last_active_at?: string | null
          phone?: string | null
          preferred_role?: Database["public"]["Enums"]["job_role"] | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["account_status"]
          updated_at?: string
        }
        Relationships: []
      }
      question_bank: {
        Row: {
          created_at: string
          created_by: string | null
          difficulty: Database["public"]["Enums"]["difficulty"]
          expected_answer: string
          id: string
          interview_type: Database["public"]["Enums"]["interview_type"]
          is_active: boolean
          job_role: Database["public"]["Enums"]["job_role"] | null
          question: string
          skill: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          difficulty: Database["public"]["Enums"]["difficulty"]
          expected_answer: string
          id?: string
          interview_type: Database["public"]["Enums"]["interview_type"]
          is_active?: boolean
          job_role?: Database["public"]["Enums"]["job_role"] | null
          question: string
          skill: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty"]
          expected_answer?: string
          id?: string
          interview_type?: Database["public"]["Enums"]["interview_type"]
          is_active?: boolean
          job_role?: Database["public"]["Enums"]["job_role"] | null
          question?: string
          skill?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_bank_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_bank_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          created_at: string
          error: string | null
          file_name: string
          file_size: number
          file_type: string
          id: string
          parsed: Json | null
          raw_text: string | null
          status: Database["public"]["Enums"]["resume_status"]
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          file_name: string
          file_size: number
          file_type: string
          id?: string
          parsed?: Json | null
          raw_text?: string | null
          status?: Database["public"]["Enums"]["resume_status"]
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          id?: string
          parsed?: Json | null
          raw_text?: string | null
          status?: Database["public"]["Enums"]["resume_status"]
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resumes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "candidate_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resumes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          category: string | null
          created_at: string
          id: number
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: never
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: never
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      candidate_profiles: {
        Row: {
          created_at: string | null
          education: string | null
          email: string | null
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          experience_summary: string | null
          full_name: string | null
          id: string | null
          last_active_at: string | null
          latest_resume_id: string | null
          phone: string | null
          preferred_role: Database["public"]["Enums"]["job_role"] | null
          skills: string[] | null
          status: Database["public"]["Enums"]["account_status"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      account_status: "active" | "disabled"
      answer_mode: "text" | "voice"
      difficulty: "easy" | "medium" | "hard" | "expert"
      experience_level: "fresher" | "0-1" | "1-3" | "3-5" | "5+"
      interview_status:
        | "setup"
        | "ready"
        | "in_progress"
        | "completed"
        | "abandoned"
      interview_type: "technical" | "hr" | "behavioral" | "managerial" | "mixed"
      job_role:
        | "Full Stack Developer"
        | "Frontend Developer"
        | "Backend Developer"
        | "Data Analyst"
        | "Data Scientist"
        | "AI/ML Engineer"
        | "Digital Marketing Executive"
        | "HR Executive"
        | "Business Development Executive"
      question_source: "ai" | "bank" | "follow_up" | "resume"
      resume_status: "uploaded" | "analyzed" | "failed"
      skill_source: "resume" | "manual"
      user_role: "candidate" | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_status: ["active", "disabled"],
      answer_mode: ["text", "voice"],
      difficulty: ["easy", "medium", "hard", "expert"],
      experience_level: ["fresher", "0-1", "1-3", "3-5", "5+"],
      interview_status: [
        "setup",
        "ready",
        "in_progress",
        "completed",
        "abandoned",
      ],
      interview_type: ["technical", "hr", "behavioral", "managerial", "mixed"],
      job_role: [
        "Full Stack Developer",
        "Frontend Developer",
        "Backend Developer",
        "Data Analyst",
        "Data Scientist",
        "AI/ML Engineer",
        "Digital Marketing Executive",
        "HR Executive",
        "Business Development Executive",
      ],
      question_source: ["ai", "bank", "follow_up", "resume"],
      resume_status: ["uploaded", "analyzed", "failed"],
      skill_source: ["resume", "manual"],
      user_role: ["candidate", "admin"],
    },
  },
} as const
