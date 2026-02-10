-- Image Extraction Support

-- 1. Create document_images table
CREATE TABLE IF NOT EXISTS document_images (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  document_id UUID REFERENCES teacher_documents(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  page_index INTEGER NOT NULL, -- 0-based page index
  image_index INTEGER NOT NULL, -- Index on page
  storage_path TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  caption TEXT, -- Optional caption/context
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE document_images ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
CREATE POLICY "Teachers can view own extracted images"
ON document_images FOR SELECT
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert own extracted images"
ON document_images FOR INSERT
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own extracted images"
ON document_images FOR DELETE
USING (auth.uid() = teacher_id);

CREATE POLICY "Service role full access to document_images"
ON document_images FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');
