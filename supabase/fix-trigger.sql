-- Fix handle_new_user trigger to handle manual user creation
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),
    COALESCE(
      CASE 
        WHEN NEW.raw_user_meta_data->>'role' IN ('teacher', 'student') 
        THEN (NEW.raw_user_meta_data->>'role')::user_role
        ELSE NULL
      END,
      'student'::user_role
    )
  )
  ON CONFLICT (id) DO NOTHING; -- Handle case where profile already exists
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
