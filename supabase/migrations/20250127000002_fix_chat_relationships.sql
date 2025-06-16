-- Fix chat table relationships
-- This ensures the foreign key constraints match what the chat service expects

-- Drop existing constraint if it exists
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS fk_conversations_last_message;

-- Add the correct foreign key constraint with the expected name
ALTER TABLE conversations 
ADD CONSTRAINT conversations_last_message_id_fkey 
FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL;

-- Ensure the messages table has the correct foreign key to conversations
-- (This should already exist from the table creation, but let's make sure)
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;
ALTER TABLE messages 
ADD CONSTRAINT messages_conversation_id_fkey 
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

-- Refresh the schema cache by updating table comments
COMMENT ON TABLE conversations IS 'Chat conversations between users - updated';
COMMENT ON TABLE messages IS 'Messages within conversations - updated';

-- Grant necessary permissions again to ensure they're properly set
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_conversation(UUID, UUID) TO authenticated; 