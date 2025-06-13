-- Simple and direct fix for comments RLS policies
-- Use only text casting to avoid type conflicts

-- Drop all existing comment policies
DROP POLICY IF EXISTS "Users can view all comments" ON comments;
DROP POLICY IF EXISTS "Users can insert comments" ON comments;
DROP POLICY IF EXISTS "Users can update own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON comments;

-- Create policies with simple text casting
CREATE POLICY "Users can view all comments" ON comments 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert comments" ON comments 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own comments" ON comments 
FOR UPDATE 
USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own comments" ON comments 
FOR DELETE 
USING (auth.uid()::text = user_id::text); 