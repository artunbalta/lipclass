-- RAG Support: teacher_documents table + teacher-documents storage bucket
-- Run this SQL in Supabase SQL Editor

-- ==========================================
-- TEACHER DOCUMENTS TABLE
-- ==========================================

CREATE TABLE teacher_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  storage_path TEXT NOT NULL,
  status TEXT DEFAULT 'uploaded', -- 'uploaded', 'processing', 'embedded', 'failed'
  chunk_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_teacher_documents_teacher_id ON teacher_documents(teacher_id);
CREATE INDEX idx_teacher_documents_status ON teacher_documents(status);

-- Enable RLS
ALTER TABLE teacher_documents ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Teachers can view own documents"
  ON teacher_documents FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert own documents"
  ON teacher_documents FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own documents"
  ON teacher_documents FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own documents"
  ON teacher_documents FOR DELETE
  USING (auth.uid() = teacher_id);

-- ==========================================
-- TEACHER DOCUMENTS STORAGE BUCKET POLICIES
-- ==========================================
-- NOTE: First create the 'teacher-documents' bucket in Supabase Dashboard
-- Settings: Private bucket

CREATE POLICY "Teachers can upload own documents to storage"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'teacher-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Teachers can read own documents from storage"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'teacher-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Teachers can delete own documents from storage"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'teacher-documents' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
