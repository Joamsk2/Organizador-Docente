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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_corrections: {
        Row: {
          correction_summary: string | null
          created_at: string | null
          criteria_scores: Json | null
          detected_errors: Json | null
          id: string
          improvement_suggestions: string | null
          status: string | null
          student_feedback: string | null
          submission_id: string
          suggested_grade: number | null
          teacher_notes: string | null
          teacher_override_grade: number | null
          updated_at: string | null
        }
        Insert: {
          correction_summary?: string | null
          created_at?: string | null
          criteria_scores?: Json | null
          detected_errors?: Json | null
          id?: string
          improvement_suggestions?: string | null
          status?: string | null
          student_feedback?: string | null
          submission_id: string
          suggested_grade?: number | null
          teacher_notes?: string | null
          teacher_override_grade?: number | null
          updated_at?: string | null
        }
        Update: {
          correction_summary?: string | null
          created_at?: string | null
          criteria_scores?: Json | null
          detected_errors?: Json | null
          id?: string
          improvement_suggestions?: string | null
          status?: string | null
          student_feedback?: string | null
          submission_id?: string
          suggested_grade?: number | null
          teacher_notes?: string | null
          teacher_override_grade?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_corrections_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "assignment_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_reference_materials: {
        Row: {
          assignment_id: string
          content_text: string | null
          created_at: string | null
          file_url: string | null
          id: string
          material_type: string
          title: string
          topics: string[] | null
        }
        Insert: {
          assignment_id: string
          content_text?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          material_type: string
          title: string
          topics?: string[] | null
        }
        Update: {
          assignment_id?: string
          content_text?: string | null
          created_at?: string | null
          file_url?: string | null
          id?: string
          material_type?: string
          title?: string
          topics?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_reference_materials_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          created_at: string | null
          feedback: string | null
          file_urls: string[] | null
          graded_at: string | null
          id: string
          status: Database["public"]["Enums"]["submission_status"] | null
          student_id: string
          submitted_at: string | null
        }
        Insert: {
          assignment_id: string
          created_at?: string | null
          feedback?: string | null
          file_urls?: string[] | null
          graded_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["submission_status"] | null
          student_id: string
          submitted_at?: string | null
        }
        Update: {
          assignment_id?: string
          created_at?: string | null
          feedback?: string | null
          file_urls?: string[] | null
          graded_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["submission_status"] | null
          student_id?: string
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          attachment_urls: string[] | null
          course_id: string
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          status: Database["public"]["Enums"]["assignment_status"] | null
          title: string
          type: Database["public"]["Enums"]["assignment_type"] | null
          updated_at: string | null
        }
        Insert: {
          attachment_urls?: string[] | null
          course_id: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["assignment_status"] | null
          title: string
          type?: Database["public"]["Enums"]["assignment_type"] | null
          updated_at?: string | null
        }
        Update: {
          attachment_urls?: string[] | null
          course_id?: string
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          status?: Database["public"]["Enums"]["assignment_status"] | null
          title?: string
          type?: Database["public"]["Enums"]["assignment_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          course_id: string
          created_at: string | null
          date: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          date: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          date?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      course_schedules: {
        Row: {
          classroom: string | null
          course_id: string
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          start_time: string
        }
        Insert: {
          classroom?: string | null
          course_id: string
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
        }
        Update: {
          classroom?: string | null
          course_id?: string
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_schedules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_students: {
        Row: {
          course_id: string
          enrolled_at: string | null
          id: string
          status: Database["public"]["Enums"]["enrollment_status"] | null
          student_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["enrollment_status"] | null
          student_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string | null
          id?: string
          status?: Database["public"]["Enums"]["enrollment_status"] | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_students_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          color: string | null
          created_at: string | null
          division: string | null
          id: string
          name: string
          school_id: string
          updated_at: string | null
          year: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          division?: string | null
          id?: string
          name: string
          school_id: string
          updated_at?: string | null
          year?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          division?: string | null
          id?: string
          name?: string
          school_id?: string
          updated_at?: string | null
          year?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      grades: {
        Row: {
          assignment_id: string | null
          category: string
          course_id: string
          created_at: string | null
          id: string
          observations: string | null
          period: Database["public"]["Enums"]["grade_period"]
          student_id: string
          updated_at: string | null
          value: number
        }
        Insert: {
          assignment_id?: string | null
          category?: string
          course_id: string
          created_at?: string | null
          id?: string
          observations?: string | null
          period: Database["public"]["Enums"]["grade_period"]
          student_id: string
          updated_at?: string | null
          value: number
        }
        Update: {
          assignment_id?: string | null
          category?: string
          course_id?: string
          created_at?: string | null
          id?: string
          observations?: string | null
          period?: Database["public"]["Enums"]["grade_period"]
          student_id?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "grades_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grades_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plan_assignments: {
        Row: {
          assignment_id: string
          id: string
          lesson_plan_id: string
        }
        Insert: {
          assignment_id: string
          id?: string
          lesson_plan_id: string
        }
        Update: {
          assignment_id?: string
          id?: string
          lesson_plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plan_assignments_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_plan_assignments_lesson_plan_id_fkey"
            columns: ["lesson_plan_id"]
            isOneToOne: false
            referencedRelation: "lesson_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_plans: {
        Row: {
          attachment_urls: string[] | null
          content: string | null
          course_id: string
          created_at: string | null
          id: string
          title: string
          type: Database["public"]["Enums"]["lesson_plan_type"] | null
          updated_at: string | null
        }
        Insert: {
          attachment_urls?: string[] | null
          content?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          title: string
          type?: Database["public"]["Enums"]["lesson_plan_type"] | null
          updated_at?: string | null
        }
        Update: {
          attachment_urls?: string[] | null
          content?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          title?: string
          type?: Database["public"]["Enums"]["lesson_plan_type"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_plans_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          level: Database["public"]["Enums"]["school_level"] | null
          name: string
          phone: string | null
          shift: Database["public"]["Enums"]["school_shift"] | null
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          level?: Database["public"]["Enums"]["school_level"] | null
          name: string
          phone?: string | null
          shift?: Database["public"]["Enums"]["school_shift"] | null
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          level?: Database["public"]["Enums"]["school_level"] | null
          name?: string
          phone?: string | null
          shift?: Database["public"]["Enums"]["school_shift"] | null
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schools_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      student_observations: {
        Row: {
          content: string
          course_id: string
          created_at: string | null
          date: string
          id: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          content: string
          course_id: string
          created_at?: string | null
          date?: string
          id?: string
          student_id: string
          teacher_id: string
        }
        Update: {
          content?: string
          course_id?: string
          created_at?: string | null
          date?: string
          id?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_observations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_observations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_observations_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      student_performance_snapshots: {
        Row: {
          ai_summary: string | null
          assignments_completed: number | null
          assignments_total: number | null
          attendance_rate: number | null
          average_grade: number | null
          corrections_history: Json | null
          course_id: string
          created_at: string | null
          id: string
          period: string
          risk_level: string | null
          strengths: string[] | null
          student_id: string
          weaknesses: string[] | null
        }
        Insert: {
          ai_summary?: string | null
          assignments_completed?: number | null
          assignments_total?: number | null
          attendance_rate?: number | null
          average_grade?: number | null
          corrections_history?: Json | null
          course_id: string
          created_at?: string | null
          id?: string
          period: string
          risk_level?: string | null
          strengths?: string[] | null
          student_id: string
          weaknesses?: string[] | null
        }
        Update: {
          ai_summary?: string | null
          assignments_completed?: number | null
          assignments_total?: number | null
          attendance_rate?: number | null
          average_grade?: number | null
          corrections_history?: Json | null
          course_id?: string
          created_at?: string | null
          id?: string
          period?: string
          risk_level?: string | null
          strengths?: string[] | null
          student_id?: string
          weaknesses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "student_performance_snapshots_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_performance_snapshots_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string | null
          dni: string | null
          email: string | null
          first_name: string
          id: string
          is_risk_handled: boolean | null
          last_name: string
          notes: string | null
          phone: string | null
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dni?: string | null
          email?: string | null
          first_name: string
          id?: string
          is_risk_handled?: boolean | null
          last_name: string
          notes?: string | null
          phone?: string | null
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dni?: string | null
          email?: string | null
          first_name?: string
          id?: string
          is_risk_handled?: boolean | null
          last_name?: string
          notes?: string | null
          phone?: string | null
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id: string
          preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          preferences?: Json | null
          updated_at?: string | null
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
      assignment_status: "borrador" | "asignado" | "entregado"
      assignment_type:
        | "tp"
        | "evaluacion"
        | "actividad"
        | "exposicion_oral"
        | "autoevaluacion"
        | "investigacion"
      attendance_status: "presente" | "ausente" | "tardanza" | "justificado"
      enrollment_status: "activo" | "inactivo"
      grade_period:
        | "1er_trimestre"
        | "2do_trimestre"
        | "3er_trimestre"
        | "final"
      lesson_plan_type: "anual" | "unidad" | "clase" | "armani"
      school_level: "primaria" | "secundaria" | "terciario" | "universitario"
      school_shift: "mañana" | "tarde" | "noche" | "vespertino"
      submission_status: "pendiente" | "entregado" | "corregido"
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
      assignment_status: ["borrador", "asignado", "entregado"],
      assignment_type: [
        "tp",
        "evaluacion",
        "actividad",
        "exposicion_oral",
        "autoevaluacion",
        "investigacion",
      ],
      attendance_status: ["presente", "ausente", "tardanza", "justificado"],
      enrollment_status: ["activo", "inactivo"],
      grade_period: [
        "1er_trimestre",
        "2do_trimestre",
        "3er_trimestre",
        "final",
      ],
      lesson_plan_type: ["anual", "unidad", "clase", "armani"],
      school_level: ["primaria", "secundaria", "terciario", "universitario"],
      school_shift: ["mañana", "tarde", "noche", "vespertino"],
      submission_status: ["pendiente", "entregado", "corregido"],
    },
  },
} as const

