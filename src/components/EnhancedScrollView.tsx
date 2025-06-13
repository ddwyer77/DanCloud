import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Platform,
  Keyboard,
  ScrollViewProps,
} from 'react-native';
import {
  PanGestureHandler,
  GestureHandlerRootView,
  State,
} from 'react-native-gesture-handler';

interface EnhancedScrollViewProps extends ScrollViewProps {
  dismissKeyboardOnSwipe?: boolean;
  swipeThreshold?: number;
}

const EnhancedScrollView: React.FC<EnhancedScrollViewProps> = ({
  children,
  dismissKeyboardOnSwipe = true,
  swipeThreshold = 50,
  style,
  contentContainerStyle,
  keyboardShouldPersistTaps = 'handled',
  showsVerticalScrollIndicator = false,
  ...props
}) => {
  const handleSwipeGesture = (event: any) => {
    if (!dismissKeyboardOnSwipe) return;

    const { translationY, state } = event.nativeEvent;

    // Dismiss keyboard on significant downward swipe
    if (state === State.END && translationY > swipeThreshold) {
      Keyboard.dismiss();
    }
  };

  const scrollViewContent = (
    <ScrollView
      style={[styles.container, style]}
      contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      {...props}
    >
      {children}
    </ScrollView>
  );

  // Wrap with gesture handler for swipe-to-dismiss functionality
  if (dismissKeyboardOnSwipe) {
    return (
      <GestureHandlerRootView style={styles.gestureContainer}>
        <PanGestureHandler onHandlerStateChange={handleSwipeGesture}>
          {scrollViewContent}
        </PanGestureHandler>
      </GestureHandlerRootView>
    );
  }

  return scrollViewContent;
};

const styles = StyleSheet.create({
  gestureContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
  },
});

export default EnhancedScrollView; 