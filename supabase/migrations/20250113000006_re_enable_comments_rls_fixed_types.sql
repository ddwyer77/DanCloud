-- Re-enable RLS on comments with proper type casting
-- Fix the text = uuid operator error

-- Re-enable RLS on comments table
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON comments;
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;

-- Create a simple policy that allows authenticated users to insert comments
CREATE POLICY "Authenticated users can insert comments" ON comments 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Allow viewing all comments
CREATE POLICY "Anyone can view comments" ON comments 
FOR SELECT 
USING (true);

-- Allow users to update their own comments (with proper casting)
CREATE POLICY "Users can update own comments" ON comments 
FOR UPDATE 
USING (auth.role() = 'authenticated' AND auth.uid()::text = user_id::text);

-- Allow users to delete their own comments (with proper casting)
CREATE POLICY "Users can delete own comments" ON comments 
FOR DELETE 
USING (auth.role() = 'authenticated' AND auth.uid()::text = user_id::text); 