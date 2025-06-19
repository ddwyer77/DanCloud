import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Import contexts
import { AuthProvider } from './src/contexts/AuthContext';
import { AudioPlayerProvider } from './src/contexts/AudioPlayerContext';

// Import components
import BottomAudioPlayer from './src/components/BottomAudioPlayer';

// Import navigation
import { AppNavigator } from './src/navigation/AppNavigator';

export default function App() {
  console.log('[APP] Starting DanCloud app...');
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <AudioPlayerProvider>
            <View style={{ flex: 1 }}>
              <AppNavigator />
              <BottomAudioPlayer />
              <StatusBar style="auto" />
            </View>
          </AudioPlayerProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
