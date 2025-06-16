import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '../styles/theme';

interface AddToPlaylistButtonProps {
  trackId: string;
  trackTitle?: string;
  size?: number;
  color?: string;
  style?: any;
}

export default function AddToPlaylistButton({ 
  trackId, 
  trackTitle, 
  size = 24, 
  color = colors.gray600,
  style 
}: AddToPlaylistButtonProps) {
  const navigation = useNavigation<any>();

  const handlePress = () => {
    console.log('AddToPlaylistButton pressed, navigating to AddToPlaylist with trackId:', trackId);
    try {
      navigation.navigate('AddToPlaylist', { 
        trackId, 
        trackTitle 
      });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={handlePress}
    >
      <Ionicons 
        name="list-outline" 
        size={size} 
        color={color} 
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: spacing.sm,
  },
}); 