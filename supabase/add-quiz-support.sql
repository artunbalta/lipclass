-- Quiz slides — student answer tracking for non-blocking quizzes.
--
-- Slide-level quiz data (question, options, correctAnswer, explanation) lives
-- in videos.slides_data JSONB on the slide object with slideType='quiz'.
-- This table only records per-attempt analytics so the teacher can see who
-- answered what.
--
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  slide_number INTEGER NOT NULL,
  student_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  selected_option INTEGER NOT NULL CHECK (selected_option BETWEEN 0 AND 3),
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_video_slide
  ON quiz_attempts (video_id, slide_number);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student
  ON quiz_attempts (student_id, created_at DESC);

ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- A student can insert their own attempt
DROP POLICY IF EXISTS "Students insert own attempts" ON quiz_attempts;
CREATE POLICY "Students insert own attempts"
  ON quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- A student can read their own history
DROP POLICY IF EXISTS "Students read own attempts" ON quiz_attempts;
CREATE POLICY "Students read own attempts"
  ON quiz_attempts FOR SELECT
  USING (auth.uid() = student_id);

-- The teacher who owns the video can read all attempts on it
DROP POLICY IF EXISTS "Teachers read own video attempts" ON quiz_attempts;
CREATE POLICY "Teachers read own video attempts"
  ON quiz_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = quiz_attempts.video_id
      AND videos.teacher_id = auth.uid()
    )
  );
