import { useEffect } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

// Configure foreground notification behaviour (alerts + badge + sound)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    // Only attempt to register when we have a logged-in user
    if (!user) return;

    let isMounted = true;

    const registerForPush = async () => {
      try {
        // Must be a physical device for push notifications
        if (!Device.isDevice) {
          console.warn('[PUSH] Must use physical device for push notifications');
          return;
        }

        // Check current permission status
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (finalStatus !== 'granted') {
          console.warn('[PUSH] Notification permissions not granted');
          return;
        }

        // Get Expo push token
        const { data: token } = await Notifications.getExpoPushTokenAsync({
          projectId: `${process.env.EXPO_PUBLIC_PROJECT_ID || 'c7566303-5470-4e09-8e3a-94d8392d4815'}`,
        });
        console.log('[PUSH] Expo push token:', token);

        if (!isMounted || !token) return;

        // On iOS we need to call permits for push.* categories maybe.
        if (Platform.OS === 'android') {
          Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        // Persist token in Supabase if changed
        const { data: existingUser, error: fetchError } = await supabase
          .from('users')
          .select('expo_push_token')
          .eq('id', user.id)
          .single();

        if (fetchError) {
          console.error('[PUSH] Failed to fetch user push token:', fetchError.message);
        }

        if (existingUser?.expo_push_token !== token) {
          const { error: updateError } = await supabase
            .from('users')
            .update({ expo_push_token: token })
            .eq('id', user.id);
          if (updateError) {
            console.error('[PUSH] Failed to update push token in Supabase:', updateError.message);
          } else {
            console.log('[PUSH] Push token saved to Supabase');
          }
        }
      } catch (err) {
        console.error('[PUSH] Error while registering for push notifications:', err);
      }
    };

    registerForPush();

    return () => {
      isMounted = false;
    };
  }, [user]);
} 