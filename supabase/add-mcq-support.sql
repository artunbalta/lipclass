-- MCQ/Quiz Support Migration
-- Adds quizzes table, quiz_attempts table, RLS policies, and storage bucket

-- ============================================================
-- 1. Quizzes Table
-- ============================================================
CREATE TABLE IF NOT EXISTS quizzes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES teacher_documents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  topic TEXT,
  difficulty TEXT DEFAULT 'medium',
  question_type TEXT DEFAULT 'mixed',
  language TEXT DEFAULT 'tr',
  num_questions INTEGER DEFAULT 15,
  status TEXT DEFAULT 'draft',
  summary TEXT,
  questions_data JSONB,
  source_type TEXT DEFAULT 'upload',
  source_text TEXT,
  uploaded_file_path TEXT,
  uploaded_file_name TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quizzes_teacher_id ON quizzes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_status ON quizzes(status);
CREATE INDEX IF NOT EXISTS idx_quizzes_subject ON quizzes(subject);
CREATE INDEX IF NOT EXISTS idx_quizzes_grade ON quizzes(grade);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER handle_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can view their own quizzes"
  ON quizzes FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Anyone can view published quizzes"
  ON quizzes FOR SELECT
  USING (status = 'published');

CREATE POLICY "Teachers can create their own quizzes"
  ON quizzes FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own quizzes"
  ON quizzes FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own quizzes"
  ON quizzes FOR DELETE
  USING (auth.uid() = teacher_id);

-- ============================================================
-- 2. Quiz Attempts Table
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  answers JSONB NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  time_spent INTEGER,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student_id ON quiz_attempts(student_id);

-- RLS
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can insert their own attempts"
  ON quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view their own attempts"
  ON quiz_attempts FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view attempts for their quizzes"
  ON quiz_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quizzes
      WHERE quizzes.id = quiz_attempts.quiz_id
        AND quizzes.teacher_id = auth.uid()
    )
  );

-- ============================================================
-- 3. Storage Bucket for Quiz Documents
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-documents', 'quiz-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Teachers can upload to their own folder
CREATE POLICY "Teachers can upload quiz documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'quiz-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Teachers can read their own quiz documents
CREATE POLICY "Teachers can read own quiz documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'quiz-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Teachers can delete their own quiz documents
CREATE POLICY "Teachers can delete own quiz documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'quiz-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Service role has full access (for API routes)
CREATE POLICY "Service role full access to quiz documents"
  ON storage.objects FOR ALL
  USING (bucket_id = 'quiz-documents' AND auth.role() = 'service_role')
  WITH CHECK (bucket_id = 'quiz-documents' AND auth.role() = 'service_role');
