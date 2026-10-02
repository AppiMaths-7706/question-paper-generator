import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

export type Class = {
  id: string
  name: string
}

export type Semester = {
  id: string
  name: string
}

export type Subject = {
  id: string
  name: string
  class_id: string
  semester_id: string
}

export type Question = {
  id: string
  created_at: string
  subject_id: string
  unit: number
  question_text: string
  marks: number
}

export type PaperFormat = {
  id: string
  created_at: string
  name: string
  total_marks: number
  duration_minutes: number
}

export type PaperSection = {
  id: string
  created_at: string
  paper_format_id: string
  question_number: number
  unit: number | null
  available_questions: number
  questions_to_answer: number
  marks_each: number
}

export type Paper = {
  id: string
  created_at: string
  subject_id: string
  paper_format_id: string
  academic_year: string | null
  pdf_url: string | null
}

export type PaperQuestion = {
  id: string
  created_at: string
  paper_id: string
  question_id: string
  question_number: number
  section: number
}
