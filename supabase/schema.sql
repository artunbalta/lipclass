-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('teacher', 'student');
CREATE TYPE video_status AS ENUM ('draft', 'processing', 'published', 'failed');
CREATE TYPE video_difficulty AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE video_tone AS ENUM ('formal', 'friendly', 'energetic');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role user_role NOT NULL,
  avatar_url TEXT,
  school TEXT,
  subject TEXT, -- For teachers
  grade TEXT, -- For students (e.g., "8. Sınıf")
  bio TEXT,
  reference_video_url TEXT, -- For teachers
  reference_video_status TEXT DEFAULT 'none', -- 'none', 'processing', 'ready'
  saved_videos UUID[] DEFAULT '{}', -- For students
  watched_videos UUID[] DEFAULT '{}', -- For students
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Videos table
CREATE TABLE videos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  teacher_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  topic TEXT NOT NULL,
  thumbnail_url TEXT,
  video_url TEXT,
  duration INTEGER, -- in seconds
  status video_status DEFAULT 'draft',
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  prompt TEXT NOT NULL,
  tone video_tone DEFAULT 'friendly',
  includes_problem_solving BOOLEAN DEFAULT false,
  problem_count INTEGER,
  difficulty video_difficulty,
  estimated_duration INTEGER, -- in minutes
  language TEXT DEFAULT 'tr', -- 'tr' or 'en'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Video analytics table
CREATE TABLE video_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  watched_duration INTEGER DEFAULT 0, -- seconds watched
  completed BOOLEAN DEFAULT false,
  liked BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_videos_teacher_id ON videos(teacher_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_subject ON videos(subject);
CREATE INDEX idx_videos_grade ON videos(grade);
CREATE INDEX idx_videos_created_at ON videos(created_at DESC);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_video_analytics_video_id ON video_analytics(video_id);
CREATE INDEX idx_video_analytics_user_id ON video_analytics(user_id);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_analytics ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Anyone can view published teacher profiles"
  ON profiles FOR SELECT
  USING (role = 'teacher' AND reference_video_status = 'ready');

-- Videos policies
CREATE POLICY "Anyone can view published videos"
  ON videos FOR SELECT
  USING (status = 'published');

CREATE POLICY "Teachers can view their own videos"
  ON videos FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create their own videos"
  ON videos FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own videos"
  ON videos FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own videos"
  ON videos FOR DELETE
  USING (auth.uid() = teacher_id);

-- Video analytics policies
CREATE POLICY "Users can insert their own analytics"
  ON video_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own analytics"
  ON video_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view analytics for their videos"
  ON video_analytics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM videos
      WHERE videos.id = video_analytics.video_id
      AND videos.teacher_id = auth.uid()
    )
  );

-- Functions and Triggers

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_video_view()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE videos
  SET view_count = view_count + 1
  WHERE id = NEW.video_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to increment views when analytics record is created
CREATE TRIGGER increment_view_on_analytics
  AFTER INSERT ON video_analytics
  FOR EACH ROW EXECUTE FUNCTION public.increment_video_view();
