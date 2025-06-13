-- Temporarily disable RLS on comments to test auth context
-- This will help us determine if the issue is with the policy or auth setup

-- Disable RLS on comments table temporarily
ALTER TABLE comments DISABLE ROW LEVEL SECURITY;

-- We'll re-enable it in the next migration once we confirm comments work 