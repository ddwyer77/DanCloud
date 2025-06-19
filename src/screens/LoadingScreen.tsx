import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

const LoadingScreen = () => {
  useEffect(() => {
    console.log('[DEBUG] LoadingScreen mounted');
    const startTime = Date.now();
    
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      console.log(`[DEBUG] LoadingScreen displayed for ${elapsed.toFixed(1)}s`);
      
      // Alert if loading screen is displayed too long
      if (elapsed > 15) {
        console.error('[DEBUG] LoadingScreen has been displayed for over 15 seconds - possible hang!');
      }
    }, 3000);

    return () => {
      console.log('[DEBUG] LoadingScreen unmounted');
      clearInterval(interval);
    };
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.text}>Loading DanCloud...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default LoadingScreen; 