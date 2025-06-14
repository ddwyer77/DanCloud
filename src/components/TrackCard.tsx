import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Track } from '../types';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';

interface TrackCardProps {
  track: Track;
  playlist?: Track[];
  onPress?: () => void;
  onUserPress?: () => void;
  onLike?: () => void;
  onRepost?: () => void;
  onComment?: () => void;
}

const TrackCard: React.FC<TrackCardProps> = ({
  track,
  playlist,
  onPress,
  onUserPress,
  onLike,
  onRepost,
  onComment,
}) => {
  const { currentTrack, isPlaying, playTrack, pauseTrack } = useAudioPlayer();
  const isCurrentTrack = currentTrack?.id === track.id;

  const handlePlayPause = async () => {
    if (isCurrentTrack && isPlaying) {
      await pauseTrack();
    } else {
      await playTrack(track, playlist);
    }
  };

  const formatCount = (count: number | undefined) => {
    if (!count || count === 0) return '0';
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      {track.reposted_by && (
        <View style={styles.repostHeader}>
          <Ionicons name="repeat" size={16} color="#34C759" />
          <Text style={styles.repostText}>
            {track.reposted_by.username} reposted
          </Text>
        </View>
      )}
      <View style={styles.header}>
        <TouchableOpacity style={styles.userInfo} onPress={onUserPress}>
          <Image
            source={{
              uri: track.user?.profile_image_url || 'https://via.placeholder.com/40',
            }}
            style={styles.avatar}
          />
          <Text style={styles.username}>{track.user?.username || 'Unknown User'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.trackInfo}>
          {track.cover_image_url && (
            <Image source={{ uri: track.cover_image_url }} style={styles.coverArt} />
          )}
          <View style={styles.trackDetails}>
            <Text style={styles.title} numberOfLines={2}>
              {track.title}
            </Text>
            {track.description && (
              <Text style={styles.description} numberOfLines={2}>
                {track.description}
              </Text>
            )}
            {track.tags && Array.isArray(track.tags) && track.tags.length > 0 && (
              <View style={styles.tags}>
                {track.tags.slice(0, 3).map((tag, index) => (
                  <Text key={index} style={styles.tag}>
                    #{tag}
                  </Text>
                ))}
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
          <Ionicons
            name={isCurrentTrack && isPlaying ? 'pause' : 'play'}
            size={24}
            color="#007AFF"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={onLike}>
          <Ionicons
            name={track.is_liked ? 'heart' : 'heart-outline'}
            size={20}
            color={track.is_liked ? '#FF3B30' : '#8E8E93'}
          />
          <Text style={[styles.actionText, track.is_liked && styles.actionTextActive]}>
            {formatCount(track.like_count)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onRepost}>
          <Ionicons
            name={track.is_reposted ? 'repeat' : 'repeat-outline'}
            size={20}
            color={track.is_reposted ? '#34C759' : '#8E8E93'}
          />
          <Text style={[styles.actionText, track.is_reposted && styles.actionTextActive]}>
            {formatCount(track.repost_count)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={20} color="#8E8E93" />
          <Text style={styles.actionText}>{formatCount(track.comment_count)}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    marginBottom: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  trackInfo: {
    flex: 1,
    flexDirection: 'row',
  },
  coverArt: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  trackDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: 12,
    color: '#007AFF',
    marginRight: 8,
    marginBottom: 2,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#8E8E93',
  },
  actionTextActive: {
    color: '#333',
  },
  repostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  repostText: {
    fontSize: 14,
    color: '#34C759',
    marginLeft: 4,
  },
});

export default TrackCard; 