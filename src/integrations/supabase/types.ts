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
        }
        Relationships: []
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
          title?: string
          total_copies?: number
          updated_at?: string
        }
        Relationships: []
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
          updated_at: string
        }
        Insert: {
          bands?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          bands?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
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
        ]
      }
      inventory_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
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
        ]
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
          updated_at?: string
        }
        Relationships: []
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
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      school_settings: {
        Row: {
          academic_terms: Json | null
          address: string | null
          city: string | null
          created_at: string
          currency: string
          current_session: string
          email: string | null
          id: string
          logo_url: string | null
          phone: string | null
          school_name: string
          session_end_date: string | null
          session_start_date: string | null
          singleton: boolean
          tagline: string | null
          timezone: string
          updated_at: string
          website: string | null
        }
        Insert: {
          academic_terms?: Json | null
          address?: string | null
          city?: string | null
          created_at?: string
          currency?: string
          current_session?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          school_name?: string
          session_end_date?: string | null
          session_start_date?: string | null
          singleton?: boolean
          tagline?: string | null
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          academic_terms?: Json | null
          address?: string | null
          city?: string | null
          created_at?: string
          currency?: string
          current_session?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          school_name?: string
          session_end_date?: string | null
          session_start_date?: string | null
          singleton?: boolean
          tagline?: string | null
          timezone?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
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
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_id: string
          relation?: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_id?: string
          relation?: string
          student_id?: string
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
        ]
      }
      students: {
        Row: {
          address: string | null
          admission_no: string
          class_id: string | null
          created_at: string
          date_of_birth: string | null
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
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          admission_no: string
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
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
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          admission_no?: string
          class_id?: string | null
          created_at?: string
          date_of_birth?: string | null
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
        ]
      }
      teachers: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          date_of_joining: string
          email: string | null
          employee_no: string
          full_name: string
          gender: string | null
          id: string
          notes: string | null
          phone: string | null
          photo_url: string | null
          qualification: string | null
          specialization: string | null
          status: Database["public"]["Enums"]["teacher_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_of_joining?: string
          email?: string | null
          employee_no: string
          full_name: string
          gender?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          qualification?: string | null
          specialization?: string | null
          status?: Database["public"]["Enums"]["teacher_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_of_joining?: string
          email?: string | null
          employee_no?: string
          full_name?: string
          gender?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          photo_url?: string | null
          qualification?: string | null
          specialization?: string | null
          status?: Database["public"]["Enums"]["teacher_status"]
          updated_at?: string
          user_id?: string | null
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
          updated_at?: string
        }
        Relationships: []
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
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
        | "probation"
      submission_status: "pending" | "submitted" | "late" | "graded"
      teacher_status: "active" | "on_leave" | "inactive" | "resigned"
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
        "probation",
      ],
      submission_status: ["pending", "submitted", "late", "graded"],
      teacher_status: ["active", "on_leave", "inactive", "resigned"],
    },
  },
} as const
