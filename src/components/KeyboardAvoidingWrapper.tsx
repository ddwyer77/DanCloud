import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  View,
  StyleSheet,
  Dimensions,
  KeyboardEvent,
} from 'react-native';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';

interface KeyboardAvoidingWrapperProps {
  children: React.ReactNode;
  style?: any;
  contentContainerStyle?: any;
  behavior?: 'height' | 'position' | 'padding';
  extraOffset?: number;
  enabled?: boolean;
}

const BOTTOM_AUDIO_PLAYER_HEIGHT = 114; // Height of BottomAudioPlayer when visible

const KeyboardAvoidingWrapper: React.FC<KeyboardAvoidingWrapperProps> = ({
  children,
  style,
  contentContainerStyle,
  behavior = Platform.OS === 'ios' ? 'padding' : 'height',
  extraOffset = 0,
  enabled = true,
}) => {
  const { currentTrack } = useAudioPlayer();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e: KeyboardEvent) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Calculate dynamic offset based on audio player visibility and keyboard state
  const dynamicOffset = React.useMemo(() => {
    let offset = extraOffset;
    
    // Add audio player height if it's visible
    if (currentTrack) {
      offset += BOTTOM_AUDIO_PLAYER_HEIGHT;
    }

    // On Android, we might need additional adjustment
    if (Platform.OS === 'android' && keyboardHeight > 0) {
      offset += 20; // Additional padding for Android
    }

    return offset;
  }, [currentTrack, keyboardHeight, extraOffset]);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  if (!enabled) {
    return <View style={[styles.container, style]}>{children}</View>;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={behavior}
      keyboardVerticalOffset={dynamicOffset}
    >
      <TouchableWithoutFeedback onPress={dismissKeyboard}>
        <View style={[styles.content, contentContainerStyle]}>
          {children}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default KeyboardAvoidingWrapper; 