export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      academic_calendar_events: {
        Row: {
          affects_classes: boolean | null
          color: string | null
          created_at: string | null
          description: string | null
          end_date: string
          event_type: string
          id: string
          institution_id: string | null
          start_date: string
          title: string
        }
        Insert: {
          affects_classes?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_date: string
          event_type: string
          id?: string
          institution_id?: string | null
          start_date: string
          title: string
        }
        Update: {
          affects_classes?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_date?: string
          event_type?: string
          id?: string
          institution_id?: string | null
          start_date?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "academic_calendar_events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_documents: {
        Row: {
          application_id: string
          document_name: string
          feedback: string | null
          file_url: string
          id: string
          reviewed_at: string | null
          status: string
          student_id: string | null
        }
        Insert: {
          application_id: string
          document_name: string
          feedback?: string | null
          file_url: string
          id?: string
          reviewed_at?: string | null
          status?: string
          student_id?: string | null
        }
        Update: {
          application_id?: string
          document_name?: string
          feedback?: string | null
          file_url?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "admissions_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_documents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_documents_v2: {
        Row: {
          application_id: string
          created_at: string
          created_by: string
          document_type: string
          id: string
          institution_id: string
          rendered_html: string | null
          source_data: Json
          status: string
          storage_bucket: string | null
          storage_path: string | null
          student_id: string | null
          template_id: string | null
          version: number
        }
        Insert: {
          application_id: string
          created_at?: string
          created_by: string
          document_type: string
          id?: string
          institution_id: string
          rendered_html?: string | null
          source_data?: Json
          status?: string
          storage_bucket?: string | null
          storage_path?: string | null
          student_id?: string | null
          template_id?: string | null
          version: number
        }
        Update: {
          application_id?: string
          created_at?: string
          created_by?: string
          document_type?: string
          id?: string
          institution_id?: string
          rendered_html?: string | null
          source_data?: Json
          status?: string
          storage_bucket?: string | null
          storage_path?: string | null
          student_id?: string | null
          template_id?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "admission_documents_v2_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "admissions_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_documents_v2_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_documents_v2_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_documents_v2_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_documents_v2_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "admission_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_fee_configurations: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          id: string
          institution_id: string
          intake_id: string
          is_active: boolean
          program_id: string
          version: number
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          institution_id: string
          intake_id: string
          is_active?: boolean
          program_id: string
          version?: number
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          institution_id?: string
          intake_id?: string
          is_active?: boolean
          program_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "admission_fee_configurations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_fee_configurations_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_fee_configurations_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_fee_configurations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_status_history: {
        Row: {
          actor_id: string
          application_id: string
          created_at: string
          id: string
          institution_id: string
          new_status: string
          prior_status: string | null
          reason: string | null
        }
        Insert: {
          actor_id: string
          application_id: string
          created_at?: string
          id?: string
          institution_id: string
          new_status: string
          prior_status?: string | null
          reason?: string | null
        }
        Update: {
          actor_id?: string
          application_id?: string
          created_at?: string
          id?: string
          institution_id?: string
          new_status?: string
          prior_status?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admission_status_history_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "admissions_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_status_history_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_templates: {
        Row: {
          body: string
          created_at: string
          created_by: string | null
          document_type: string
          id: string
          institution_id: string
          is_active: boolean
          merge_fields: string[]
          name: string
          version: number
        }
        Insert: {
          body: string
          created_at?: string
          created_by?: string | null
          document_type: string
          id?: string
          institution_id: string
          is_active?: boolean
          merge_fields?: string[]
          name: string
          version: number
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string | null
          document_type?: string
          id?: string
          institution_id?: string
          is_active?: boolean
          merge_fields?: string[]
          name?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "admission_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_templates_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      admissions_applications: {
        Row: {
          address: string | null
          application_data: Json | null
          country_of_birth: string | null
          course_end_date: string | null
          course_start_date: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string
          english_evidence: string | null
          fee_configuration_id: string | null
          first_name: string
          gender: string | null
          id: string
          institution_id: string
          intake_id: string | null
          last_name: string
          nationality: string | null
          passport_expiry: string | null
          passport_number: string | null
          phone: string | null
          program_id: string | null
          reference_number: string | null
          status: string
          student_id: string | null
          updated_at: string
          usi: string | null
          visa_expiry: string | null
          visa_type: string | null
        }
        Insert: {
          address?: string | null
          application_data?: Json | null
          country_of_birth?: string | null
          course_end_date?: string | null
          course_start_date?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email: string
          english_evidence?: string | null
          fee_configuration_id?: string | null
          first_name: string
          gender?: string | null
          id?: string
          institution_id: string
          intake_id?: string | null
          last_name: string
          nationality?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          program_id?: string | null
          reference_number?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
          usi?: string | null
          visa_expiry?: string | null
          visa_type?: string | null
        }
        Update: {
          address?: string | null
          application_data?: Json | null
          country_of_birth?: string | null
          course_end_date?: string | null
          course_start_date?: string | null
          created_at?: string | null
          date_of_birth?: string | null
          email?: string
          english_evidence?: string | null
          fee_configuration_id?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          institution_id?: string
          intake_id?: string | null
          last_name?: string
          nationality?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          phone?: string | null
          program_id?: string | null
          reference_number?: string | null
          status?: string
          student_id?: string | null
          updated_at?: string
          usi?: string | null
          visa_expiry?: string | null
          visa_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admissions_applications_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_applications_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_applications_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_replies: {
        Row: {
          author_id: string
          author_role: string
          created_at: string | null
          id: string
          message: string
          post_id: string
        }
        Insert: {
          author_id: string
          author_role: string
          created_at?: string | null
          id?: string
          message: string
          post_id: string
        }
        Update: {
          author_id?: string
          author_role?: string
          created_at?: string | null
          id?: string
          message?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_replies_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "subject_announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          institution_id: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          institution_id?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          institution_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          id: string
          job_post_id: string | null
          resume_url: string | null
          status: string | null
          student_id: string | null
        }
        Insert: {
          id?: string
          job_post_id?: string | null
          resume_url?: string | null
          status?: string | null
          student_id?: string | null
        }
        Update: {
          id?: string
          job_post_id?: string | null
          resume_url?: string | null
          status?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_post_id_fkey"
            columns: ["job_post_id"]
            isOneToOne: false
            referencedRelation: "job_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          created_at: string | null
          description: string | null
          due_date: string | null
          faculty_id: string | null
          files: string[] | null
          id: string
          language: string | null
          max_score: number | null
          questions: Json | null
          section_ids: string[] | null
          subject_id: string | null
          test_cases: Json | null
          title: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          faculty_id?: string | null
          files?: string[] | null
          id?: string
          language?: string | null
          max_score?: number | null
          questions?: Json | null
          section_ids?: string[] | null
          subject_id?: string | null
          test_cases?: Json | null
          title: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          faculty_id?: string | null
          files?: string[] | null
          id?: string
          language?: string | null
          max_score?: number | null
          questions?: Json | null
          section_ids?: string[] | null
          subject_id?: string | null
          test_cases?: Json | null
          title?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_feedback: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          message_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          message_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          message_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "assistant_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_message_sources: {
        Row: {
          chunk_index: number | null
          created_at: string
          document_id: string | null
          href: string | null
          id: string
          message_id: string
          score: number | null
          snippet: string | null
          source_type: string
          title: string
        }
        Insert: {
          chunk_index?: number | null
          created_at?: string
          document_id?: string | null
          href?: string | null
          id?: string
          message_id: string
          score?: number | null
          snippet?: string | null
          source_type: string
          title: string
        }
        Update: {
          chunk_index?: number | null
          created_at?: string
          document_id?: string | null
          href?: string | null
          id?: string
          message_id?: string
          score?: number | null
          snippet?: string | null
          source_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_message_sources_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "assistant_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_messages: {
        Row: {
          client_turn_id: string | null
          content: string
          created_at: string
          id: string
          message: Json
          role: string
          thread_id: string
        }
        Insert: {
          client_turn_id?: string | null
          content?: string
          created_at?: string
          id: string
          message: Json
          role: string
          thread_id: string
        }
        Update: {
          client_turn_id?: string | null
          content?: string
          created_at?: string
          id?: string
          message?: Json
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "assistant_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_threads: {
        Row: {
          actor_user_id: string
          created_at: string
          department_id: string | null
          id: string
          institution_id: string | null
          organization_id: string | null
          role: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          department_id?: string | null
          id?: string
          institution_id?: string | null
          organization_id?: string | null
          role: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          department_id?: string | null
          id?: string
          institution_id?: string | null
          organization_id?: string | null
          role?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_threads_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_threads_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_threads_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_threads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_threads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      assistant_tool_runs: {
        Row: {
          created_at: string
          id: string
          input_metadata: Json
          latency_ms: number | null
          message_id: string | null
          output_metadata: Json
          status: string
          thread_id: string
          tool_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          input_metadata?: Json
          latency_ms?: number | null
          message_id?: string | null
          output_metadata?: Json
          status: string
          thread_id: string
          tool_name: string
        }
        Update: {
          created_at?: string
          id?: string
          input_metadata?: Json
          latency_ms?: number | null
          message_id?: string | null
          output_metadata?: Json
          status?: string
          thread_id?: string
          tool_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_tool_runs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "assistant_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_tool_runs_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "assistant_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          id: string
          notes: string | null
          session_id: string | null
          status: string
          student_id: string | null
        }
        Insert: {
          id?: string
          notes?: string | null
          session_id?: string | null
          status: string
          student_id?: string | null
        }
        Update: {
          id?: string
          notes?: string | null
          session_id?: string | null
          status?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "attendance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_sessions: {
        Row: {
          attendance_date: string
          faculty_id: string | null
          id: string
          period: number
          section_id: string | null
          session_notes: string | null
          subject_id: string | null
        }
        Insert: {
          attendance_date: string
          faculty_id?: string | null
          id?: string
          period: number
          section_id?: string | null
          session_notes?: string | null
          subject_id?: string | null
        }
        Update: {
          attendance_date?: string
          faculty_id?: string | null
          id?: string
          period?: number
          section_id?: string | null
          session_notes?: string | null
          subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_sessions_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_warning_letters: {
        Row: {
          attendance_percentage: number
          id: string
          institution_id: string
          intervention_date: string | null
          issued_at: string | null
          issued_by: string | null
          missed_sessions: number | null
          rendered_letter_html: string
          status: string | null
          student_id: string
          total_sessions: number | null
          warning_level: string
        }
        Insert: {
          attendance_percentage: number
          id?: string
          institution_id: string
          intervention_date?: string | null
          issued_at?: string | null
          issued_by?: string | null
          missed_sessions?: number | null
          rendered_letter_html: string
          status?: string | null
          student_id: string
          total_sessions?: number | null
          warning_level: string
        }
        Update: {
          attendance_percentage?: number
          id?: string
          institution_id?: string
          intervention_date?: string | null
          issued_at?: string | null
          issued_by?: string | null
          missed_sessions?: number | null
          rendered_letter_html?: string
          status?: string | null
          student_id?: string
          total_sessions?: number | null
          warning_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_warning_letters_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_warning_letters_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_warning_letters_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          description: string | null
          id: string
          institution_id: string | null
          name: string
          website: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          institution_id?: string | null
          name: string
          website?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          institution_id?: string | null
          name?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          status: string | null
          student_id: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          student_id?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          status?: string | null
          student_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          id: string
          institution_id: string | null
          name: string | null
        }
        Insert: {
          id?: string
          institution_id?: string | null
          name?: string | null
        }
        Update: {
          id?: string
          institution_id?: string | null
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      education_agents: {
        Row: {
          created_at: string
          email: string | null
          id: string
          institution_id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          institution_id: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          institution_id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_agents_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      enrolment_timetable_slots: {
        Row: {
          assigned_at: string
          assigned_by: string
          enrolment_id: string
          enrolment_unit_id: string
          id: string
          timetable_slot_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          enrolment_id: string
          enrolment_unit_id: string
          id?: string
          timetable_slot_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          enrolment_id?: string
          enrolment_unit_id?: string
          id?: string
          timetable_slot_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrolment_timetable_slots_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrolment_timetable_slots_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "enrolments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrolment_timetable_slots_enrolment_unit_id_fkey"
            columns: ["enrolment_unit_id"]
            isOneToOne: false
            referencedRelation: "enrolment_units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrolment_timetable_slots_timetable_slot_id_fkey"
            columns: ["timetable_slot_id"]
            isOneToOne: false
            referencedRelation: "timetable_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      enrolment_units: {
        Row: {
          created_at: string
          enrolment_id: string
          id: string
          planned_end: string
          planned_start: string
          status: string
          subject_id: string
          trainer_id: string | null
        }
        Insert: {
          created_at?: string
          enrolment_id: string
          id?: string
          planned_end: string
          planned_start: string
          status?: string
          subject_id: string
          trainer_id?: string | null
        }
        Update: {
          created_at?: string
          enrolment_id?: string
          id?: string
          planned_end?: string
          planned_start?: string
          status?: string
          subject_id?: string
          trainer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrolment_units_enrolment_id_fkey"
            columns: ["enrolment_id"]
            isOneToOne: false
            referencedRelation: "enrolments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrolment_units_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrolment_units_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      enrolments: {
        Row: {
          created_at: string | null
          ended_at: string | null
          id: string
          institution_id: string
          intake_id: string | null
          program_id: string
          section_id: string | null
          source_application_id: string | null
          started_at: string
          status: string
          student_id: string
          trainer_id: string | null
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          institution_id: string
          intake_id?: string | null
          program_id: string
          section_id?: string | null
          source_application_id?: string | null
          started_at?: string
          status?: string
          student_id: string
          trainer_id?: string | null
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          id?: string
          institution_id?: string
          intake_id?: string | null
          program_id?: string
          section_id?: string | null
          source_application_id?: string | null
          started_at?: string
          status?: string
          student_id?: string
          trainer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrolments_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrolments_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrolments_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrolments_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrolments_source_application_id_fkey"
            columns: ["source_application_id"]
            isOneToOne: false
            referencedRelation: "admissions_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrolments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrolments_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          event_id: string | null
          id: string
          registered_at: string | null
          user_id: string | null
        }
        Insert: {
          event_id?: string | null
          id?: string
          registered_at?: string | null
          user_id?: string | null
        }
        Update: {
          event_id?: string | null
          id?: string
          registered_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          event_date: string | null
          gallery_images: Json | null
          id: string
          image_url: string | null
          institution_id: string | null
          title: string
          venue: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          gallery_images?: Json | null
          id?: string
          image_url?: string | null
          institution_id?: string | null
          title: string
          venue?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          gallery_images?: Json | null
          id?: string
          image_url?: string | null
          institution_id?: string | null
          title?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_subjects: {
        Row: {
          academic_year: string | null
          created_at: string | null
          faculty_id: string
          id: string
          institution_id: string
          section_id: string | null
          semester: number | null
          subject_id: string
        }
        Insert: {
          academic_year?: string | null
          created_at?: string | null
          faculty_id: string
          id?: string
          institution_id: string
          section_id?: string | null
          semester?: number | null
          subject_id: string
        }
        Update: {
          academic_year?: string | null
          created_at?: string | null
          faculty_id?: string
          id?: string
          institution_id?: string
          section_id?: string | null
          semester?: number | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "faculty_subjects_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_subjects_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_subjects_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          bucket: string
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          file_url: string
          id: string
          institution_id: string | null
          module: string
          organization_id: string
          size_bytes: number
          uploaded_by: string | null
        }
        Insert: {
          bucket: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          file_url: string
          id?: string
          institution_id?: string | null
          module: string
          organization_id: string
          size_bytes?: number
          uploaded_by?: string | null
        }
        Update: {
          bucket?: string
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          file_url?: string
          id?: string
          institution_id?: string | null
          module?: string
          organization_id?: string
          size_bytes?: number
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "files_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_columns: {
        Row: {
          created_at: string
          created_by: string
          display_order: number
          id: string
          is_active: boolean
          max_score: number
          subject_id: string
          title: string
          type: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          created_by: string
          display_order?: number
          id?: string
          is_active?: boolean
          max_score?: number
          subject_id: string
          title: string
          type?: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          created_by?: string
          display_order?: number
          id?: string
          is_active?: boolean
          max_score?: number
          subject_id?: string
          title?: string
          type?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "grade_columns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_columns_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      grade_entries: {
        Row: {
          column_id: string
          created_at: string
          feedback: string | null
          graded_at: string | null
          graded_by: string | null
          id: string
          score: number | null
          student_id: string
          updated_at: string
        }
        Insert: {
          column_id: string
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          student_id: string
          updated_at?: string
        }
        Update: {
          column_id?: string
          created_at?: string
          feedback?: string | null
          graded_at?: string | null
          graded_by?: string | null
          id?: string
          score?: number | null
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grade_entries_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "grade_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_entries_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grade_entries_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string | null
          id: string
          student_id: string | null
        }
        Insert: {
          group_id?: string | null
          id?: string
          student_id?: string | null
        }
        Update: {
          group_id?: string | null
          id?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "project_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      institution_timetable_settings: {
        Row: {
          created_at: string | null
          end_time: string
          institution_id: string
          number_of_periods: number
          period_duration_minutes: number
          period_timings: Json
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_time?: string
          institution_id: string
          number_of_periods?: number
          period_duration_minutes?: number
          period_timings?: Json
          start_time?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_time?: string
          institution_id?: string
          number_of_periods?: number
          period_duration_minutes?: number
          period_timings?: Json
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "institution_timetable_settings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: true
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      institutions: {
        Row: {
          academic_time_zone: string | null
          domain: string | null
          id: string
          name: string | null
          organization_id: string
        }
        Insert: {
          academic_time_zone?: string | null
          domain?: string | null
          id?: string
          name?: string | null
          organization_id: string
        }
        Update: {
          academic_time_zone?: string | null
          domain?: string | null
          id?: string
          name?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "institutions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      intakes: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          institution_id: string
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          institution_id: string
          name: string
          start_date: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          institution_id?: string
          name?: string
          start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "intakes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_due: number
          created_at: string | null
          due_date: string
          id: string
          installment_no: number | null
          payment_plan_id: string
          source_application_id: string | null
          status: string
        }
        Insert: {
          amount_due: number
          created_at?: string | null
          due_date: string
          id?: string
          installment_no?: number | null
          payment_plan_id: string
          source_application_id?: string | null
          status?: string
        }
        Update: {
          amount_due?: number
          created_at?: string | null
          due_date?: string
          id?: string
          installment_no?: number | null
          payment_plan_id?: string
          source_application_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_payment_plan_id_fkey"
            columns: ["payment_plan_id"]
            isOneToOne: false
            referencedRelation: "payment_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_source_application_id_fkey"
            columns: ["source_application_id"]
            isOneToOne: false
            referencedRelation: "admissions_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      job_posts: {
        Row: {
          company_id: string | null
          deadline: string | null
          description: string | null
          id: string
          institution_id: string | null
          title: string
        }
        Insert: {
          company_id?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          institution_id?: string | null
          title: string
        }
        Update: {
          company_id?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          institution_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_posts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_chunks: {
        Row: {
          allowed_roles: string[]
          chunk_index: number
          content: string
          created_at: string
          department_id: string | null
          document_id: string
          document_version: number
          embedding: string | null
          id: string
          institution_id: string | null
          organization_id: string | null
          owner_id: string | null
          section_id: string | null
          subject_id: string | null
          visibility: string
        }
        Insert: {
          allowed_roles?: string[]
          chunk_index: number
          content: string
          created_at?: string
          department_id?: string | null
          document_id: string
          document_version: number
          embedding?: string | null
          id?: string
          institution_id?: string | null
          organization_id?: string | null
          owner_id?: string | null
          section_id?: string | null
          subject_id?: string | null
          visibility: string
        }
        Update: {
          allowed_roles?: string[]
          chunk_index?: number
          content?: string
          created_at?: string
          department_id?: string | null
          document_id?: string
          document_version?: number
          embedding?: string | null
          id?: string
          institution_id?: string | null
          organization_id?: string | null
          owner_id?: string | null
          section_id?: string | null
          subject_id?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          allowed_roles: string[]
          content_hash: string | null
          created_at: string
          department_id: string | null
          document_version: number
          embedding_dimensions: number | null
          embedding_model: string | null
          embedding_profile: string | null
          embedding_provider: string | null
          embedding_revision: string | null
          failure_reason: string | null
          id: string
          institution_id: string | null
          mime_type: string | null
          organization_id: string | null
          original_filename: string
          owner_id: string | null
          section_id: string | null
          source_id: string | null
          source_type: string
          status: string
          storage_bucket: string
          storage_path: string | null
          subject_id: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          allowed_roles?: string[]
          content_hash?: string | null
          created_at?: string
          department_id?: string | null
          document_version?: number
          embedding_dimensions?: number | null
          embedding_model?: string | null
          embedding_profile?: string | null
          embedding_provider?: string | null
          embedding_revision?: string | null
          failure_reason?: string | null
          id?: string
          institution_id?: string | null
          mime_type?: string | null
          organization_id?: string | null
          original_filename: string
          owner_id?: string | null
          section_id?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          storage_bucket?: string
          storage_path?: string | null
          subject_id?: string | null
          title: string
          updated_at?: string
          visibility: string
        }
        Update: {
          allowed_roles?: string[]
          content_hash?: string | null
          created_at?: string
          department_id?: string | null
          document_version?: number
          embedding_dimensions?: number | null
          embedding_model?: string | null
          embedding_profile?: string | null
          embedding_provider?: string | null
          embedding_revision?: string | null
          failure_reason?: string | null
          id?: string
          institution_id?: string | null
          mime_type?: string | null
          organization_id?: string | null
          original_filename?: string
          owner_id?: string | null
          section_id?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          storage_bucket?: string
          storage_path?: string | null
          subject_id?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_documents_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_documents_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_ingestion_jobs: {
        Row: {
          attempts: number
          available_at: string
          completed_at: string | null
          created_at: string
          document_id: string
          error_message: string | null
          id: string
          lease_expires_at: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          requested_by: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          available_at?: string
          completed_at?: string | null
          created_at?: string
          document_id: string
          error_message?: string | null
          id?: string
          lease_expires_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          requested_by?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          available_at?: string
          completed_at?: string | null
          created_at?: string
          document_id?: string
          error_message?: string | null
          id?: string
          lease_expires_at?: string | null
          locked_at?: string | null
          locked_by?: string | null
          max_attempts?: number
          requested_by?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_ingestion_jobs_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_ingestion_jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_applications: {
        Row: {
          advisor_id: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          from_date: string
          id: string
          institution_id: string | null
          notes: string | null
          reason: string | null
          section_id: string | null
          status: string
          student_id: string
          to_date: string
          updated_at: string | null
        }
        Insert: {
          advisor_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          from_date: string
          id?: string
          institution_id?: string | null
          notes?: string | null
          reason?: string | null
          section_id?: string | null
          status?: string
          student_id: string
          to_date: string
          updated_at?: string | null
        }
        Update: {
          advisor_id?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          from_date?: string
          id?: string
          institution_id?: string | null
          notes?: string | null
          reason?: string | null
          section_id?: string | null
          status?: string
          student_id?: string
          to_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_applications_advisor_id_fkey"
            columns: ["advisor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_applications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_messages: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string
          is_deleted: boolean | null
          meeting_id: string
          message: string
          sender_id: string
          sender_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id: string
          is_deleted?: boolean | null
          meeting_id: string
          message: string
          sender_id: string
          sender_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string
          is_deleted?: boolean | null
          meeting_id?: string
          message?: string
          sender_id?: string
          sender_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_messages_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_messages_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_participants: {
        Row: {
          id: string
          is_present: boolean | null
          joined_at: string | null
          left_at: string | null
          meeting_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_present?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          meeting_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_present?: boolean | null
          joined_at?: string | null
          left_at?: string | null
          meeting_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          created_at: string | null
          ended_at: string | null
          faculty_id: string
          id: string
          institution_id: string
          is_active: boolean | null
          meeting_code: string
          meeting_provider: string
          meeting_type: string
          meeting_url: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          section_id: string | null
          started_at: string | null
          subject_id: string | null
          timetable_slot_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          ended_at?: string | null
          faculty_id: string
          id?: string
          institution_id: string
          is_active?: boolean | null
          meeting_code: string
          meeting_provider?: string
          meeting_type?: string
          meeting_url?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          section_id?: string | null
          started_at?: string | null
          subject_id?: string | null
          timetable_slot_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          ended_at?: string | null
          faculty_id?: string
          id?: string
          institution_id?: string
          is_active?: boolean | null
          meeting_code?: string
          meeting_provider?: string
          meeting_type?: string
          meeting_url?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          section_id?: string | null
          started_at?: string | null
          subject_id?: string | null
          timetable_slot_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_timetable_slot_id_fkey"
            columns: ["timetable_slot_id"]
            isOneToOne: false
            referencedRelation: "timetable_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          category: string
          email_enabled: boolean
          id: string
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          email_enabled?: boolean
          id?: string
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          email_enabled?: boolean
          id?: string
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_letters: {
        Row: {
          acceptance_actor_id: string | null
          acceptance_reference: string | null
          agreement_document_id: string | null
          application_id: string
          course_fees: number
          created_at: string | null
          currency: string
          id: string
          rendered_html: string | null
          signature_url: string | null
          signed_at: string | null
          status: string
          template_id: string | null
          term_start: string
          version: number
        }
        Insert: {
          acceptance_actor_id?: string | null
          acceptance_reference?: string | null
          agreement_document_id?: string | null
          application_id: string
          course_fees?: number
          created_at?: string | null
          currency?: string
          id?: string
          rendered_html?: string | null
          signature_url?: string | null
          signed_at?: string | null
          status?: string
          template_id?: string | null
          term_start: string
          version?: number
        }
        Update: {
          acceptance_actor_id?: string | null
          acceptance_reference?: string | null
          agreement_document_id?: string | null
          application_id?: string
          course_fees?: number
          created_at?: string | null
          currency?: string
          id?: string
          rendered_html?: string | null
          signature_url?: string | null
          signed_at?: string | null
          status?: string
          template_id?: string | null
          term_start?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "offer_letters_acceptance_actor_id_fkey"
            columns: ["acceptance_actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_letters_agreement_document_id_fkey"
            columns: ["agreement_document_id"]
            isOneToOne: false
            referencedRelation: "admission_documents_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_letters_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "admissions_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_letters_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "admission_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      online_session_participants: {
        Row: {
          id: string
          joined_at: string | null
          left_at: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          left_at?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          left_at?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "online_session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "online_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_session_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      online_sessions: {
        Row: {
          created_at: string | null
          description: string | null
          end_time: string | null
          host_id: string | null
          id: string
          institution_id: string | null
          session_link: string
          start_time: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          host_id?: string | null
          id?: string
          institution_id?: string | null
          session_link: string
          start_time: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          host_id?: string | null
          id?: string
          institution_id?: string | null
          session_link?: string
          start_time?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "online_sessions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_sessions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          features: string[] | null
          id: string
          name: string
          org_type: string
        }
        Insert: {
          created_at?: string | null
          features?: string[] | null
          id?: string
          name: string
          org_type?: string
        }
        Update: {
          created_at?: string | null
          features?: string[] | null
          id?: string
          name?: string
          org_type?: string
        }
        Relationships: []
      }
      parent_student_relations: {
        Row: {
          id: string
          parent_id: string | null
          relationship: string | null
          student_id: string | null
        }
        Insert: {
          id?: string
          parent_id?: string | null
          relationship?: string | null
          student_id?: string | null
        }
        Update: {
          id?: string
          parent_id?: string | null
          relationship?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_relations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_relations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plans: {
        Row: {
          created_at: string | null
          id: string
          institution_id: string
          source_application_id: string | null
          student_id: string
          total_amount: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          institution_id: string
          source_application_id?: string | null
          student_id: string
          total_amount?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          institution_id?: string
          source_application_id?: string | null
          student_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_plans_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_source_application_id_fkey"
            columns: ["source_application_id"]
            isOneToOne: false
            referencedRelation: "admissions_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_paid: number
          id: string
          invoice_id: string
          paid_at: string | null
          payment_method: string
          reference_no: string | null
        }
        Insert: {
          amount_paid: number
          id?: string
          invoice_id: string
          paid_at?: string | null
          payment_method: string
          reference_no?: string | null
        }
        Update: {
          amount_paid?: number
          id?: string
          invoice_id?: string
          paid_at?: string | null
          payment_method?: string
          reference_no?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      periods: {
        Row: {
          end_time: string
          id: string
          institution_id: string | null
          period_number: number
          start_time: string
        }
        Insert: {
          end_time: string
          id?: string
          institution_id?: string | null
          period_number: number
          start_time: string
        }
        Update: {
          end_time?: string
          id?: string
          institution_id?: string | null
          period_number?: number
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "periods_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          description: string | null
          id: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          department_id: string | null
          id: string
          institution_id: string | null
          name: string
          organization_id: string | null
        }
        Insert: {
          department_id?: string | null
          id?: string
          institution_id?: string | null
          name: string
          organization_id?: string | null
        }
        Update: {
          department_id?: string | null
          id?: string
          institution_id?: string | null
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_groups: {
        Row: {
          group_name: string
          id: string
          project_id: string | null
        }
        Insert: {
          group_name: string
          id?: string
          project_id?: string | null
        }
        Update: {
          group_name?: string
          id?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          faculty_id: string | null
          id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          faculty_id?: string | null
          id?: string
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          faculty_id?: string | null
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          faculty_id: string | null
          file_url: string
          id: string
          subject_id: string | null
          title: string
          uploaded_at: string | null
        }
        Insert: {
          faculty_id?: string | null
          file_url: string
          id?: string
          subject_id?: string | null
          title: string
          uploaded_at?: string | null
        }
        Update: {
          faculty_id?: string | null
          file_url?: string
          id?: string
          subject_id?: string | null
          title?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          faculty_advisor_id: string | null
          id: string
          institution_id: string | null
          name: string
          program_id: string | null
          semester: number
        }
        Insert: {
          faculty_advisor_id?: string | null
          id?: string
          institution_id?: string | null
          name: string
          program_id?: string | null
          semester: number
        }
        Update: {
          faculty_advisor_id?: string | null
          id?: string
          institution_id?: string | null
          name?: string
          program_id?: string | null
          semester?: number
        }
        Relationships: [
          {
            foreignKeyName: "sections_faculty_advisor_id_fkey"
            columns: ["faculty_advisor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          employee_id: string | null
          id: string
          institution_id: string
        }
        Insert: {
          employee_id?: string | null
          id: string
          institution_id: string
        }
        Update: {
          employee_id?: string | null
          id?: string
          institution_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      student_addresses: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          country: string
          created_at: string
          id: string
          institution_id: string
          is_current: boolean
          locality: string
          postal_code: string
          state_province: string | null
          student_id: string
          type: string
          updated_at: string
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          country: string
          created_at?: string
          id?: string
          institution_id: string
          is_current?: boolean
          locality: string
          postal_code: string
          state_province?: string | null
          student_id: string
          type: string
          updated_at?: string
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          country?: string
          created_at?: string
          id?: string
          institution_id?: string
          is_current?: boolean
          locality?: string
          postal_code?: string
          state_province?: string | null
          student_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_addresses_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_addresses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_communications: {
        Row: {
          actor_id: string
          archived_at: string | null
          channel: string
          id: string
          institution_id: string
          occurred_at: string
          student_id: string
          summary: string
        }
        Insert: {
          actor_id: string
          archived_at?: string | null
          channel: string
          id?: string
          institution_id: string
          occurred_at?: string
          student_id: string
          summary: string
        }
        Update: {
          actor_id?: string
          archived_at?: string | null
          channel?: string
          id?: string
          institution_id?: string
          occurred_at?: string
          student_id?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_communications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_communications_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_communications_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_documents: {
        Row: {
          application_document_id: string | null
          application_id: string | null
          archived_at: string | null
          category: string
          checksum_sha256: string | null
          created_at: string
          id: string
          institution_id: string
          mime_type: string
          original_filename: string
          review_feedback: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number
          status: string
          storage_bucket: string
          storage_path: string
          student_id: string
          superseded_at: string | null
          superseded_by: string | null
          title: string
          updated_at: string
          uploaded_by: string
          version: number
        }
        Insert: {
          application_document_id?: string | null
          application_id?: string | null
          archived_at?: string | null
          category: string
          checksum_sha256?: string | null
          created_at?: string
          id?: string
          institution_id: string
          mime_type: string
          original_filename: string
          review_feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes: number
          status?: string
          storage_bucket: string
          storage_path: string
          student_id: string
          superseded_at?: string | null
          superseded_by?: string | null
          title: string
          updated_at?: string
          uploaded_by: string
          version?: number
        }
        Update: {
          application_document_id?: string | null
          application_id?: string | null
          archived_at?: string | null
          category?: string
          checksum_sha256?: string | null
          created_at?: string
          id?: string
          institution_id?: string
          mime_type?: string
          original_filename?: string
          review_feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number
          status?: string
          storage_bucket?: string
          storage_path?: string
          student_id?: string
          superseded_at?: string | null
          superseded_by?: string | null
          title?: string
          updated_at?: string
          uploaded_by?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_documents_application_document_id_fkey"
            columns: ["application_document_id"]
            isOneToOne: false
            referencedRelation: "admission_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "admissions_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_documents_institution_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_documents_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_documents_student_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_documents_superseded_by_fkey"
            columns: ["superseded_by"]
            isOneToOne: false
            referencedRelation: "student_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      student_emergency_contacts: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          institution_id: string
          is_primary: boolean
          name: string
          phone: string | null
          priority: number
          relationship: string
          student_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          institution_id: string
          is_primary?: boolean
          name: string
          phone?: string | null
          priority?: number
          relationship: string
          student_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          institution_id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          priority?: number
          relationship?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_emergency_contacts_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_emergency_contacts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_notes: {
        Row: {
          actor_id: string
          archived_at: string | null
          body: string
          created_at: string
          id: string
          institution_id: string
          student_id: string
        }
        Insert: {
          actor_id: string
          archived_at?: string | null
          body: string
          created_at?: string
          id?: string
          institution_id: string
          student_id: string
        }
        Update: {
          actor_id?: string
          archived_at?: string | null
          body?: string
          created_at?: string
          id?: string
          institution_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_notes_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notes_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_portal_access: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          auth_user_id: string
          created_at: string
          deactivated_at: string | null
          deactivated_by: string | null
          id: string
          institution_id: string
          invited_at: string | null
          invited_by: string | null
          last_invited_at: string | null
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          auth_user_id: string
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          id?: string
          institution_id: string
          invited_at?: string | null
          invited_by?: string | null
          last_invited_at?: string | null
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          auth_user_id?: string
          created_at?: string
          deactivated_at?: string | null
          deactivated_by?: string | null
          id?: string
          institution_id?: string
          invited_at?: string | null
          invited_by?: string | null
          last_invited_at?: string | null
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_portal_access_activated_by_fkey"
            columns: ["activated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_portal_access_auth_user_id_fkey"
            columns: ["auth_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_portal_access_deactivated_by_fkey"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_portal_access_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_portal_access_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_portal_access_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_profile_details: {
        Row: {
          citizenship: string | null
          country_of_birth: string | null
          education_agent_id: string | null
          english_evidence_date: string | null
          english_evidence_reference: string | null
          english_evidence_type: string | null
          institution_id: string
          marketing_staff_id: string | null
          other_identifiers: Json | null
          passport_country: string | null
          passport_expiry: string | null
          passport_number: string | null
          student_id: string
          updated_at: string
          usi: string | null
          visa_expiry: string | null
          visa_number: string | null
          visa_type: string | null
        }
        Insert: {
          citizenship?: string | null
          country_of_birth?: string | null
          education_agent_id?: string | null
          english_evidence_date?: string | null
          english_evidence_reference?: string | null
          english_evidence_type?: string | null
          institution_id: string
          marketing_staff_id?: string | null
          other_identifiers?: Json | null
          passport_country?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          student_id: string
          updated_at?: string
          usi?: string | null
          visa_expiry?: string | null
          visa_number?: string | null
          visa_type?: string | null
        }
        Update: {
          citizenship?: string | null
          country_of_birth?: string | null
          education_agent_id?: string | null
          english_evidence_date?: string | null
          english_evidence_reference?: string | null
          english_evidence_type?: string | null
          institution_id?: string
          marketing_staff_id?: string | null
          other_identifiers?: Json | null
          passport_country?: string | null
          passport_expiry?: string | null
          passport_number?: string | null
          student_id?: string
          updated_at?: string
          usi?: string | null
          visa_expiry?: string | null
          visa_number?: string | null
          visa_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_profile_details_education_agent_id_fkey"
            columns: ["education_agent_id"]
            isOneToOne: false
            referencedRelation: "education_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profile_details_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profile_details_marketing_staff_id_fkey"
            columns: ["marketing_staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_profile_details_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          admission_year: number | null
          dob: string | null
          gender: string | null
          id: string
          institution_id: string
          intake_id: string | null
          program_id: string | null
          registration_number: string | null
          section_id: string | null
          semester: number | null
        }
        Insert: {
          admission_year?: number | null
          dob?: string | null
          gender?: string | null
          id: string
          institution_id: string
          intake_id?: string | null
          program_id?: string | null
          registration_number?: string | null
          section_id?: string | null
          semester?: number | null
        }
        Update: {
          admission_year?: number | null
          dob?: string | null
          gender?: string | null
          id?: string
          institution_id?: string
          intake_id?: string | null
          program_id?: string | null
          registration_number?: string | null
          section_id?: string | null
          semester?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "students_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_intake_id_fkey"
            columns: ["intake_id"]
            isOneToOne: false
            referencedRelation: "intakes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_announcements: {
        Row: {
          created_at: string | null
          description: string
          faculty_id: string
          files: string[] | null
          id: string
          section_ids: string[]
          subject_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          faculty_id: string
          files?: string[] | null
          id?: string
          section_ids?: string[]
          subject_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          faculty_id?: string
          files?: string[] | null
          id?: string
          section_ids?: string[]
          subject_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_announcements_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_announcements_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          credits: number | null
          id: string
          institution_id: string | null
          name: string | null
          program_id: string | null
          semester: number | null
          subject_type: string | null
        }
        Insert: {
          code?: string | null
          credits?: number | null
          id?: string
          institution_id?: string | null
          name?: string | null
          program_id?: string | null
          semester?: number | null
          subject_type?: string | null
        }
        Update: {
          code?: string | null
          credits?: number | null
          id?: string
          institution_id?: string | null
          name?: string | null
          program_id?: string | null
          semester?: number | null
          subject_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      submission_verifications: {
        Row: {
          ai_probability: number | null
          id: string
          plagiarism_rate: number | null
          status: string
          submission_id: string
          verified_at: string | null
        }
        Insert: {
          ai_probability?: number | null
          id?: string
          plagiarism_rate?: number | null
          status?: string
          submission_id: string
          verified_at?: string | null
        }
        Update: {
          ai_probability?: number | null
          id?: string
          plagiarism_rate?: number | null
          status?: string
          submission_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submission_verifications_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          assignment_id: string | null
          code_content: string | null
          feedback: string | null
          file_url: string | null
          grade: number | null
          id: string
          language: string | null
          quiz_answers: Json | null
          status: string | null
          student_id: string | null
          submitted_at: string | null
        }
        Insert: {
          assignment_id?: string | null
          code_content?: string | null
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          id?: string
          language?: string | null
          quiz_answers?: Json | null
          status?: string | null
          student_id?: string | null
          submitted_at?: string | null
        }
        Update: {
          assignment_id?: string | null
          code_content?: string | null
          feedback?: string | null
          file_url?: string | null
          grade?: number | null
          id?: string
          language?: string | null
          quiz_answers?: Json | null
          status?: string | null
          student_id?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_slots: {
        Row: {
          day: string | null
          delivery_mode: string | null
          faculty_id: string | null
          id: string
          institution_id: string | null
          meeting_link: string | null
          notes: string | null
          organization_id: string | null
          period: number | null
          room: string | null
          section_id: string | null
          semester: number | null
          subject_id: string | null
          updated_at: string | null
          updated_by: string | null
          week_id: string | null
        }
        Insert: {
          day?: string | null
          delivery_mode?: string | null
          faculty_id?: string | null
          id?: string
          institution_id?: string | null
          meeting_link?: string | null
          notes?: string | null
          organization_id?: string | null
          period?: number | null
          room?: string | null
          section_id?: string | null
          semester?: number | null
          subject_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          week_id?: string | null
        }
        Update: {
          day?: string | null
          delivery_mode?: string | null
          faculty_id?: string | null
          id?: string
          institution_id?: string | null
          meeting_link?: string | null
          notes?: string | null
          organization_id?: string | null
          period?: number | null
          room?: string | null
          section_id?: string | null
          semester?: number | null
          subject_id?: string | null
          updated_at?: string | null
          updated_by?: string | null
          week_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "timetable_slots_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_teacher_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_week_id_fkey"
            columns: ["week_id"]
            isOneToOne: false
            referencedRelation: "timetable_weeks"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_weeks: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          institution_id: string
          section_id: string
          semester: number
          start_date: string
          title: string | null
          updated_at: string | null
          week_number: number
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          institution_id: string
          section_id: string
          semester: number
          start_date: string
          title?: string | null
          updated_at?: string | null
          week_number: number
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          institution_id?: string
          section_id?: string
          semester?: number
          start_date?: string
          title?: string | null
          updated_at?: string | null
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "timetable_weeks_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_weeks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      user_account_settings: {
        Row: {
          display_name: string | null
          language: string
          sortable_name: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          display_name?: string | null
          language?: string
          sortable_name?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          display_name?: string | null
          language?: string
          sortable_name?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_account_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          id: string
          permission_id: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          permission_id?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          permission_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile_details: {
        Row: {
          bio: string | null
          created_at: string
          links: Json
          pronouns: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          links?: Json
          pronouns?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          links?: Json
          pronouns?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profile_details_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          department_id: string | null
          email: string | null
          id: string
          institution_id: string | null
          is_active: boolean | null
          name: string | null
          organization_id: string | null
          phone: string | null
          profile_image_url: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          id: string
          institution_id?: string | null
          is_active?: boolean | null
          name?: string | null
          organization_id?: string | null
          phone?: string | null
          profile_image_url?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          id?: string
          institution_id?: string | null
          is_active?: boolean | null
          name?: string | null
          organization_id?: string | null
          phone?: string | null
          profile_image_url?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      warning_letters: {
        Row: {
          current_rate: number
          id: string
          institution_id: string
          level: string
          sent_at: string | null
          signed_by_admin: string | null
          student_id: string
        }
        Insert: {
          current_rate: number
          id?: string
          institution_id: string
          level: string
          sent_at?: string | null
          signed_by_admin?: string | null
          student_id: string
        }
        Update: {
          current_rate?: number
          id?: string
          institution_id?: string
          level?: string
          sent_at?: string | null
          signed_by_admin?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warning_letters_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warning_letters_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admissions_convert_to_enrolment: {
        Args: { p_actor_id: string; p_application_id: string; p_payload: Json }
        Returns: Json
      }
      admissions_generate_offer: {
        Args: { p_actor_id: string; p_application_id: string }
        Returns: Json
      }
      admissions_transition: {
        Args: {
          p_actor_id: string
          p_application_id: string
          p_new_status: string
          p_reason?: string
        }
        Returns: {
          address: string | null
          application_data: Json | null
          country_of_birth: string | null
          course_end_date: string | null
          course_start_date: string | null
          created_at: string | null
          date_of_birth: string | null
          email: string
          english_evidence: string | null
          fee_configuration_id: string | null
          first_name: string
          gender: string | null
          id: string
          institution_id: string
          intake_id: string | null
          last_name: string
          nationality: string | null
          passport_expiry: string | null
          passport_number: string | null
          phone: string | null
          program_id: string | null
          reference_number: string | null
          status: string
          student_id: string | null
          updated_at: string
          usi: string | null
          visa_expiry: string | null
          visa_type: string | null
        }
        SetofOptions: {
          from: "*"
          to: "admissions_applications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assistant_knowledge_audience_allowed: {
        Args: {
          p_department_id: string
          p_section_id: string
          p_subject_id: string
        }
        Returns: boolean
      }
      claim_knowledge_ingestion_jobs: {
        Args: { p_lease_seconds?: number; p_limit: number; p_worker_id: string }
        Returns: {
          attempts: number
          available_at: string
          completed_at: string | null
          created_at: string
          document_id: string
          error_message: string | null
          id: string
          lease_expires_at: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          requested_by: string | null
          started_at: string | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "knowledge_ingestion_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_knowledge_ingestion_job: {
        Args: { p_job_id: string; p_worker_id: string }
        Returns: {
          attempts: number
          available_at: string
          completed_at: string | null
          created_at: string
          document_id: string
          error_message: string | null
          id: string
          lease_expires_at: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          requested_by: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "knowledge_ingestion_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_user_institution_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      delete_institution_cascade: {
        Args: { p_institution_id: string }
        Returns: undefined
      }
      delete_organization_cascade: {
        Args: { p_organization_id: string }
        Returns: undefined
      }
      fail_knowledge_ingestion_job: {
        Args: { p_error: string; p_job_id: string; p_worker_id: string }
        Returns: {
          attempts: number
          available_at: string
          completed_at: string | null
          created_at: string
          document_id: string
          error_message: string | null
          id: string
          lease_expires_at: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          requested_by: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "knowledge_ingestion_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finalize_knowledge_ingestion_job: {
        Args: { p_job_id: string; p_worker_id: string }
        Returns: {
          attempts: number
          available_at: string
          completed_at: string | null
          created_at: string
          document_id: string
          error_message: string | null
          id: string
          lease_expires_at: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          requested_by: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "knowledge_ingestion_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_meeting_host: {
        Args: { p_meeting_id: string; p_user_id: string }
        Returns: boolean
      }
      is_meeting_participant: {
        Args: { p_meeting_id: string; p_user_id: string }
        Returns: boolean
      }
      knowledge_ingestion_readiness: {
        Args: never
        Returns: {
          failed: number
          orphaned_or_stale_chunks: number
          queued: number
          ready_missing_embeddings: number
          ready_noncanonical_profile: number
          ready_without_chunks: number
          running: number
          stale_running_jobs: number
          unscoped_ready_documents: number
        }[]
      }
      match_knowledge_chunks:
        | {
            Args: {
              match_count: number
              match_threshold: number
              p_department_id: string
              p_institution_id: string
              p_organization_id: string
              p_role: string
              p_section_ids?: string[]
              p_subject_ids?: string[]
              p_user_id: string
              query_embedding: string
            }
            Returns: {
              allowed_roles: string[]
              chunk_index: number
              content: string
              department_id: string
              document_id: string
              document_status: string
              id: string
              institution_id: string
              original_filename: string
              owner_id: string
              section_id: string
              similarity: number
              subject_id: string
              title: string
              visibility: string
            }[]
          }
        | {
            Args: {
              match_count: number
              match_threshold: number
              p_department_id: string
              p_embedding_profile?: string
              p_institution_id: string
              p_organization_id: string
              p_role: string
              p_section_ids?: string[]
              p_subject_ids?: string[]
              p_user_id: string
              query_embedding: string
            }
            Returns: {
              allowed_roles: string[]
              chunk_index: number
              content: string
              department_id: string
              document_id: string
              document_status: string
              id: string
              institution_id: string
              original_filename: string
              owner_id: string
              section_id: string
              similarity: number
              subject_id: string
              title: string
              visibility: string
            }[]
          }
      renew_knowledge_ingestion_job: {
        Args: {
          p_job_id: string
          p_lease_seconds?: number
          p_worker_id: string
        }
        Returns: {
          attempts: number
          available_at: string
          completed_at: string | null
          created_at: string
          document_id: string
          error_message: string | null
          id: string
          lease_expires_at: string | null
          locked_at: string | null
          locked_by: string | null
          max_attempts: number
          requested_by: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "knowledge_ingestion_jobs"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_institution_academic_time_zone: {
        Args: {
          p_academic_time_zone: string
          p_actor_id: string
          p_institution_id: string
          p_organization_id: string
        }
        Returns: string
      }
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
    Enums: {},
  },
} as const

