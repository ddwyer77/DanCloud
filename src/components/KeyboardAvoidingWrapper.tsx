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
  ScrollView,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';

interface KeyboardAvoidingWrapperProps {
  children: React.ReactNode;
  style?: any;
  contentContainerStyle?: any;
  behavior?: 'height' | 'position' | 'padding';
  extraOffset?: number;
  enabled?: boolean;
  enablePanGesture?: boolean;
  enableTouchDismiss?: boolean;
  scrollEnabled?: boolean;
}

const BOTTOM_AUDIO_PLAYER_HEIGHT = 114; // Height of BottomAudioPlayer when visible

const KeyboardAvoidingWrapper: React.FC<KeyboardAvoidingWrapperProps> = ({
  children,
  style,
  contentContainerStyle,
  behavior = Platform.OS === 'ios' ? 'padding' : 'height',
  extraOffset = 0,
  enabled = true,
  enablePanGesture = true,
  enableTouchDismiss = true,
  scrollEnabled = false,
}) => {
  const { currentTrack } = useAudioPlayer();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e: KeyboardEvent) => {
        setKeyboardHeight(e.endCoordinates.height);
        setIsKeyboardVisible(true);
        console.log('[KEYBOARD] Keyboard shown, height:', e.endCoordinates.height);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
        console.log('[KEYBOARD] Keyboard hidden');
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
    console.log('[KEYBOARD] Dismissing keyboard');
    Keyboard.dismiss();
  };

  // Handle pan gesture for swiping down to dismiss keyboard
  const onGestureEvent = (event: any) => {
    if (!enablePanGesture || !isKeyboardVisible) return;
    
    const { translationY, velocityY } = event.nativeEvent;
    
    // If user swipes down significantly or with high velocity, dismiss keyboard
    if (translationY > 50 || velocityY > 800) {
      dismissKeyboard();
    }
  };

  const onHandlerStateChange = (event: any) => {
    if (!enablePanGesture || !isKeyboardVisible) return;
    
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;
      
      // Dismiss keyboard on significant downward gesture
      if (translationY > 30 || velocityY > 500) {
        dismissKeyboard();
      }
    }
  };

  if (!enabled) {
    return <View style={[styles.container, style]}>{children}</View>;
  }

  const content = enableTouchDismiss ? (
    <TouchableWithoutFeedback onPress={dismissKeyboard}>
      <View style={[styles.content, contentContainerStyle]}>
        {children}
      </View>
    </TouchableWithoutFeedback>
  ) : (
    <View style={[styles.content, contentContainerStyle]}>
      {children}
    </View>
  );

  const wrappedContent = enablePanGesture ? (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
      minDist={10}
    >
      <View style={styles.gestureContainer}>
        {content}
      </View>
    </PanGestureHandler>
  ) : content;

  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={behavior}
      keyboardVerticalOffset={dynamicOffset}
    >
      {wrappedContent}
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
  gestureContainer: {
    flex: 1,
  },
});

export default KeyboardAvoidingWrapper; 