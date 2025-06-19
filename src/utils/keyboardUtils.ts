import { Keyboard, Platform } from 'react-native';

export interface KeyboardInfo {
  height: number;
  isVisible: boolean;
}

class KeyboardManager {
  private listeners: Set<(info: KeyboardInfo) => void> = new Set();
  private keyboardInfo: KeyboardInfo = { height: 0, isVisible: false };

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    Keyboard.addListener(showEvent, (e) => {
      this.keyboardInfo = {
        height: e.endCoordinates.height,
        isVisible: true,
      };
      this.notifyListeners();
    });

    Keyboard.addListener(hideEvent, () => {
      this.keyboardInfo = {
        height: 0,
        isVisible: false,
      };
      this.notifyListeners();
    });
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.keyboardInfo));
  }

  public subscribe(callback: (info: KeyboardInfo) => void) {
    this.listeners.add(callback);
    // Immediately call with current state
    callback(this.keyboardInfo);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getKeyboardInfo(): KeyboardInfo {
    return this.keyboardInfo;
  }

  public dismiss() {
    console.log('[KEYBOARD] Dismissing keyboard programmatically');
    Keyboard.dismiss();
  }

  public isVisible(): boolean {
    return this.keyboardInfo.isVisible;
  }

  public getHeight(): number {
    return this.keyboardInfo.height;
  }
}

// Export singleton instance
export const keyboardManager = new KeyboardManager();

// Convenience functions
export const dismissKeyboard = () => keyboardManager.dismiss();
export const isKeyboardVisible = () => keyboardManager.isVisible();
export const getKeyboardHeight = () => keyboardManager.getHeight();

// Hook for React components
export const useKeyboard = () => {
  const [keyboardInfo, setKeyboardInfo] = React.useState<KeyboardInfo>(
    keyboardManager.getKeyboardInfo()
  );

  React.useEffect(() => {
    const unsubscribe = keyboardManager.subscribe(setKeyboardInfo);
    return unsubscribe;
  }, []);

  return keyboardInfo;
};

// React import for the hook
import React from 'react'; 