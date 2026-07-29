-- Run this in your Supabase SQL Editor

-- 1. Create Profiles Table (For Custom Branding & Vanity URLs)
CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY, -- Clerk User ID
  vanity_url TEXT UNIQUE,
  logo_url TEXT,
  background_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 2. Create Transfers Table (For History Dashboard)
-- IMPORTANT: No files are saved here, only metadata.
CREATE TABLE transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Clerk User ID
  filename TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  status TEXT NOT NULL, -- 'completed', 'interrupted'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 3. Setup Storage for Branding Images
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true);

-- Storage Security Policies
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'branding' );

CREATE POLICY "Allow authenticated uploads" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'branding' AND auth.role() = 'authenticated' );

CREATE POLICY "Allow authenticated updates" 
ON storage.objects FOR UPDATE 
WITH CHECK ( bucket_id = 'branding' AND auth.role() = 'authenticated' );

CREATE POLICY "Allow authenticated deletes" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'branding' AND auth.role() = 'authenticated' );

-- NOTE: Since we are using Clerk for auth, Supabase's native auth.uid() won't match.
-- For this project, we'll use a Service Role Key on the backend API routes 
-- to securely bypass RLS and verify the user via Clerk instead.
-- So we don't need strict RLS on the tables if accessed exclusively via our Next.js API.
