-- DanCloud Chat Feature - Database Schema
-- Run this script to add chat functionality to your existing database

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_id UUID,
  last_message_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(participant_1_id, participant_2_id),
  CHECK (participant_1_id != participant_2_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio')),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint for last_message_id after messages table is created
ALTER TABLE conversations 
ADD CONSTRAINT conversations_last_message_id_fkey 
FOREIGN KEY (last_message_id) REFERENCES messages(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- Create the get_or_create_conversation function
CREATE OR REPLACE FUNCTION get_or_create_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
    conversation_id UUID;
    ordered_user1_id UUID;
    ordered_user2_id UUID;
BEGIN
    -- Ensure consistent ordering of participants to avoid duplicates
    IF user1_id < user2_id THEN
        ordered_user1_id := user1_id;
        ordered_user2_id := user2_id;
    ELSE
        ordered_user1_id := user2_id;
        ordered_user2_id := user1_id;
    END IF;

    -- Try to find existing conversation
    SELECT id INTO conversation_id
    FROM conversations
    WHERE (participant_1_id = ordered_user1_id AND participant_2_id = ordered_user2_id)
       OR (participant_1_id = ordered_user2_id AND participant_2_id = ordered_user1_id);

    -- If no conversation exists, create one
    IF conversation_id IS NULL THEN
        INSERT INTO conversations (participant_1_id, participant_2_id)
        VALUES (ordered_user1_id, ordered_user2_id)
        RETURNING id INTO conversation_id;
    END IF;

    RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update conversation last message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET 
        last_message_id = NEW.id,
        last_message_at = NEW.created_at,
        updated_at = NOW()
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update conversation when new message is added
CREATE TRIGGER update_conversation_on_new_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Create trigger for updated_at on conversations
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for updated_at on messages
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for conversations
CREATE POLICY "Users can view their own conversations" ON conversations 
FOR SELECT USING (
    auth.uid() = participant_1_id OR auth.uid() = participant_2_id
);

CREATE POLICY "Users can create conversations they participate in" ON conversations 
FOR INSERT WITH CHECK (
    auth.uid() = participant_1_id OR auth.uid() = participant_2_id
);

CREATE POLICY "Users can update their own conversations" ON conversations 
FOR UPDATE USING (
    auth.uid() = participant_1_id OR auth.uid() = participant_2_id
);

CREATE POLICY "Users can delete their own conversations" ON conversations 
FOR DELETE USING (
    auth.uid() = participant_1_id OR auth.uid() = participant_2_id
);

-- Create RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" ON messages 
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE conversations.id = messages.conversation_id 
        AND (conversations.participant_1_id = auth.uid() OR conversations.participant_2_id = auth.uid())
    )
);

CREATE POLICY "Users can send messages in their conversations" ON messages 
FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE conversations.id = messages.conversation_id 
        AND (conversations.participant_1_id = auth.uid() OR conversations.participant_2_id = auth.uid())
    )
);

CREATE POLICY "Users can update their own messages" ON messages 
FOR UPDATE USING (
    auth.uid() = sender_id OR
    EXISTS (
        SELECT 1 FROM conversations 
        WHERE conversations.id = messages.conversation_id 
        AND (conversations.participant_1_id = auth.uid() OR conversations.participant_2_id = auth.uid())
    )
);

CREATE POLICY "Users can delete their own messages" ON messages 
FOR DELETE USING (
    auth.uid() = sender_id
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON conversations TO authenticated;
GRANT ALL ON messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_conversation(UUID, UUID) TO authenticated; 