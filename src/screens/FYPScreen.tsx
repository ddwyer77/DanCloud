import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { Track } from '../types';
import { trackService } from '../services/trackService';
import { useAuth } from '../contexts/AuthContext';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface FYPTrackCardProps {
  track: Track;
  isActive: boolean;
  onPress: () => void;
}

const FYPTrackCard: React.FC<FYPTrackCardProps> = ({ track, isActive, onPress }) => {
  return (
    <View style={styles.trackCard}>
      <View style={styles.trackContent}>
        <View style={styles.musicIcon}>
          <Ionicons name="musical-notes" size={80} color="#007AFF" />
        </View>
      </View>
      
      <TouchableOpacity style={styles.viewSongButton} onPress={onPress}>
        <Text style={styles.viewSongText}>View Song</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const FYPScreen = () => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  const navigation = useNavigation();
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);

  // Refs for managing audio and pagination
  const currentTrackRef = useRef<Track | null>(null);
  const loadingMoreRef = useRef(false);

  // Load initial tracks
  useEffect(() => {
    loadTracks();
  }, []);

  // Handle screen focus/blur for audio management
  useFocusEffect(
    useCallback(() => {
      // Screen is focused - start playing current track
      if (tracks.length > 0 && currentIndex < tracks.length) {
        playCurrentTrack();
      }
      
      return () => {
        // Screen is blurred - stop audio
        stopAudio();
      };
    }, [tracks, currentIndex])
  );

  const loadTracks = async () => {
    try {
      setLoading(true);
      const feedTracks = await trackService.getFYPTracks(user?.id, 20, 0);
      setTracks(feedTracks);
      if (feedTracks.length > 0) {
        setCurrentIndex(0);
      }
    } catch (error: any) {
      console.error('Error loading FYP tracks:', error);
      Alert.alert('Error', 'Failed to load tracks');
    } finally {
      setLoading(false);
    }
  };

  const loadMoreTracks = async () => {
    if (loadingMoreRef.current) return;
    
    try {
      loadingMoreRef.current = true;
      const moreTracks = await trackService.getFYPTracks(user?.id, 10, tracks.length);
      if (moreTracks.length > 0) {
        setTracks(prev => [...prev, ...moreTracks]);
      }
    } catch (error: any) {
      console.error('Error loading more tracks:', error);
    } finally {
      loadingMoreRef.current = false;
    }
  };

  const playCurrentTrack = async () => {
    if (currentIndex >= tracks.length || isTransitioning) return;
    
    const track = tracks[currentIndex];
    
    try {
      setIsTransitioning(true);
      
      // Always stop current audio first and wait for it to complete
      await stopAudio();
      
      // Longer delay to ensure audio is fully stopped
      await new Promise(resolve => setTimeout(resolve, 300));

      // Configure audio for background play
      await Audio.setAudioModeAsync({
        staysActiveInBackground: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      const snippetStart = (track.snippet_start_time || 0) * 1000;
      
      // Create and play new sound immediately
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.audio_url },
        { 
          shouldPlay: true,
          positionMillis: snippetStart,
          progressUpdateIntervalMillis: 1000, // Less frequent updates
          isLooping: false,
        },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsPlaying(true);
      currentTrackRef.current = track;

      // Increment play count now that database is fixed
      trackService.incrementPlayCount(track.id).catch(console.error);

    } catch (error) {
      console.error('Error playing track:', error);
    } finally {
      setIsTransitioning(false);
    }
  };

  const stopAudio = async () => {
    if (sound) {
      try {
        // Check if sound is loaded before trying to stop it
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          await sound.stopAsync();
        }
        // Always try to unload regardless of loaded status
        await sound.unloadAsync();
      } catch (error: any) {
        // Silently handle expected errors when sound is not loaded
        if (!error.message?.includes('sound is not loaded')) {
          console.error('Error stopping audio:', error);
        }
        // Force unload even if stop fails
        try {
          await sound.unloadAsync();
        } catch (unloadError: any) {
          // Silently handle unload errors too
          if (!unloadError.message?.includes('sound is not loaded')) {
            console.error('Error unloading audio:', unloadError);
          }
        }
      }
    }
    setSound(null);
    setIsPlaying(false);
    currentTrackRef.current = null;
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded && currentTrackRef.current && sound) {
      const track = currentTrackRef.current;
      const snippetStartTime = (track.snippet_start_time || 0) * 1000;
      const snippetEndTime = (track.snippet_end_time || (track.snippet_start_time || 0) + 30) * 1000;
      
      // Only loop back if we've actually reached the end of the snippet
      // Add a small buffer to prevent constant looping
      if (status.positionMillis >= snippetEndTime - 100) {
        console.log('Looping snippet back to start');
        sound.setPositionAsync(snippetStartTime).catch(console.error);
      }
      
      // Don't restart on didJustFinish - let it loop naturally
      if (status.didJustFinish) {
        console.log('Track finished, restarting snippet');
        sound.setPositionAsync(snippetStartTime).catch(console.error);
        sound.playAsync().catch(console.error);
      }
    }
  };

  const handleSwipe = (direction: 'up' | 'down') => {
    if (direction === 'up' && currentIndex < tracks.length - 1) {
      // Swipe up - next track
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      scrollToIndex(newIndex);
      
      // Load more tracks if approaching end
      if (newIndex >= tracks.length - 3) {
        loadMoreTracks();
      }
    } else if (direction === 'down' && currentIndex > 0) {
      // Swipe down - previous track
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      scrollToIndex(newIndex);
    }
  };

  const scrollToIndex = (index: number) => {
    scrollViewRef.current?.scrollTo({
      y: index * SCREEN_HEIGHT,
      animated: true,
    });
  };

  // Play track when index changes
  useEffect(() => {
    if (tracks.length > 0 && currentIndex < tracks.length && !isTransitioning) {
      // Add a delay to ensure smooth transitions and prevent race conditions
      const timer = setTimeout(() => {
        playCurrentTrack();
      }, 400);
      
      return () => clearTimeout(timer);
    }
  }, [currentIndex, tracks, isTransitioning]);

  // Pan responder for gesture handling
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dy) > Math.abs(gestureState.dx) && Math.abs(gestureState.dy) > 20;
    },
    onPanResponderRelease: (evt, gestureState) => {
      const { dy, vy } = gestureState;
      const shouldSwipe = Math.abs(dy) > 100 && Math.abs(vy) > 0.5;
      
      if (shouldSwipe) {
        const direction = dy > 0 ? 'down' : 'up';
        handleSwipe(direction);
      }
    },
  });

  const handleViewTrack = () => {
    if (currentIndex < tracks.length) {
      const track = tracks[currentIndex];
      (navigation as any).navigate('TrackDetail', { trackId: track.id });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading tracks...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (tracks.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="musical-notes-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No tracks available</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadTracks}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        scrollEnabled={false} // Disable default scrolling to use gesture handling
        {...panResponder.panHandlers}
      >
        {tracks.map((track, index) => (
          <View key={track.id} style={styles.page}>
            <FYPTrackCard
              track={track}
              isActive={index === currentIndex}
              onPress={() => {
                (navigation as any).navigate('TrackDetail', { trackId: track.id });
              }}
            />
          </View>
        ))}
      </ScrollView>
      
      {/* Minimal swipe hint */}
      <View style={styles.swipeHint}>
        <Ionicons name="swap-vertical" size={24} color="#999" />
        <Text style={styles.swipeHintText}>Swipe to discover music</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  page: {
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackCard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  trackContent: {
    alignItems: 'center',
    marginBottom: 40,
  },
  musicIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewSongButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  viewSongText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  swipeHint: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    alignItems: 'center',
    opacity: 0.7,
  },
  swipeHintText: {
    color: '#999',
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FYPScreen; 