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
      admission_applications: {
        Row: {
          address: string | null
          application_fee: number
          application_no: string
          applying_for_class_id: string | null
          created_at: string
          date_of_birth: string | null
          decision_date: string | null
          decision_notes: string | null
          fee_paid: boolean
          first_name: string
          gender: string | null
          guardian_email: string | null
          guardian_name: string
          guardian_phone: string
          id: string
          last_name: string
          offer_date: string | null
          previous_school: string | null
          source: string | null
          status: Database["public"]["Enums"]["admission_status"]
          submitted_at: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          application_fee?: number
          application_no: string
          applying_for_class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          decision_date?: string | null
          decision_notes?: string | null
          fee_paid?: boolean
          first_name: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name: string
          guardian_phone: string
          id?: string
          last_name: string
          offer_date?: string | null
          previous_school?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["admission_status"]
          submitted_at?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          application_fee?: number
          application_no?: string
          applying_for_class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          decision_date?: string | null
          decision_notes?: string | null
          fee_paid?: boolean
          first_name?: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string
          guardian_phone?: string
          id?: string
          last_name?: string
          offer_date?: string | null
          previous_school?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["admission_status"]
          submitted_at?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_applications_applying_for_class_id_fkey"
            columns: ["applying_for_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      admission_interviews: {
        Row: {
          application_id: string
          created_at: string
          id: string
          interviewer_id: string | null
          interviewer_name: string | null
          mode: Database["public"]["Enums"]["interview_mode"]
          outcome: Database["public"]["Enums"]["interview_outcome"]
          remarks: string | null
          scheduled_at: string
          score: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          id?: string
          interviewer_id?: string | null
          interviewer_name?: string | null
          mode?: Database["public"]["Enums"]["interview_mode"]
          outcome?: Database["public"]["Enums"]["interview_outcome"]
          remarks?: string | null
          scheduled_at: string
          score?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          id?: string
          interviewer_id?: string | null
          interviewer_name?: string | null
          mode?: Database["public"]["Enums"]["interview_mode"]
          outcome?: Database["public"]["Enums"]["interview_outcome"]
          remarks?: string | null
          scheduled_at?: string
          score?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admission_interviews_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "admission_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_interviews_interviewer_id_fkey"
            columns: ["interviewer_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admission_interviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: Database["public"]["Enums"]["announcement_audience"]
          body: string
          class_id: string | null
          created_at: string
          created_by: string | null
          id: string
          pinned: boolean
          published_at: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["announcement_audience"]
          body: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          pinned?: boolean
          published_at?: string | null
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["announcement_audience"]
          body?: string
          class_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          pinned?: boolean
          published_at?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          notes: string | null
          recorded_by: string | null
          status: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          recorded_by?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_deduction_rules: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          per_n_absences: number
          step_type: Database["public"]["Enums"]["calc_type"]
          step_value: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          per_n_absences?: number
          step_type?: Database["public"]["Enums"]["calc_type"]
          step_value?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          per_n_absences?: number
          step_type?: Database["public"]["Enums"]["calc_type"]
          step_value?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_deduction_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          entity_type: string
          id: string
          ip_address: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          tenant_id?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      book_issues: {
        Row: {
          book_id: string
          created_at: string
          due_date: string
          fine_amount: number
          id: string
          issue_date: string
          issued_by: string | null
          notes: string | null
          return_date: string | null
          status: Database["public"]["Enums"]["book_issue_status"]
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          book_id: string
          created_at?: string
          due_date: string
          fine_amount?: number
          id?: string
          issue_date?: string
          issued_by?: string | null
          notes?: string | null
          return_date?: string | null
          status?: Database["public"]["Enums"]["book_issue_status"]
          student_id: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          book_id?: string
          created_at?: string
          due_date?: string
          fine_amount?: number
          id?: string
          issue_date?: string
          issued_by?: string | null
          notes?: string | null
          return_date?: string | null
          status?: Database["public"]["Enums"]["book_issue_status"]
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_issues_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_issues_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_issues_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      books: {
        Row: {
          author: string
          available_copies: number
          category: string | null
          created_at: string
          description: string | null
          id: string
          isbn: string | null
          publication_year: number | null
          publisher: string | null
          shelf_location: string | null
          tenant_id: string
          title: string
          total_copies: number
          updated_at: string
        }
        Insert: {
          author: string
          available_copies?: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          isbn?: string | null
          publication_year?: number | null
          publisher?: string | null
          shelf_location?: string | null
          tenant_id?: string
          title: string
          total_copies?: number
          updated_at?: string
        }
        Update: {
          author?: string
          available_copies?: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          isbn?: string | null
          publication_year?: number | null
          publisher?: string | null
          shelf_location?: string | null
          tenant_id?: string
          title?: string
          total_copies?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "books_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          academic_year: string
          capacity: number
          class_teacher_id: string | null
          created_at: string
          grade_level: number | null
          id: string
          name: string
          section: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          academic_year?: string
          capacity?: number
          class_teacher_id?: string | null
          created_at?: string
          grade_level?: number | null
          id?: string
          name: string
          section?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          capacity?: number
          class_teacher_id?: string | null
          created_at?: string
          grade_level?: number | null
          id?: string
          name?: string
          section?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_class_teacher_id_fkey"
            columns: ["class_teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deduction_components: {
        Row: {
          calc_type: Database["public"]["Enums"]["calc_type"]
          created_at: string
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
          value: number
        }
        Insert: {
          calc_type?: Database["public"]["Enums"]["calc_type"]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          tenant_id?: string
          updated_at?: string
          value?: number
        }
        Update: {
          calc_type?: Database["public"]["Enums"]["calc_type"]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "deduction_components_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          id: string
          is_teaching: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_teaching?: boolean
          name: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_teaching?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          donation_date: string
          donor_email: string | null
          donor_name: string
          donor_phone: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          purpose: string | null
          reference: string | null
          source: string
          status: Database["public"]["Enums"]["donation_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          donation_date?: string
          donor_email?: string | null
          donor_name: string
          donor_phone?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          purpose?: string | null
          reference?: string | null
          source?: string
          status?: Database["public"]["Enums"]["donation_status"]
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          donation_date?: string
          donor_email?: string | null
          donor_name?: string
          donor_phone?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          purpose?: string | null
          reference?: string | null
          source?: string
          status?: Database["public"]["Enums"]["donation_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          cnic: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          licence_no: string | null
          notes: string | null
          phone: string | null
          tenant_id: string
          updated_at: string
          vehicle_model: string | null
          vehicle_registration: string | null
        }
        Insert: {
          cnic?: string | null
          created_at?: string
          full_name: string
          id?: string
          is_active?: boolean
          licence_no?: string | null
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
          vehicle_model?: string | null
          vehicle_registration?: string | null
        }
        Update: {
          cnic?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          licence_no?: string | null
          notes?: string | null
          phone?: string | null
          tenant_id?: string
          updated_at?: string
          vehicle_model?: string | null
          vehicle_registration?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employment_applications: {
        Row: {
          created_at: string
          cv_url: string | null
          email: string | null
          expected_salary: number | null
          experience_years: number | null
          full_name: string
          id: string
          notes: string | null
          phone: string
          position: string
          qualification: string | null
          source: string
          status: Database["public"]["Enums"]["employment_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cv_url?: string | null
          email?: string | null
          expected_salary?: number | null
          experience_years?: number | null
          full_name: string
          id?: string
          notes?: string | null
          phone: string
          position: string
          qualification?: string | null
          source?: string
          status?: Database["public"]["Enums"]["employment_status"]
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cv_url?: string | null
          email?: string | null
          expected_salary?: number | null
          experience_years?: number | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string
          position?: string
          qualification?: string | null
          source?: string
          status?: Database["public"]["Enums"]["employment_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employment_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          audience: Database["public"]["Enums"]["event_audience"]
          class_id: string | null
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          end_time: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          is_holiday: boolean
          location: string | null
          start_date: string
          start_time: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          audience?: Database["public"]["Enums"]["event_audience"]
          class_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          end_time?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_holiday?: boolean
          location?: string | null
          start_date: string
          start_time?: string | null
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          audience?: Database["public"]["Enums"]["event_audience"]
          class_id?: string | null
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          end_time?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          is_holiday?: boolean
          location?: string | null
          start_date?: string
          start_time?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_results: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          is_absent: boolean
          marks_obtained: number | null
          recorded_by: string | null
          remarks: string | null
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          is_absent?: boolean
          marks_obtained?: number | null
          recorded_by?: string | null
          remarks?: string | null
          student_id: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          is_absent?: boolean
          marks_obtained?: number | null
          recorded_by?: string | null
          remarks?: string | null
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_results_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_results_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          class_id: string
          created_at: string
          created_by: string | null
          end_time: string | null
          exam_date: string
          id: string
          notes: string | null
          passing_marks: number
          start_time: string | null
          status: Database["public"]["Enums"]["exam_status"]
          subject: string
          tenant_id: string
          title: string
          total_marks: number
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          exam_date: string
          id?: string
          notes?: string | null
          passing_marks?: number
          start_time?: string | null
          status?: Database["public"]["Enums"]["exam_status"]
          subject: string
          tenant_id?: string
          title: string
          total_marks?: number
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          created_by?: string | null
          end_time?: string | null
          exam_date?: string
          id?: string
          notes?: string | null
          passing_marks?: number
          start_time?: string | null
          status?: Database["public"]["Enums"]["exam_status"]
          subject?: string
          tenant_id?: string
          title?: string
          total_marks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_challans: {
        Row: {
          constituent_breakdown: Json
          created_at: string
          discount_applied: number
          group_id: string | null
          id: string
          period: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["challan_status"]
          student_id: string
          subtotal: number
          tenant_id: string
          total_due: number
          updated_at: string
          uploaded_proof_url: string | null
        }
        Insert: {
          constituent_breakdown?: Json
          created_at?: string
          discount_applied?: number
          group_id?: string | null
          id?: string
          period: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["challan_status"]
          student_id: string
          subtotal?: number
          tenant_id?: string
          total_due?: number
          updated_at?: string
          uploaded_proof_url?: string | null
        }
        Update: {
          constituent_breakdown?: Json
          created_at?: string
          discount_applied?: number
          group_id?: string | null
          id?: string
          period?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["challan_status"]
          student_id?: string
          subtotal?: number
          tenant_id?: string
          total_due?: number
          updated_at?: string
          uploaded_proof_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_challans_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "fee_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_challans_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_challans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_constituents: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_constituents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_group_constituents: {
        Row: {
          amount: number
          constituent_id: string
          created_at: string
          group_id: string
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          constituent_id: string
          created_at?: string
          group_id: string
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          constituent_id?: string
          created_at?: string
          group_id?: string
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_group_constituents_constituent_id_fkey"
            columns: ["constituent_id"]
            isOneToOne: false
            referencedRelation: "fee_constituents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_group_constituents_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "fee_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_group_constituents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_groups: {
        Row: {
          class_ids: string[]
          created_at: string
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          class_ids?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          class_ids?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          academic_year: string
          amount: number
          class_id: string
          created_at: string
          description: string | null
          due_day: number | null
          frequency: Database["public"]["Enums"]["fee_frequency"]
          id: string
          is_active: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          academic_year?: string
          amount: number
          class_id: string
          created_at?: string
          description?: string | null
          due_day?: number | null
          frequency?: Database["public"]["Enums"]["fee_frequency"]
          id?: string
          is_active?: boolean
          name: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          academic_year?: string
          amount?: number
          class_id?: string
          created_at?: string
          description?: string | null
          due_day?: number | null
          frequency?: Database["public"]["Enums"]["fee_frequency"]
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_entries: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          entry_date: string
          entry_type: Database["public"]["Enums"]["finance_entry_type"]
          id: string
          name: string
          notes: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_type: Database["public"]["Enums"]["finance_entry_type"]
          id?: string
          name: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          entry_type?: Database["public"]["Enums"]["finance_entry_type"]
          id?: string
          name?: string
          notes?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_scales: {
        Row: {
          bands: Json
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          bands?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          bands?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grading_scales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          assigned_date: string
          class_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          id: string
          max_marks: number
          status: Database["public"]["Enums"]["homework_status"]
          subject: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_date?: string
          class_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          id?: string
          max_marks?: number
          status?: Database["public"]["Enums"]["homework_status"]
          subject: string
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_date?: string
          class_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          id?: string
          max_marks?: number
          status?: Database["public"]["Enums"]["homework_status"]
          subject?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          created_at: string
          homework_id: string
          id: string
          marks: number | null
          remarks: string | null
          status: Database["public"]["Enums"]["submission_status"]
          student_id: string
          submitted_date: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          homework_id: string
          id?: string
          marks?: number | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          student_id: string
          submitted_date?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          homework_id?: string
          id?: string
          marks?: number | null
          remarks?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          student_id?: string
          submitted_date?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      import_profiles: {
        Row: {
          created_at: string
          created_by: string | null
          entity_key: string
          id: string
          mapping: Json
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entity_key: string
          id?: string
          mapping?: Json
          name: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entity_key?: string
          id?: string
          mapping?: Json
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          location: string | null
          name: string
          quantity: number
          reorder_level: number
          sku: string | null
          status: string
          supplier: string | null
          tenant_id: string
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name: string
          quantity?: number
          reorder_level?: number
          sku?: string | null
          status?: string
          supplier?: string | null
          tenant_id?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location?: string | null
          name?: string
          quantity?: number
          reorder_level?: number
          sku?: string | null
          status?: string
          supplier?: string | null
          tenant_id?: string
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inventory_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          issued_to: string | null
          item_id: string
          notes: string | null
          quantity: number
          reference: string | null
          tenant_id: string
          txn_date: string
          txn_type: string
          unit_cost: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          issued_to?: string | null
          item_id: string
          notes?: string | null
          quantity: number
          reference?: string | null
          tenant_id?: string
          txn_date?: string
          txn_type: string
          unit_cost?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          issued_to?: string | null
          item_id?: string
          notes?: string | null
          quantity?: number
          reference?: string | null
          tenant_id?: string
          txn_date?: string
          txn_type?: string
          unit_cost?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          amount_paid: number
          created_at: string
          created_by: string | null
          discount: number
          due_date: string
          fee_structure_id: string | null
          id: string
          invoice_no: string
          issue_date: string
          notes: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          student_id: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          discount?: number
          due_date: string
          fee_structure_id?: string | null
          id?: string
          invoice_no: string
          issue_date?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          student_id: string
          tenant_id?: string
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_paid?: number
          created_at?: string
          created_by?: string | null
          discount?: number
          due_date?: string
          fee_structure_id?: string | null
          id?: string
          invoice_no?: string
          issue_date?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          student_id?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string
          id: string
          success: boolean
        }
        Insert: {
          attempted_at?: string
          email: string
          id?: string
          success?: boolean
        }
        Update: {
          attempted_at?: string
          email?: string
          id?: string
          success?: boolean
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["message_channel"]
          created_at: string
          id: string
          parent_contact_id: string | null
          sent_at: string
          sent_by: string | null
          status: Database["public"]["Enums"]["message_status"]
          student_id: string | null
          subject: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          body: string
          channel?: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          id?: string
          parent_contact_id?: string | null
          sent_at?: string
          sent_by?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          student_id?: string | null
          subject?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["message_channel"]
          created_at?: string
          id?: string
          parent_contact_id?: string | null
          sent_at?: string
          sent_by?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          student_id?: string | null
          subject?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_contact_id_fkey"
            columns: ["parent_contact_id"]
            isOneToOne: false
            referencedRelation: "parent_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          created_by: string | null
          error_message: string | null
          id: string
          recipient: string
          recipient_name: string | null
          related_id: string | null
          related_module: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          subject: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          recipient: string
          recipient_name?: string | null
          related_id?: string | null
          related_module?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          subject?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          id?: string
          recipient?: string
          recipient_name?: string | null
          related_id?: string | null
          related_module?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          subject?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_contacts: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_primary: boolean
          notes: string | null
          phone: string | null
          relation: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          phone?: string | null
          relation?: string
          student_id: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean
          notes?: string | null
          phone?: string | null
          relation?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_contacts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          address: string | null
          cnic: string | null
          created_at: string
          email: string | null
          employer: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          profession: string | null
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          cnic?: string | null
          created_at?: string
          email?: string | null
          employer?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          profession?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          cnic?: string | null
          created_at?: string
          email?: string | null
          employer?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          profession?: string | null
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          paid_on: string
          recorded_by: string | null
          reference: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          paid_on?: string
          recorded_by?: string | null
          reference?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_item_lines: {
        Row: {
          amount: number
          created_at: string
          id: string
          label: string
          payroll_item_id: string
          source: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["payroll_line_type"]
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          label: string
          payroll_item_id: string
          source?: string | null
          tenant_id?: string
          type: Database["public"]["Enums"]["payroll_line_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          label?: string
          payroll_item_id?: string
          source?: string | null
          tenant_id?: string
          type?: Database["public"]["Enums"]["payroll_line_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_item_lines_payroll_item_id_fkey"
            columns: ["payroll_item_id"]
            isOneToOne: false
            referencedRelation: "payroll_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_item_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_items: {
        Row: {
          allowances: number
          basic_salary: number
          bonus: number
          created_at: string
          deductions: number
          id: string
          net_pay: number
          notes: string | null
          present_days: number | null
          run_id: string
          staff_id: string
          tenant_id: string
          updated_at: string
          working_days: number | null
        }
        Insert: {
          allowances?: number
          basic_salary?: number
          bonus?: number
          created_at?: string
          deductions?: number
          id?: string
          net_pay?: number
          notes?: string | null
          present_days?: number | null
          run_id: string
          staff_id: string
          tenant_id?: string
          updated_at?: string
          working_days?: number | null
        }
        Update: {
          allowances?: number
          basic_salary?: number
          bonus?: number
          created_at?: string
          deductions?: number
          id?: string
          net_pay?: number
          notes?: string | null
          present_days?: number | null
          run_id?: string
          staff_id?: string
          tenant_id?: string
          updated_at?: string
          working_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_items_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_run_bonus_lines: {
        Row: {
          calc_type: Database["public"]["Enums"]["calc_type"]
          created_at: string
          employee_id: string | null
          id: string
          name: string
          payroll_run_id: string
          tenant_id: string
          updated_at: string
          value: number
        }
        Insert: {
          calc_type?: Database["public"]["Enums"]["calc_type"]
          created_at?: string
          employee_id?: string | null
          id?: string
          name: string
          payroll_run_id: string
          tenant_id?: string
          updated_at?: string
          value?: number
        }
        Update: {
          calc_type?: Database["public"]["Enums"]["calc_type"]
          created_at?: string
          employee_id?: string | null
          id?: string
          name?: string
          payroll_run_id?: string
          tenant_id?: string
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_run_bonus_lines_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_run_bonus_lines_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_run_bonus_lines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          period_month: number
          period_year: number
          processed_at: string | null
          processed_by: string | null
          status: Database["public"]["Enums"]["payroll_run_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          period_month: number
          period_year: number
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["payroll_run_status"]
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          period_month?: number
          period_year?: number
          processed_at?: string | null
          processed_by?: string | null
          status?: Database["public"]["Enums"]["payroll_run_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_delete: boolean
          can_read: boolean
          can_update: boolean
          can_write: boolean
          created_at: string
          id: string
          module: string
          role_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          can_write?: boolean
          created_at?: string
          id?: string
          module: string
          role_id: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          can_delete?: boolean
          can_read?: boolean
          can_update?: boolean
          can_write?: boolean
          created_at?: string
          id?: string
          module?: string
          role_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      school_settings: {
        Row: {
          academic_terms: Json | null
          accent_color: string | null
          address: string | null
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          created_at: string
          currency: string
          current_session: string
          email: string | null
          established_year: number | null
          favicon_url: string | null
          id: string
          logo_url: string | null
          phone: string | null
          postal_code: string | null
          primary_color: string
          registration_number: string | null
          school_name: string
          secondary_color: string
          session_end_date: string | null
          session_start_date: string | null
          singleton: boolean
          social_links: Json
          state_province: string | null
          tagline: string | null
          tenant_id: string
          timezone: string
          updated_at: string
          website: string | null
        }
        Insert: {
          academic_terms?: Json | null
          accent_color?: string | null
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          current_session?: string
          email?: string | null
          established_year?: number | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          primary_color?: string
          registration_number?: string | null
          school_name?: string
          secondary_color?: string
          session_end_date?: string | null
          session_start_date?: string | null
          singleton?: boolean
          social_links?: Json
          state_province?: string | null
          tagline?: string | null
          tenant_id?: string
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          academic_terms?: Json | null
          accent_color?: string | null
          address?: string | null
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          current_session?: string
          email?: string | null
          established_year?: number | null
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          primary_color?: string
          registration_number?: string | null
          school_name?: string
          secondary_color?: string
          session_end_date?: string | null
          session_start_date?: string | null
          singleton?: boolean
          social_links?: Json
          state_province?: string | null
          tagline?: string | null
          tenant_id?: string
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_attendance: {
        Row: {
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          hours_worked: number | null
          id: string
          notes: string | null
          recorded_by: string | null
          staff_id: string
          status: Database["public"]["Enums"]["staff_attendance_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          hours_worked?: number | null
          id?: string
          notes?: string | null
          recorded_by?: string | null
          staff_id: string
          status?: Database["public"]["Enums"]["staff_attendance_status"]
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          hours_worked?: number | null
          id?: string
          notes?: string | null
          recorded_by?: string | null
          staff_id?: string
          status?: Database["public"]["Enums"]["staff_attendance_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_attendance_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_attendance_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      student_parents: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          parent_id: string
          relation: string
          student_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_id: string
          relation?: string
          student_id: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_id?: string
          relation?: string
          student_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_parents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_parents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_no: string
          class_id: string | null
          created_at: string
          date_of_birth: string | null
          discount_reason: string | null
          discount_type: Database["public"]["Enums"]["discount_type"] | null
          discount_value: number
          driver_id: string | null
          enrollment_date: string
          full_name: string
          gender: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          notes: string | null
          photo_url: string | null
          status: Database["public"]["Enums"]["student_status"]
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          admission_no: string
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          discount_reason?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          discount_value?: number
          driver_id?: string | null
          enrollment_date?: string
          full_name: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          admission_no?: string
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
          discount_reason?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          discount_value?: number
          driver_id?: string | null
          enrollment_date?: string
          full_name?: string
          gender?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          notes?: string | null
          photo_url?: string | null
          status?: Database["public"]["Enums"]["student_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          class_id: string
          code: string | null
          created_at: string
          credit_hours: number | null
          id: string
          is_optional: boolean
          name: string
          teacher_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          code?: string | null
          created_at?: string
          credit_hours?: number | null
          id?: string
          is_optional?: boolean
          name: string
          teacher_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          code?: string | null
          created_at?: string
          credit_hours?: number | null
          id?: string
          is_optional?: boolean
          name?: string
          teacher_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subjects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          address: string | null
          base_salary: number
          created_at: string
          date_of_birth: string | null
          date_of_joining: string
          department_id: string | null
          designation: string | null
          email: string | null
          employee_no: string
          fee_group_id: string | null
          full_name: string
          gender: string | null
          id: string
          notes: string | null
          phone: string | null
          photo_url: string | null
          qualification: string | null
          specialization: string | null
          status: Database["public"]["Enums"]["teacher_status"]
          tenant_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          base_salary?: number
          created_at?: string
          date_of_birth?: string | null
          date_of_joining?: string
          department_id?: string | null
          designation?: string | null
          email?: string | null
          employee_no: string
          fee_group_id?: string | null
          full_name: string
          gender?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          qualification?: string | null
          specialization?: string | null
          status?: Database["public"]["Enums"]["teacher_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          base_salary?: number
          created_at?: string
          date_of_birth?: string | null
          date_of_joining?: string
          department_id?: string | null
          designation?: string | null
          email?: string | null
          employee_no?: string
          fee_group_id?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          qualification?: string | null
          specialization?: string | null
          status?: Database["public"]["Enums"]["teacher_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_fee_group_id_fkey"
            columns: ["fee_group_id"]
            isOneToOne: false
            referencedRelation: "fee_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          display_name: string
          id: string
          onboarding_completed_steps: Json
          onboarding_dismissed: boolean
          owner_user_id: string | null
          plan: string
          status: Database["public"]["Enums"]["tenant_status"]
          subdomain: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          onboarding_completed_steps?: Json
          onboarding_dismissed?: boolean
          owner_user_id?: string | null
          plan?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          subdomain: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          onboarding_completed_steps?: Json
          onboarding_dismissed?: boolean
          owner_user_id?: string | null
          plan?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          subdomain?: string
          updated_at?: string
        }
        Relationships: []
      }
      timetable_slots: {
        Row: {
          class_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          notes: string | null
          period_no: number
          room: string | null
          start_time: string
          subject: string
          teacher_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          notes?: string | null
          period_no: number
          room?: string | null
          start_time: string
          subject: string
          teacher_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          notes?: string | null
          period_no?: number
          room?: string | null
          start_time?: string
          subject?: string
          teacher_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_slots_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_slots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_assignments: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean
          monthly_fare: number
          notes: string | null
          pickup_stop: string | null
          route_id: string
          start_date: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          monthly_fare?: number
          notes?: string | null
          pickup_stop?: string | null
          route_id: string
          start_date?: string
          student_id: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean
          monthly_fare?: number
          notes?: string | null
          pickup_stop?: string | null
          route_id?: string
          start_date?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_assignments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "transport_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_routes: {
        Row: {
          code: string
          created_at: string
          driver_name: string | null
          driver_phone: string | null
          id: string
          is_active: boolean
          monthly_fare: number
          name: string
          notes: string | null
          stops: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          is_active?: boolean
          monthly_fare?: number
          name: string
          notes?: string | null
          stops?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          is_active?: boolean
          monthly_fare?: number
          name?: string
          notes?: string | null
          stops?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_routes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_vehicles: {
        Row: {
          capacity: number
          created_at: string
          driver_name: string | null
          driver_phone: string | null
          id: string
          is_active: boolean
          model: string | null
          notes: string | null
          registration_no: string
          route_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          is_active?: boolean
          model?: string | null
          notes?: string | null
          registration_no: string
          route_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          driver_name?: string | null
          driver_phone?: string | null
          id?: string
          is_active?: boolean
          model?: string | null
          notes?: string | null
          registration_no?: string
          route_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_vehicles_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "transport_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transport_vehicles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_settings: { Args: { _user_id: string }; Returns: boolean }
      current_tenant_id: { Args: never; Returns: string }
      get_tenant_public: { Args: { _subdomain: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      merge_staff_import: {
        Args: { _entity: string; _values: Json }
        Returns: Json
      }
      seed_tenant_defaults: {
        Args: { _school_name: string; _tenant: string }
        Returns: undefined
      }
      subdomain_available: { Args: { _subdomain: string }; Returns: boolean }
      update_onboarding: {
        Args: { _dismiss?: boolean; _step: string }
        Returns: Json
      }
    }
    Enums: {
      admission_status:
        | "new"
        | "screening"
        | "interview"
        | "offered"
        | "accepted"
        | "rejected"
        | "withdrawn"
      announcement_audience: "all" | "teachers" | "parents" | "class"
      app_role:
        | "admin"
        | "teacher"
        | "student"
        | "parent"
        | "librarian"
        | "accountant"
      attendance_status: "present" | "absent" | "late" | "excused"
      book_issue_status: "issued" | "returned" | "overdue" | "lost"
      calc_type: "flat" | "percent"
      challan_status: "unpaid" | "pending_review" | "approved" | "rejected"
      discount_type: "flat" | "percent"
      donation_status: "pledged" | "received" | "cancelled"
      employment_status:
        | "new"
        | "screening"
        | "interview"
        | "offered"
        | "hired"
        | "rejected"
      event_audience: "all" | "students" | "teachers" | "parents" | "staff"
      event_type:
        | "holiday"
        | "exam"
        | "ptm"
        | "activity"
        | "announcement"
        | "other"
      exam_status: "scheduled" | "ongoing" | "completed" | "cancelled"
      fee_frequency: "one_time" | "monthly" | "quarterly" | "annual"
      finance_entry_type: "income" | "expense"
      homework_status: "draft" | "assigned" | "closed"
      interview_mode: "in_person" | "online" | "phone"
      interview_outcome: "pending" | "pass" | "fail" | "hold"
      invoice_status: "pending" | "paid" | "partial" | "overdue" | "cancelled"
      message_channel: "email" | "sms" | "whatsapp" | "in_app"
      message_status: "draft" | "queued" | "sent" | "failed"
      notification_channel: "email" | "sms" | "push" | "in_app"
      notification_status: "queued" | "sent" | "failed" | "delivered"
      payment_method:
        | "cash"
        | "bank_transfer"
        | "card"
        | "cheque"
        | "online"
        | "other"
      payroll_line_type: "earning" | "deduction" | "bonus"
      payroll_run_status: "draft" | "finalized" | "paid"
      staff_attendance_status:
        | "present"
        | "absent"
        | "late"
        | "half_day"
        | "leave"
      student_status:
        | "active"
        | "inactive"
        | "graduated"
        | "transferred"
        | "terminated"
      submission_status: "pending" | "submitted" | "late" | "graded"
      teacher_status:
        | "active"
        | "on_leave"
        | "inactive"
        | "resigned"
        | "probation"
      tenant_status: "trial" | "active" | "suspended"
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
      admission_status: [
        "new",
        "screening",
        "interview",
        "offered",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      announcement_audience: ["all", "teachers", "parents", "class"],
      app_role: [
        "admin",
        "teacher",
        "student",
        "parent",
        "librarian",
        "accountant",
      ],
      attendance_status: ["present", "absent", "late", "excused"],
      book_issue_status: ["issued", "returned", "overdue", "lost"],
      calc_type: ["flat", "percent"],
      challan_status: ["unpaid", "pending_review", "approved", "rejected"],
      discount_type: ["flat", "percent"],
      donation_status: ["pledged", "received", "cancelled"],
      employment_status: [
        "new",
        "screening",
        "interview",
        "offered",
        "hired",
        "rejected",
      ],
      event_audience: ["all", "students", "teachers", "parents", "staff"],
      event_type: [
        "holiday",
        "exam",
        "ptm",
        "activity",
        "announcement",
        "other",
      ],
      exam_status: ["scheduled", "ongoing", "completed", "cancelled"],
      fee_frequency: ["one_time", "monthly", "quarterly", "annual"],
      finance_entry_type: ["income", "expense"],
      homework_status: ["draft", "assigned", "closed"],
      interview_mode: ["in_person", "online", "phone"],
      interview_outcome: ["pending", "pass", "fail", "hold"],
      invoice_status: ["pending", "paid", "partial", "overdue", "cancelled"],
      message_channel: ["email", "sms", "whatsapp", "in_app"],
      message_status: ["draft", "queued", "sent", "failed"],
      notification_channel: ["email", "sms", "push", "in_app"],
      notification_status: ["queued", "sent", "failed", "delivered"],
      payment_method: [
        "cash",
        "bank_transfer",
        "card",
        "cheque",
        "online",
        "other",
      ],
      payroll_line_type: ["earning", "deduction", "bonus"],
      payroll_run_status: ["draft", "finalized", "paid"],
      staff_attendance_status: [
        "present",
        "absent",
        "late",
        "half_day",
        "leave",
      ],
      student_status: [
        "active",
        "inactive",
        "graduated",
        "transferred",
        "terminated",
      ],
      submission_status: ["pending", "submitted", "late", "graded"],
      teacher_status: [
        "active",
        "on_leave",
        "inactive",
        "resigned",
        "probation",
      ],
      tenant_status: ["trial", "active", "suspended"],
    },
  },
} as const
