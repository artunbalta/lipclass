-- Spaced repetition items (SM-2 scheduling).
-- Populated from wrong quiz_attempts. Includes a denormalized question snapshot
-- so the review UI works even if the original slides_data is later edited.
--
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS sr_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  slide_number INTEGER NOT NULL,
  -- Denormalized question snapshot
  question TEXT NOT NULL,
  options JSONB NOT NULL,          -- ["opt0","opt1","opt2","opt3"]
  correct_answer INTEGER NOT NULL CHECK (correct_answer BETWEEN 0 AND 3),
  explanation TEXT,
  -- SM-2 scheduling state
  ease_factor FLOAT DEFAULT 2.5,
  interval_days INTEGER DEFAULT 1,
  repetitions INTEGER DEFAULT 0,
  due_date DATE DEFAULT CURRENT_DATE,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- One SR card per user × video × slide
  UNIQUE (user_id, video_id, slide_number)
);

CREATE INDEX IF NOT EXISTS idx_sr_items_user_due
  ON sr_items (user_id, due_date);

ALTER TABLE sr_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own sr_items" ON sr_items;
CREATE POLICY "Users manage own sr_items"
  ON sr_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
