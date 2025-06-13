import React, { createContext, useContext, useEffect, useState } from 'react';
import { Audio } from 'expo-av';
import { Track } from '../types';

interface AudioPlayerContextType {
  isPlaying: boolean;
  currentTrack: Track | null;
  position: number;
  duration: number;
  isLoading: boolean;
  playTrack: (track: Track) => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  stopTrack: () => Promise<void>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

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

  const playTrack = async (track: Track) => {
    try {
      setIsLoading(true);
      console.log('=== AUDIO PLAYBACK DEBUG ===');
      console.log('Track title:', track.title);
      console.log('Track URL:', track.audio_url);
      console.log('URL type:', typeof track.audio_url);
      console.log('URL length:', track.audio_url?.length);

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

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis || 0);
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);

      // Track finished playing
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    }
  };

  const value = {
    isPlaying,
    currentTrack,
    position,
    duration,
    isLoading,
    playTrack,
    pauseTrack,
    resumeTrack,
    seekTo,
    stopTrack,
  };

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
}; 