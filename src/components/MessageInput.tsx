import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageInputProps {
  onSend: (message: string) => Promise<void>;
  disabled?: boolean;
  placeholder?: string;
}

const MessageInput: React.FC<MessageInputProps> = ({
  onSend,
  disabled = false,
  placeholder = 'Type a message...',
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    
    if (!trimmedMessage) {
      return;
    }

    if (trimmedMessage.length > 1000) {
      Alert.alert('Message Too Long', 'Messages cannot exceed 1000 characters.');
      return;
    }

    setSending(true);
    
    try {
      await onSend(trimmedMessage);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const canSend = message.trim().length > 0 && !sending && !disabled;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.textInput}
        value={message}
        onChangeText={setMessage}
        placeholder={placeholder}
        placeholderTextColor="#8E8E93"
        multiline
        maxLength={1000}
        editable={!disabled && !sending}
        returnKeyType="send"
        onSubmitEditing={canSend ? handleSend : undefined}
        blurOnSubmit={false}
      />
      
      <TouchableOpacity
        style={[
          styles.sendButton,
          canSend ? styles.sendButtonActive : styles.sendButtonInactive,
        ]}
        onPress={handleSend}
        disabled={!canSend}
      >
        <Ionicons
          name="send"
          size={20}
          color={canSend ? '#FFFFFF' : '#8E8E93'}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 100,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    backgroundColor: '#F2F2F7',
    borderRadius: 18,
    fontSize: 16,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
  },
  sendButtonInactive: {
    backgroundColor: '#F2F2F7',
  },
});

export default MessageInput; 