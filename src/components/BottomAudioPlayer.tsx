import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';

const { width } = Dimensions.get('window');

const BottomAudioPlayer = () => {
  const {
    isPlaying,
    currentTrack,
    position,
    duration,
    isLoading,
    isShuffleEnabled,
    pauseTrack,
    resumeTrack,
    seekTo,
    stopTrack,
    playNext,
    playPrevious,
    toggleShuffle,
  } = useAudioPlayer();

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
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration}
          value={position}
          onSlidingComplete={handleSeek}
          minimumTrackTintColor="#ff5500"
          maximumTrackTintColor="#ccc"
          thumbTintColor="#ff5500"
        />
      </View>

      {/* Player Controls */}
      <View style={styles.playerContainer}>
        {/* Track Info */}
        <View style={styles.trackInfo}>
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
        </View>

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
            {/* Previous */}
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={playPrevious}
            >
              <Ionicons name="play-skip-back" size={20} color="#666" />
            </TouchableOpacity>

            {/* Play/Pause */}
            <TouchableOpacity
              style={[styles.controlButton, styles.playButton]}
              onPress={handlePlayPause}
              disabled={isLoading}
            >
              {isLoading ? (
                <Ionicons name="hourglass" size={24} color="#fff" />
              ) : isPlaying ? (
                <Ionicons name="pause" size={24} color="#fff" />
              ) : (
                <Ionicons name="play" size={24} color="#fff" />
              )}
            </TouchableOpacity>

            {/* Next */}
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={playNext}
            >
              <Ionicons name="play-skip-forward" size={20} color="#666" />
            </TouchableOpacity>

            {/* Shuffle */}
            <TouchableOpacity 
              style={styles.controlButton} 
              onPress={toggleShuffle}
            >
              <Ionicons 
                name="shuffle" 
                size={18} 
                color={isShuffleEnabled ? "#ff5500" : "#ccc"} 
              />
            </TouchableOpacity>

            {/* Close/Stop */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={stopTrack}
            >
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 83 : 60, // iOS tab bar: 83px, Android: 60px
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#f0f0f0',
  },
  slider: {
    width: '100%',
    height: 4,
    marginTop: -2,
  },
  sliderThumb: {
    backgroundColor: '#ff5500',
    width: 12,
    height: 12,
  },
  sliderTrack: {
    height: 2,
  },
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 12, // Removed extra padding since we're above tab bar now
  },
  trackInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumArt: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  textInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  artistName: {
    fontSize: 12,
    color: '#666',
  },
  controls: {
    alignItems: 'center',
  },
  timeContainer: {
    marginBottom: 8,
  },
  timeText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    padding: 8,
    marginHorizontal: 4,
  },
  playButton: {
    backgroundColor: '#ff5500',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
});

export default BottomAudioPlayer; 