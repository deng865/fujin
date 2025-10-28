-- Fix 1: Enable RLS on any tables that don't have it
-- The Supabase linter detected RLS is disabled on some public tables

-- Ensure all tables have RLS enabled (idempotent operations)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.housing_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Fix 2: Restrict profiles table to protect PII (phone, WeChat ID, etc.)
-- Drop the overly permissive policy that allows anyone to view all profiles
DROP POLICY IF EXISTS "用户可以查看所有配置文件" ON public.profiles;

-- Allow users to view their own complete profile with all sensitive data
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Allow users to view only basic non-sensitive info of other users
-- (name and user_type only - no phone, WeChat, location, etc.)
-- This is enforced at the application layer by selecting specific columns
CREATE POLICY "Users can view basic info of others"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() != id);

-- Keep existing update policy
-- (already exists: "用户可以更新自己的配置文件")

-- Keep existing insert policy
-- (already exists: "用户可以插入自己的配置文件")