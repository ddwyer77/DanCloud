import React, { createContext, useContext, useEffect, useState } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import { Track } from '../types';

// Audio player height constant for consistent spacing
export const AUDIO_PLAYER_HEIGHT = Platform.OS === 'ios' ? 114 : 94;

interface AudioPlayerContextType {
  isPlaying: boolean;
  currentTrack: Track | null;
  position: number;
  duration: number;
  isLoading: boolean;
  isShuffleEnabled: boolean;
  playlist: Track[];
  currentIndex: number;
  playTrack: (track: Track, playlist?: Track[]) => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  stopTrack: () => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  toggleShuffle: () => void;
  setPlaylist: (tracks: Track[]) => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};

// Shuffle array function
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(true); // Default to shuffle enabled
  const [playlist, setPlaylistState] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledPlaylist, setShuffledPlaylist] = useState<Track[]>([]);

  useEffect(() => {
    // Configure audio mode
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error('Error configuring audio:', error);
      }
    };

    configureAudio();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  // Update shuffled playlist when playlist or shuffle mode changes
  useEffect(() => {
    if (playlist.length > 0) {
      if (isShuffleEnabled) {
        setShuffledPlaylist(shuffleArray(playlist));
      } else {
        setShuffledPlaylist([...playlist]);
      }
    }
  }, [playlist, isShuffleEnabled]);

  const getActivePlaylist = () => {
    return isShuffleEnabled ? shuffledPlaylist : playlist;
  };

  const playTrack = async (track: Track, newPlaylist?: Track[]) => {
    try {
      setIsLoading(true);
      console.log('=== AUDIO PLAYBACK DEBUG ===');
      console.log('Track title:', track.title);
      console.log('Track URL:', track.audio_url);
      console.log('URL type:', typeof track.audio_url);
      console.log('URL length:', track.audio_url?.length);

      // Update playlist if provided
      if (newPlaylist && newPlaylist.length > 0) {
        setPlaylistState(newPlaylist);
        // Find the index of the current track in the new playlist
        const trackIndex = newPlaylist.findIndex(t => t.id === track.id);
        setCurrentIndex(trackIndex >= 0 ? trackIndex : 0);
      } else if (playlist.length > 0) {
        // Find current track in existing playlist
        const activePlaylist = getActivePlaylist();
        const trackIndex = activePlaylist.findIndex(t => t.id === track.id);
        if (trackIndex >= 0) {
          setCurrentIndex(trackIndex);
        }
      }

      // Stop current track if playing
      if (sound) {
        console.log('Stopping previous sound...');
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      }

      // Validate URL
      if (!track.audio_url) {
        throw new Error('No audio URL provided');
      }

      // Test URL accessibility
      console.log('Testing URL accessibility...');
      try {
        const response = await fetch(track.audio_url, { method: 'HEAD' });
        console.log('URL test response status:', response.status);
        console.log('URL test response headers:', Object.fromEntries(response.headers.entries()));
      } catch (urlError) {
        console.error('URL accessibility test failed:', urlError);
      }

      console.log('Creating sound object...');
      
      // Add timeout to sound creation
      const soundCreationPromise = Audio.Sound.createAsync(
        { uri: track.audio_url },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      // Race with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sound creation timeout')), 10000)
      );

      const { sound: newSound } = await Promise.race([soundCreationPromise, timeoutPromise]) as any;

      console.log('Sound object created:', !!newSound);
      
      // Set the sound first
      setSound(newSound);
      setCurrentTrack(track);
      
      console.log('Starting playback...');
      
      // Now try to play
      const playStatus = await newSound.playAsync();
      console.log('Play status:', playStatus);
      
      setIsPlaying(true);
      console.log('=== AUDIO SETUP COMPLETE ===');
      
    } catch (error) {
      console.error('=== AUDIO ERROR ===');
      console.error('Error type:', (error as Error).constructor.name);
      console.error('Error message:', (error as Error).message);
      console.error('Full error:', error);
      console.error('Track URL that failed:', track.audio_url);
      console.error('=== END AUDIO ERROR ===');
    } finally {
      setIsLoading(false);
    }
  };

  const playNext = async () => {
    const activePlaylist = getActivePlaylist();
    if (activePlaylist.length === 0) return;

    let nextIndex = currentIndex + 1;
    
    // Loop back to beginning if at end
    if (nextIndex >= activePlaylist.length) {
      nextIndex = 0;
    }

    const nextTrack = activePlaylist[nextIndex];
    if (nextTrack) {
      setCurrentIndex(nextIndex);
      await playTrack(nextTrack);
    }
  };

  const playPrevious = async () => {
    const activePlaylist = getActivePlaylist();
    if (activePlaylist.length === 0) return;

    let prevIndex = currentIndex - 1;
    
    // Loop to end if at beginning
    if (prevIndex < 0) {
      prevIndex = activePlaylist.length - 1;
    }

    const prevTrack = activePlaylist[prevIndex];
    if (prevTrack) {
      setCurrentIndex(prevIndex);
      await playTrack(prevTrack);
    }
  };

  const pauseTrack = async () => {
    if (sound) {
      await sound.pauseAsync();
      setIsPlaying(false);
    }
  };

  const resumeTrack = async () => {
    if (sound) {
      await sound.playAsync();
      setIsPlaying(true);
    }
  };

  const seekTo = async (seekPosition: number) => {
    if (sound) {
      await sound.setPositionAsync(seekPosition);
    }
  };

  const stopTrack = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
    }
    setIsPlaying(false);
    setCurrentTrack(null);
    setPosition(0);
    setDuration(0);
  };

  const toggleShuffle = () => {
    setIsShuffleEnabled(prev => !prev);
    console.log('Shuffle toggled:', !isShuffleEnabled);
  };

  const setPlaylist = (tracks: Track[]) => {
    setPlaylistState(tracks);
    setCurrentIndex(0);
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);

      // Track finished playing - auto-play next track
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        
        // Auto-play next track if playlist exists
        console.log('Track finished, auto-playing next...');
        playNext();
      }
    }
  };

  const value = {
    isPlaying,
    currentTrack,
    position,
    duration,
    isLoading,
    isShuffleEnabled,
    playlist: getActivePlaylist(),
    currentIndex,
    playTrack,
    pauseTrack,
    resumeTrack,
    seekTo,
    stopTrack,
    playNext,
    playPrevious,
    toggleShuffle,
    setPlaylist,
  };

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}; 