-- Classroom management schema
-- classrooms: teacher creates, students join via 6-char code
-- assignments: teacher assigns a video to a classroom with optional deadline

CREATE TABLE IF NOT EXISTS classrooms (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name       TEXT NOT NULL,
  subject    TEXT,
  grade      TEXT,
  join_code  CHAR(6) UNIQUE NOT NULL DEFAULT upper(substring(md5(random()::text), 1, 6)),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classroom_members (
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE NOT NULL,
  student_id   UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (classroom_id, student_id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id UUID REFERENCES classrooms(id) ON DELETE CASCADE NOT NULL,
  video_id     UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  title        TEXT,
  deadline     TIMESTAMPTZ,
  created_by   UUID REFERENCES profiles(id) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (classroom_id, video_id)
);

-- RLS
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_own_classrooms" ON classrooms
  FOR ALL USING (teacher_id = auth.uid());

CREATE POLICY "student_view_joined_classrooms" ON classrooms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classroom_members
      WHERE classroom_id = classrooms.id AND student_id = auth.uid()
    )
  );

-- Any authenticated user can look up a classroom by join_code (needed for join flow)
CREATE POLICY "lookup_by_join_code" ON classrooms
  FOR SELECT USING (auth.uid() IS NOT NULL);

ALTER TABLE classroom_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_manage_members" ON classroom_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM classrooms WHERE id = classroom_id AND teacher_id = auth.uid())
  );

CREATE POLICY "student_own_memberships" ON classroom_members
  FOR ALL USING (student_id = auth.uid());

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "teacher_manage_assignments" ON assignments
  FOR ALL USING (created_by = auth.uid());

CREATE POLICY "student_view_assignments" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM classroom_members
      WHERE classroom_id = assignments.classroom_id AND student_id = auth.uid()
    )
  );
