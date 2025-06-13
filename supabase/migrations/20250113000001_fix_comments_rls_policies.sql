-- Fix RLS policies for comments to handle UUID type matching properly
-- This resolves the "new row violates row-level security policy" error

-- Drop existing comment policies
DROP POLICY IF EXISTS "Users can insert comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;

-- Create new policies with explicit UUID to text casting for proper comparison
CREATE POLICY "Users can insert comments" ON comments 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own comments" ON comments 
FOR UPDATE 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own comments" ON comments 
FOR DELETE 
USING (auth.uid()::text = user_id::text);

-- Also ensure the view policy is correct
DROP POLICY IF EXISTS "Users can view all comments" ON comments;
CREATE POLICY "Users can view all comments" ON comments 
FOR SELECT 
USING (true); 