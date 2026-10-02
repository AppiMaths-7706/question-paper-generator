/*
# University Question Paper Generator - Database Schema

1. Purpose
   This migration creates the complete database schema for the University Question Paper Generator.
   It stores classes, semesters, subjects, questions, paper formats, paper sections, generated papers,
   and the mapping between papers and questions.

2. New Tables (8 tables total)
   - `classes`: University classes (e.g., B.Sc.-I)
     - id (uuid, PK), name (text, unique, not null)
   - `semesters`: University semesters (e.g., Sem-I)
     - id (uuid, PK), name (text, unique, not null)
   - `subjects`: Subjects linked to a class and semester
     - id (uuid, PK), name (text, not null), class_id (uuid FK -> classes), semester_id (uuid FK -> semesters)
   - `questions`: Question bank entries
     - id (uuid, PK), created_at (timestamptz), subject_id (uuid FK -> subjects), unit (int, not null), question_text (text, not null), marks (int, not null)
   - `paper_formats`: Named paper format templates (e.g., "B.Sc.-I Sem-I Differential Calculus")
     - id (uuid, PK), created_at (timestamptz), name (text, not null), total_marks (int, not null), duration_minutes (int, not null)
   - `paper_sections`: Sections within a paper format (Q1-Q5 with unit, available questions, questions to answer, marks each)
     - id (uuid, PK), created_at (timestamptz), paper_format_id (uuid FK -> paper_formats), question_number (int), unit (int), available_questions (int), questions_to_answer (int), marks_each (int)
   - `papers`: Generated question papers
     - id (uuid, PK), created_at (timestamptz), subject_id (uuid FK -> subjects), paper_format_id (uuid FK -> paper_formats), academic_year (text), pdf_url (text)
   - `paper_questions`: Mapping table linking generated papers to specific questions with their section and question number
     - id (uuid, PK), created_at (timestamptz), paper_id (uuid FK -> papers), question_id (uuid FK -> questions), question_number (int), section (int)

3. Security
   - RLS enabled on all tables.
   - Since the app uses Supabase Auth (professor login), policies are scoped to `authenticated`.
   - `classes`, `semesters`, `paper_formats`, `paper_sections` are read-only reference data accessible to authenticated users.
   - `subjects`, `questions` are read-only for authenticated users.
   - `papers` and `paper_questions` are fully CRUD by authenticated users (shared among all professors).

4. Seed Data
   - Class: B.Sc.-I
   - Semester: Sem-I
   - Subject: Differential Calculus (linked to B.Sc.-I / Sem-I)
   - 98 questions across 4 units (Q1-15 per unit = 5 marks, Q16+ = 2 marks)
   - Paper format: "B.Sc.-I Sem-I Differential Calculus", 80 marks, 180 minutes
   - 5 paper sections:
     Q1: Unit I, 5 available, 3 to answer, 5 marks each
     Q2: Unit II, 5 available, 3 to answer, 5 marks each
     Q3: Unit III, 5 available, 3 to answer, 5 marks each
     Q4: Unit IV, 5 available, 3 to answer, 5 marks each
     Q5: short questions, 12 available, 10 to answer, 2 marks each
*/

-- ===== CLASSES =====
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_classes" ON classes;
CREATE POLICY "authenticated_read_classes" ON classes FOR SELECT TO authenticated USING (true);

-- ===== SEMESTERS =====
CREATE TABLE IF NOT EXISTS semesters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL
);

ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_semesters" ON semesters;
CREATE POLICY "authenticated_read_semesters" ON semesters FOR SELECT TO authenticated USING (true);

-- ===== SUBJECTS =====
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  semester_id uuid NOT NULL REFERENCES semesters(id) ON DELETE CASCADE
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_subjects" ON subjects;
CREATE POLICY "authenticated_read_subjects" ON subjects FOR SELECT TO authenticated USING (true);

-- ===== QUESTIONS =====
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  unit int NOT NULL,
  question_text text NOT NULL,
  marks int NOT NULL
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_questions" ON questions;
CREATE POLICY "authenticated_read_questions" ON questions FOR SELECT TO authenticated USING (true);

-- ===== PAPER_FORMATS =====
CREATE TABLE IF NOT EXISTS paper_formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  total_marks int NOT NULL,
  duration_minutes int NOT NULL
);

ALTER TABLE paper_formats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_paper_formats" ON paper_formats;
CREATE POLICY "authenticated_read_paper_formats" ON paper_formats FOR SELECT TO authenticated USING (true);

-- ===== PAPER_SECTIONS =====
CREATE TABLE IF NOT EXISTS paper_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  paper_format_id uuid NOT NULL REFERENCES paper_formats(id) ON DELETE CASCADE,
  question_number int NOT NULL,
  unit int,
  available_questions int NOT NULL,
  questions_to_answer int NOT NULL,
  marks_each int NOT NULL
);

ALTER TABLE paper_sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_paper_sections" ON paper_sections;
CREATE POLICY "authenticated_read_paper_sections" ON paper_sections FOR SELECT TO authenticated USING (true);

-- ===== PAPERS =====
CREATE TABLE IF NOT EXISTS papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  paper_format_id uuid NOT NULL REFERENCES paper_formats(id) ON DELETE CASCADE,
  academic_year text,
  pdf_url text
);

ALTER TABLE papers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_papers" ON papers;
CREATE POLICY "authenticated_read_papers" ON papers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_papers" ON papers;
CREATE POLICY "authenticated_insert_papers" ON papers FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_papers" ON papers;
CREATE POLICY "authenticated_update_papers" ON papers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_papers" ON papers;
CREATE POLICY "authenticated_delete_papers" ON papers FOR DELETE TO authenticated USING (true);

-- ===== PAPER_QUESTIONS =====
CREATE TABLE IF NOT EXISTS paper_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  paper_id uuid NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_number int NOT NULL,
  section int NOT NULL
);

ALTER TABLE paper_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_paper_questions" ON paper_questions;
CREATE POLICY "authenticated_read_paper_questions" ON paper_questions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_paper_questions" ON paper_questions;
CREATE POLICY "authenticated_insert_paper_questions" ON paper_questions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_paper_questions" ON paper_questions;
CREATE POLICY "authenticated_update_paper_questions" ON paper_questions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_paper_questions" ON paper_questions;
CREATE POLICY "authenticated_delete_paper_questions" ON paper_questions FOR DELETE TO authenticated USING (true);

-- ===== SEED DATA =====

-- Class
INSERT INTO classes (name) VALUES ('B.Sc.-I')
ON CONFLICT (name) DO NOTHING;

-- Semester
INSERT INTO semesters (name) VALUES ('Sem-I')
ON CONFLICT (name) DO NOTHING;

-- Subject (linked to B.Sc.-I / Sem-I)
INSERT INTO subjects (name, class_id, semester_id)
SELECT 'Differential Calculus', c.id, s.id
FROM classes c, semesters s
WHERE c.name = 'B.Sc.-I' AND s.name = 'Sem-I'
AND NOT EXISTS (
  SELECT 1 FROM subjects sub
  WHERE sub.name = 'Differential Calculus'
  AND sub.class_id = c.id AND sub.semester_id = s.id
);

-- Questions: 98 total across 4 units
-- Units 1-4, each with questions 1-15 (5 marks) and 16-20 (2 marks) = 20 per unit = 80
-- Plus 18 more 2-mark questions spread to reach 98 total
-- Actually: 4 units x 20 = 80 long+medium, then 18 short (2 marks) = 98 total
-- Wait, re-reading: "Questions 1-15 of each unit carry 5 marks. Remaining questions carry 2 marks."
-- So each unit has 15 five-mark questions + some 2-mark questions.
-- Q5 needs 12 short questions (2 marks). 98 total across 4 units.
-- Let's do: each unit has 15 five-mark + 7 two-mark = 22 per unit = 88, that's not 98.
-- Actually: 98 questions. Q1-Q4 use unit-specific 5-mark questions (show 5 each).
-- Q5 uses 2-mark questions (show 12, answer 10).
-- Let's do: 4 units, each with 15 five-mark questions + some 2-mark.
-- 98 = 4*15 + 38 => 38 two-mark questions across units.
-- Distribute: Unit 1: 15x5mark + 10x2mark = 25; Unit 2: 15x5mark + 10x2mark = 25;
-- Unit 3: 15x5mark + 9x2mark = 24; Unit 4: 15x5mark + 9x2mark = 24
-- Total = 25+25+24+24 = 98. Good.

-- We'll insert using a DO block to generate questions programmatically.
DO $$
DECLARE
  v_subject_id uuid;
  v_unit int;
  v_q int;
  v_total int;
BEGIN
  SELECT id INTO v_subject_id FROM subjects WHERE name = 'Differential Calculus' LIMIT 1;
  IF v_subject_id IS NULL THEN
    RAISE EXCEPTION 'Subject not found';
  END IF;

  -- Check if questions already exist
  SELECT count(*) INTO v_total FROM questions WHERE subject_id = v_subject_id;
  IF v_total > 0 THEN
    RETURN;
  END IF;

  -- Unit 1: 15 five-mark + 10 two-mark = 25 questions
  FOR v_q IN 1..15 LOOP
    INSERT INTO questions (subject_id, unit, question_text, marks)
    VALUES (v_subject_id, 1, 'Question ' || v_q || ' (Unit I)', 5);
  END LOOP;
  FOR v_q IN 16..25 LOOP
    INSERT INTO questions (subject_id, unit, question_text, marks)
    VALUES (v_subject_id, 1, 'Question ' || v_q || ' (Unit I)', 2);
  END LOOP;

  -- Unit 2: 15 five-mark + 10 two-mark = 25 questions
  FOR v_q IN 1..15 LOOP
    INSERT INTO questions (subject_id, unit, question_text, marks)
    VALUES (v_subject_id, 2, 'Question ' || v_q || ' (Unit II)', 5);
  END LOOP;
  FOR v_q IN 16..25 LOOP
    INSERT INTO questions (subject_id, unit, question_text, marks)
    VALUES (v_subject_id, 2, 'Question ' || v_q || ' (Unit II)', 2);
  END LOOP;

  -- Unit 3: 15 five-mark + 9 two-mark = 24 questions
  FOR v_q IN 1..15 LOOP
    INSERT INTO questions (subject_id, unit, question_text, marks)
    VALUES (v_subject_id, 3, 'Question ' || v_q || ' (Unit III)', 5);
  END LOOP;
  FOR v_q IN 16..24 LOOP
    INSERT INTO questions (subject_id, unit, question_text, marks)
    VALUES (v_subject_id, 3, 'Question ' || v_q || ' (Unit III)', 2);
  END LOOP;

  -- Unit 4: 15 five-mark + 9 two-mark = 24 questions
  FOR v_q IN 1..15 LOOP
    INSERT INTO questions (subject_id, unit, question_text, marks)
    VALUES (v_subject_id, 4, 'Question ' || v_q || ' (Unit IV)', 5);
  END LOOP;
  FOR v_q IN 16..24 LOOP
    INSERT INTO questions (subject_id, unit, question_text, marks)
    VALUES (v_subject_id, 4, 'Question ' || v_q || ' (Unit IV)', 2);
  END LOOP;
END $$;

-- Paper Format
INSERT INTO paper_formats (name, total_marks, duration_minutes)
SELECT 'B.Sc.-I Sem-I Differential Calculus', 80, 180
WHERE NOT EXISTS (
  SELECT 1 FROM paper_formats WHERE name = 'B.Sc.-I Sem-I Differential Calculus'
);

-- Paper Sections (5 sections)
INSERT INTO paper_sections (paper_format_id, question_number, unit, available_questions, questions_to_answer, marks_each)
SELECT pf.id, 1, 1, 5, 3, 5
FROM paper_formats pf WHERE pf.name = 'B.Sc.-I Sem-I Differential Calculus'
AND NOT EXISTS (
  SELECT 1 FROM paper_sections ps WHERE ps.paper_format_id = pf.id AND ps.question_number = 1
);

INSERT INTO paper_sections (paper_format_id, question_number, unit, available_questions, questions_to_answer, marks_each)
SELECT pf.id, 2, 2, 5, 3, 5
FROM paper_formats pf WHERE pf.name = 'B.Sc.-I Sem-I Differential Calculus'
AND NOT EXISTS (
  SELECT 1 FROM paper_sections ps WHERE ps.paper_format_id = pf.id AND ps.question_number = 2
);

INSERT INTO paper_sections (paper_format_id, question_number, unit, available_questions, questions_to_answer, marks_each)
SELECT pf.id, 3, 3, 5, 3, 5
FROM paper_formats pf WHERE pf.name = 'B.Sc.-I Sem-I Differential Calculus'
AND NOT EXISTS (
  SELECT 1 FROM paper_sections ps WHERE ps.paper_format_id = pf.id AND ps.question_number = 3
);

INSERT INTO paper_sections (paper_format_id, question_number, unit, available_questions, questions_to_answer, marks_each)
SELECT pf.id, 4, 4, 5, 3, 5
FROM paper_formats pf WHERE pf.name = 'B.Sc.-I Sem-I Differential Calculus'
AND NOT EXISTS (
  SELECT 1 FROM paper_sections ps WHERE ps.paper_format_id = pf.id AND ps.question_number = 4
);

INSERT INTO paper_sections (paper_format_id, question_number, unit, available_questions, questions_to_answer, marks_each)
SELECT pf.id, 5, NULL, 12, 10, 2
FROM paper_formats pf WHERE pf.name = 'B.Sc.-I Sem-I Differential Calculus'
AND NOT EXISTS (
  SELECT 1 FROM paper_sections ps WHERE ps.paper_format_id = pf.id AND ps.question_number = 5
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_questions_subject_id ON questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_unit ON questions(unit);
CREATE INDEX IF NOT EXISTS idx_subjects_class_id ON subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_subjects_semester_id ON subjects(semester_id);
CREATE INDEX IF NOT EXISTS idx_paper_sections_format_id ON paper_sections(paper_format_id);
CREATE INDEX IF NOT EXISTS idx_papers_subject_id ON papers(subject_id);
CREATE INDEX IF NOT EXISTS idx_papers_format_id ON papers(paper_format_id);
CREATE INDEX IF NOT EXISTS idx_paper_questions_paper_id ON paper_questions(paper_id);
CREATE INDEX IF NOT EXISTS idx_paper_questions_question_id ON paper_questions(question_id);