-- Debug and fix RLS policies for comments table
-- This migration will help identify and fix the RLS policy violation issue

-- First, let's create a debug function to see what auth.uid() actually returns
CREATE OR REPLACE FUNCTION debug_auth_context()
RETURNS json AS $$
BEGIN
  RETURN json_build_object(
    'auth_uid', auth.uid(),
    'auth_role', auth.role(),
    'auth_jwt', auth.jwt()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop all existing comment policies
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON comments;
DROP POLICY IF EXISTS "Users can view all comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
DROP POLICY IF EXISTS "Users can insert comments" ON comments;

-- Create a more robust insert policy with better error handling
CREATE POLICY "Comments insert policy" ON comments
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    user_id IS NOT NULL AND
    auth.uid() IS NOT NULL AND
    user_id::text = auth.uid()::text
  );

-- Allow everyone to view comments
CREATE POLICY "Comments select policy" ON comments
  FOR SELECT
  USING (true);

-- Allow users to update their own comments
CREATE POLICY "Comments update policy" ON comments
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    user_id IS NOT NULL AND
    auth.uid() IS NOT NULL AND
    user_id::text = auth.uid()::text
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    user_id IS NOT NULL AND
    auth.uid() IS NOT NULL AND
    user_id::text = auth.uid()::text
  );

-- Allow users to delete their own comments
CREATE POLICY "Comments delete policy" ON comments
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    user_id IS NOT NULL AND
    auth.uid() IS NOT NULL AND
    user_id::text = auth.uid()::text
  );

-- Grant execute permission on the debug function to authenticated users
GRANT EXECUTE ON FUNCTION debug_auth_context() TO authenticated; 