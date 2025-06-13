import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Keyboard,
  KeyboardEvent,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { colors, typography, spacing, borderRadius, shadows, layout } from '../styles/theme';

const { width } = Dimensions.get('window');

const EnhancedBottomAudioPlayer = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [translateY] = useState(new Animated.Value(0));
  
  const {
    isPlaying,
    currentTrack,
    position,
    duration,
    isLoading,
    pauseTrack,
    resumeTrack,
    seekTo,
    stopTrack,
  } = useAudioPlayer();

  // Handle keyboard show/hide with animation
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      (e: KeyboardEvent) => {
        setKeyboardHeight(e.endCoordinates.height);
        
        // Animate the player to move above the keyboard
        Animated.timing(translateY, {
          toValue: -e.endCoordinates.height,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        
        // Animate the player back to bottom
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, [translateY]);

  // Don't render if no track is loaded
  if (!currentTrack) {
    return null;
  }

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pauseTrack();
    } else {
      await resumeTrack();
    }
  };

  const handleSeek = async (value: number) => {
    await seekTo(value);
  };

  const progressPercent = duration > 0 ? position / duration : 0;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
        },
      ]}
    >
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration}
          value={position}
          onSlidingComplete={handleSeek}
          minimumTrackTintColor={colors.secondary}
          maximumTrackTintColor={colors.gray300}
          thumbTintColor={colors.secondary}
          disabled={isLoading}
        />
      </View>

      {/* Player Controls */}
      <View style={styles.playerContainer}>
        {/* Track Info */}
        <TouchableOpacity style={styles.trackInfo} activeOpacity={0.7}>
          <Image
            source={{
              uri: currentTrack.cover_image_url || 'https://via.placeholder.com/50',
            }}
            style={styles.albumArt}
          />
          <View style={styles.textInfo}>
            <Text style={styles.trackTitle} numberOfLines={1}>
              {currentTrack.title}
            </Text>
            <Text style={styles.artistName} numberOfLines={1}>
              {currentTrack.user?.username || 'Unknown Artist'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Time Display */}
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {formatTime(position)} / {formatTime(duration)}
            </Text>
          </View>

          {/* Control Buttons */}
          <View style={styles.buttonContainer}>
            {/* Previous (placeholder for future) */}
            <TouchableOpacity 
              style={[styles.controlButton, styles.disabledButton]} 
              disabled
              accessibilityLabel="Previous track (coming soon)"
            >
              <Ionicons name="play-skip-back" size={20} color={colors.gray400} />
            </TouchableOpacity>

            {/* Play/Pause */}
            <TouchableOpacity
              style={[styles.controlButton, styles.playButton]}
              onPress={handlePlayPause}
              disabled={isLoading}
              accessibilityRole="button"
              accessibilityLabel={isLoading ? 'Loading' : isPlaying ? 'Pause' : 'Play'}
              accessibilityState={{ disabled: isLoading }}
            >
              {isLoading ? (
                <Ionicons name="hourglass" size={24} color={colors.white} />
              ) : isPlaying ? (
                <Ionicons name="pause" size={24} color={colors.white} />
              ) : (
                <Ionicons name="play" size={24} color={colors.white} />
              )}
            </TouchableOpacity>

            {/* Next (placeholder for future) */}
            <TouchableOpacity 
              style={[styles.controlButton, styles.disabledButton]} 
              disabled
              accessibilityLabel="Next track (coming soon)"
            >
              <Ionicons name="play-skip-forward" size={20} color={colors.gray400} />
            </TouchableOpacity>

            {/* Close/Stop */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={stopTrack}
              accessibilityRole="button"
              accessibilityLabel="Stop playback"
            >
              <Ionicons name="close" size={20} color={colors.gray600} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.lg,
    // Ensure it's above other content
    zIndex: 1000,
    elevation: 1000,
  },
  progressContainer: {
    height: 4,
    backgroundColor: colors.gray200,
  },
  slider: {
    width: '100%',
    height: 4,
    marginTop: -2,
  },
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing['2xl'] + 2 : spacing.md, // Account for bottom safe area
  },
  trackInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  albumArt: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.sm,
    marginRight: spacing.md,
    backgroundColor: colors.gray200,
  },
  textInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  artistName: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
  },
  controls: {
    alignItems: 'center',
  },
  timeContainer: {
    marginBottom: spacing.xs,
  },
  timeText: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButton: {
    marginHorizontal: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  playButton: {
    backgroundColor: colors.primary,
    marginHorizontal: spacing.sm,
    padding: spacing.md,
    minWidth: 48,
    minHeight: 48,
    ...shadows.sm,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default EnhancedBottomAudioPlayer; 