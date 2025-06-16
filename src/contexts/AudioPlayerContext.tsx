import React, { createContext, useContext, useEffect, useState } from 'react';
import { nativeAudioService, Track as AudioTrack, PlaybackStatus } from '../services/nativeAudioService';
import { Track, Playlist } from '../types';
import { playlistService } from '../services/playlistService';

// Audio player height constant for consistent spacing
export const AUDIO_PLAYER_HEIGHT = 80;

interface AudioPlayerContextType {
  isPlaying: boolean;
  currentTrack: Track | null;
  position: number;
  duration: number;
  isLoading: boolean;
  isShuffleEnabled: boolean;
  isRepeatEnabled: boolean;
  playlist: Track[];
  currentIndex: number;
  currentPlaylist: Playlist | null;
  playTrack: (track: Track, newPlaylist?: Track[]) => Promise<void>;
  playPlaylist: (playlist: Playlist, startIndex?: number) => Promise<void>;
  pauseTrack: () => Promise<void>;
  resumeTrack: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  stopTrack: () => Promise<void>;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setPlaylist: (tracks: Track[]) => void;
  clearPlaylist: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};

// Utility function to shuffle array
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isShuffleEnabled, setIsShuffleEnabled] = useState(true);
  const [isRepeatEnabled, setIsRepeatEnabled] = useState(false);
  const [playlist, setPlaylistState] = useState<Track[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledPlaylist, setShuffledPlaylist] = useState<Track[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);

  useEffect(() => {
    // Set up audio service callbacks
    nativeAudioService.setPlaybackStatusUpdateCallback((status: PlaybackStatus) => {
      setIsPlaying(status.isPlaying);
      setPosition(Math.floor(status.position / 1000)); // Convert to seconds
      setDuration(Math.floor(status.duration / 1000)); // Convert to seconds
    });

    nativeAudioService.setOnTrackFinishedCallback(() => {
      playNext();
    });

    return () => {
      nativeAudioService.cleanup();
    };
  }, []);

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

  const convertToAudioTrack = (track: Track): AudioTrack => {
    return {
      id: track.id,
      title: track.title,
      artist: track.user?.username || 'Unknown Artist',
      album: 'DanCloud',
      url: track.audio_url,
      artwork: track.cover_image_url,
      duration: track.duration,
    };
  };

  const playTrack = async (track: Track, newPlaylist?: Track[]) => {
    try {
      setIsLoading(true);
      console.log('Playing track:', track.title);

      // Update playlist if provided
      if (newPlaylist && newPlaylist.length > 0) {
        setPlaylistState(newPlaylist);
        const trackIndex = newPlaylist.findIndex(t => t.id === track.id);
        setCurrentIndex(trackIndex >= 0 ? trackIndex : 0);
      } else if (playlist.length > 0) {
        const activePlaylist = getActivePlaylist();
        const trackIndex = activePlaylist.findIndex(t => t.id === track.id);
        if (trackIndex >= 0) {
          setCurrentIndex(trackIndex);
        }
      }

      // Convert to audio track format
      const audioTrack = convertToAudioTrack(track);

      // Load and play track
      await nativeAudioService.loadTrack(audioTrack);
      await nativeAudioService.play();

      setCurrentTrack(track);
      setIsPlaying(true);
      console.log('Track loaded and playing:', track.title);
    } catch (error) {
      console.error('Failed to play track:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const pauseTrack = async () => {
    try {
      await nativeAudioService.pause();
      setIsPlaying(false);
    } catch (error) {
      console.error('Failed to pause track:', error);
    }
  };

  const resumeTrack = async () => {
    try {
      await nativeAudioService.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Failed to resume track:', error);
    }
  };

  const seekTo = async (seekPosition: number) => {
    try {
      await nativeAudioService.seek(seekPosition * 1000); // Convert to milliseconds
    } catch (error) {
      console.error('Failed to seek:', error);
    }
  };

  const stopTrack = async () => {
    try {
      await nativeAudioService.stop();
      setIsPlaying(false);
      setCurrentTrack(null);
      setPosition(0);
      setDuration(0);
    } catch (error) {
      console.error('Failed to stop track:', error);
    }
  };

  const playNext = async () => {
    const activePlaylist = getActivePlaylist();
    if (activePlaylist.length === 0) return;

    let nextIndex = currentIndex + 1;
    if (nextIndex >= activePlaylist.length) {
      if (isRepeatEnabled) {
        nextIndex = 0; // Loop back to beginning
      } else {
        return; // End of playlist
      }
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
    if (prevIndex < 0) {
      if (isRepeatEnabled) {
        prevIndex = activePlaylist.length - 1; // Loop to end
      } else {
        return; // Beginning of playlist
      }
    }

    const prevTrack = activePlaylist[prevIndex];
    if (prevTrack) {
      setCurrentIndex(prevIndex);
      await playTrack(prevTrack);
    }
  };

  const toggleShuffle = () => {
    setIsShuffleEnabled(prev => !prev);
    console.log('Shuffle toggled:', !isShuffleEnabled);
  };

  const toggleRepeat = () => {
    setIsRepeatEnabled(prev => !prev);
    console.log('Repeat toggled:', !isRepeatEnabled);
  };

  const setPlaylist = (tracks: Track[]) => {
    setPlaylistState(tracks);
    setCurrentIndex(0);
    setCurrentPlaylist(null); // Clear playlist context when setting raw tracks
  };

  const clearPlaylist = () => {
    setPlaylistState([]);
    setCurrentIndex(0);
    setCurrentPlaylist(null);
  };

  const playPlaylist = async (playlist: Playlist, startIndex: number = 0) => {
    try {
      setIsLoading(true);
      
      // Get playlist tracks
      const tracks = await playlistService.getPlaylistTracks(playlist.id);
      
      if (tracks.length === 0) {
        throw new Error('Playlist is empty');
      }

      // Increment playlist play count
      playlistService.incrementPlaylistPlayCount(playlist.id);

      // Set the playlist and tracks
      setCurrentPlaylist(playlist);
      setPlaylistState(tracks);
      setCurrentIndex(startIndex);

      // Play the first track (or specified index)
      const trackToPlay = tracks[startIndex] || tracks[0];
      await playTrack(trackToPlay, tracks);
      
    } catch (error) {
      console.error('Failed to play playlist:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    isPlaying,
    currentTrack,
    position,
    duration,
    isLoading,
    isShuffleEnabled,
    isRepeatEnabled,
    playlist: getActivePlaylist(),
    currentIndex,
    currentPlaylist,
    playTrack,
    playPlaylist,
    pauseTrack,
    resumeTrack,
    seekTo,
    stopTrack,
    playNext,
    playPrevious,
    toggleShuffle,
    toggleRepeat,
    setPlaylist,
    clearPlaylist,
  };

  return (
    <AudioPlayerContext.Provider value={value}>
      {children}
    </AudioPlayerContext.Provider>
  );
}; 