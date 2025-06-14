import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SnippetSelectorProps {
  audioUri: string;
  duration: number; // Duration in seconds
  onSnippetSelect: (startTime: number, endTime: number) => void;
  initialStartTime?: number;
  initialEndTime?: number;
}

const SnippetSelector: React.FC<SnippetSelectorProps> = ({
  audioUri,
  duration,
  onSnippetSelect,
  initialStartTime = 0,
  initialEndTime = Math.min(30, duration),
}) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [isLoading, setIsLoading] = useState(false);

  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    loadAudio();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [audioUri]);

  useEffect(() => {
    // Ensure snippet is exactly 30 seconds
    if (endTime - startTime > 30) {
      setEndTime(startTime + 30);
    }
    
    // Round values to integers before passing to callback
    onSnippetSelect(Math.round(startTime), Math.round(endTime));
  }, [startTime, endTime]);

  const loadAudio = async () => {
    try {
      setIsLoading(true);
      
      // Unload previous sound
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // Load new sound
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      soundRef.current = newSound;
    } catch (error) {
      console.error('Error loading audio:', error);
      Alert.alert('Error', 'Failed to load audio file');
    } finally {
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setCurrentPosition(status.positionMillis / 1000);
      
      // Stop at end of snippet
      if (status.positionMillis / 1000 >= endTime) {
        pauseAudio();
        setCurrentPosition(startTime);
        if (sound) {
          sound.setPositionAsync(startTime * 1000);
        }
      }
    }
  };

  const playSnippet = async () => {
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        // Start from snippet start time
        await sound.setPositionAsync(startTime * 1000);
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing snippet:', error);
    }
  };

  const pauseAudio = async () => {
    if (sound && isPlaying) {
      try {
        await sound.pauseAsync();
        setIsPlaying(false);
      } catch (error) {
        console.error('Error pausing audio:', error);
      }
    }
  };

  const handleStartTimeChange = (value: number) => {
    const newStartTime = Math.round(Math.max(0, Math.min(value, duration - 30)));
    setStartTime(newStartTime);
    
    // Adjust end time to maintain 30-second snippet
    const newEndTime = Math.min(newStartTime + 30, duration);
    setEndTime(newEndTime);
    
    // Update playback position if not playing
    if (!isPlaying && sound) {
      sound.setPositionAsync(newStartTime * 1000);
      setCurrentPosition(newStartTime);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const snippetDuration = endTime - startTime;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select 30-Second Snippet</Text>
      <Text style={styles.subtitle}>Choose the best part of your track for discovery</Text>

      {/* Waveform visualization placeholder */}
      <View style={styles.waveformContainer}>
        <View style={styles.waveform}>
          {/* Simple bars to represent waveform */}
          {Array.from({ length: 20 }, (_, i) => (
            <View
              key={i}
              style={[
                styles.waveformBar,
                {
                  height: Math.random() * 40 + 10,
                  backgroundColor: 
                    (i / 19) * duration >= startTime && (i / 19) * duration <= endTime
                      ? '#007AFF'
                      : '#ddd',
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Time display */}
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>
          Snippet: {formatTime(startTime)} - {formatTime(endTime)}
        </Text>
        <Text style={styles.durationText}>
          Duration: {formatTime(snippetDuration)}
        </Text>
      </View>

      {/* Start time slider */}
      <View style={styles.sliderContainer}>
        <Text style={styles.sliderLabel}>Start Time</Text>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={Math.max(0, duration - 30)}
          value={startTime}
          onValueChange={handleStartTimeChange}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#ddd"
        />
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabelText}>0:00</Text>
          <Text style={styles.sliderLabelText}>{formatTime(Math.max(0, duration - 30))}</Text>
        </View>
      </View>

      {/* Playback controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.playButton, isLoading && styles.disabledButton]}
          onPress={playSnippet}
          disabled={isLoading}
        >
          {isLoading ? (
            <Text style={styles.playButtonText}>Loading...</Text>
          ) : (
            <>
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={24}
                color="#fff"
              />
              <Text style={styles.playButtonText}>
                {isPlaying ? 'Pause' : 'Play'} Snippet
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Preview indicator */}
      {isPlaying && (
        <View style={styles.previewIndicator}>
          <Text style={styles.previewText}>Playing snippet preview...</Text>
          <Text style={styles.previewPosition}>
            {formatTime(currentPosition)} / {formatTime(endTime)}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  waveformContainer: {
    height: 60,
    marginBottom: 20,
    justifyContent: 'center',
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 50,
    paddingHorizontal: 10,
  },
  waveformBar: {
    width: 3,
    backgroundColor: '#ddd',
    borderRadius: 1.5,
    marginHorizontal: 1,
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  durationText: {
    fontSize: 14,
    color: '#666',
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabelText: {
    fontSize: 12,
    color: '#666',
  },
  controlsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  previewIndicator: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  previewPosition: {
    fontSize: 12,
    color: '#666',
  },
});

export default SnippetSelector; 