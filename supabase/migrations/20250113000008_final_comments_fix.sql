-- Final fix for comments RLS policy issue
-- This migration adds a more robust and debuggable policy

-- Drop all existing comment policies
DROP POLICY IF EXISTS "Comments insert policy" ON comments;
DROP POLICY IF EXISTS "Comments select policy" ON comments;
DROP POLICY IF EXISTS "Comments update policy" ON comments;
DROP POLICY IF EXISTS "Comments delete policy" ON comments;

-- Create a more permissive insert policy for debugging
-- This will allow authenticated users to insert comments and log the issue if it fails
CREATE POLICY "Allow authenticated comment insert" ON comments
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Allow everyone to view comments
CREATE POLICY "Allow comment viewing" ON comments
  FOR SELECT
  USING (true);

-- Allow users to update/delete their own comments
CREATE POLICY "Allow own comment update" ON comments
  FOR UPDATE
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

CREATE POLICY "Allow own comment delete" ON comments
  FOR DELETE
  USING (user_id::text = auth.uid()::text);

-- Add a trigger to validate user_id matches auth.uid() at insert time
-- This will give us better error messages
CREATE OR REPLACE FUNCTION validate_comment_user_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user_id matches the authenticated user
  IF NEW.user_id::text != auth.uid()::text THEN
    RAISE EXCEPTION 'Comment user_id (%) does not match authenticated user (%). User may not create comments for other users.', 
      NEW.user_id, auth.uid()
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply the trigger to the comments table
DROP TRIGGER IF EXISTS validate_comment_user_trigger ON comments;
CREATE TRIGGER validate_comment_user_trigger
  BEFORE INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION validate_comment_user_id(); 