import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { trackService } from '../services/trackService';
import { commentService } from '../services/commentService';
import { Track, Comment } from '../types';

const TrackDetailScreen = ({ route, navigation }: any) => {
  const { trackId, openComments } = route.params;
  const [track, setTrack] = useState<Track | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(openComments || false);
  
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, pauseTrack, position, duration } = useAudioPlayer();

  useEffect(() => {
    loadTrack();
    if (openComments) {
      loadComments();
    }
  }, [trackId]);

  const loadTrack = async () => {
    try {
      const trackData = await trackService.getTrack(trackId, user?.id);
      setTrack(trackData);
    } catch (error) {
      console.error('Error loading track:', error);
      Alert.alert('Error', 'Failed to load track');
      navigation.goBack();
    }
  };

  const loadComments = async () => {
    setLoading(true);
    try {
      const trackComments = await commentService.getTrackComments(trackId);
      setComments(trackComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = async () => {
    if (!track) return;
    
    if (currentTrack?.id === track.id && isPlaying) {
      await pauseTrack();
    } else {
      await playTrack(track);
    }
  };

  const handleLike = async () => {
    if (!track || !user) return;

    try {
      const isLiked = await trackService.toggleLike(track.id, user.id);
      setTrack(prev => prev ? {
        ...prev,
        is_liked: isLiked,
        like_count: isLiked ? prev.like_count + 1 : prev.like_count - 1,
      } : null);
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleRepost = async () => {
    if (!track || !user) return;

    try {
      const isReposted = await trackService.toggleRepost(track.id, user.id);
      setTrack(prev => prev ? {
        ...prev,
        is_reposted: isReposted,
        repost_count: isReposted ? prev.repost_count + 1 : prev.repost_count - 1,
      } : null);
    } catch (error) {
      console.error('Error toggling repost:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !track) return;

    try {
      const comment = await commentService.addComment(track.id, user.id, newComment.trim());
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      setTrack(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : null);
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatCount = (count: number | undefined | null) => {
    const safeCount = count || 0;
    if (safeCount >= 1000000) {
      return `${(safeCount / 1000000).toFixed(1)}M`;
    } else if (safeCount >= 1000) {
      return `${(safeCount / 1000).toFixed(1)}K`;
    }
    return safeCount.toString();
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentItem}>
      <Image
        source={{
          uri: item.user?.profile_image_url || 'https://via.placeholder.com/32',
        }}
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <Text style={styles.commentUsername}>{item.user?.username}</Text>
        <Text style={styles.commentText}>{item.content}</Text>
      </View>
    </View>
  );

  if (!track) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCurrentTrack = currentTrack?.id === track.id;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.trackInfo}>
        {track.cover_image_url && (
          <Image source={{ uri: track.cover_image_url }} style={styles.coverArt} />
        )}
        
        <View style={styles.trackDetails}>
          <Text style={styles.title}>{track.title}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('UserProfile', { userId: track.user_id })}
          >
            <Text style={styles.artist}>{track.user?.username}</Text>
          </TouchableOpacity>
          
          {track.description && (
            <Text style={styles.description}>{track.description}</Text>
          )}
          
          {track.tags && Array.isArray(track.tags) && track.tags.length > 0 && (
            <View style={styles.tags}>
              {track.tags.map((tag: string, index: number) => (
                <Text key={index} style={styles.tag}>
                  #{tag}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.player}>
        <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
          <Ionicons
            name={isCurrentTrack && isPlaying ? 'pause' : 'play'}
            size={32}
            color="#fff"
          />
        </TouchableOpacity>
        
        <View style={styles.timeInfo}>
          <Text style={styles.timeText}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Ionicons
            name={track.is_liked ? 'heart' : 'heart-outline'}
            size={24}
            color={track.is_liked ? '#FF3B30' : '#8E8E93'}
          />
          <Text style={[styles.actionText, track.is_liked && styles.actionTextActive]}>
            {formatCount(track.like_count)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleRepost}>
          <Ionicons
            name={track.is_reposted ? 'repeat' : 'repeat-outline'}
            size={24}
            color={track.is_reposted ? '#34C759' : '#8E8E93'}
          />
          <Text style={[styles.actionText, track.is_reposted && styles.actionTextActive]}>
            {formatCount(track.repost_count)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            setCommentsVisible(true);
            if (!commentsVisible) loadComments();
          }}
        >
          <Ionicons name="chatbubble-outline" size={24} color="#8E8E93" />
          <Text style={styles.actionText}>{formatCount(track.comment_count)}</Text>
        </TouchableOpacity>
      </View>

      {commentsVisible && (
        <View style={styles.commentsSection}>
          <View style={styles.commentInput}>
            <TextInput
              style={styles.textInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Add a comment..."
              multiline
            />
            <TouchableOpacity
              style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
              onPress={handleAddComment}
              disabled={!newComment.trim()}
            >
              <Ionicons name="send" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={renderComment}
            refreshing={loading}
            onRefresh={loadComments}
            style={styles.commentsList}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackInfo: {
    padding: 16,
    alignItems: 'center',
  },
  coverArt: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  trackDetails: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  artist: {
    fontSize: 18,
    color: '#007AFF',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tag: {
    fontSize: 14,
    color: '#007AFF',
    marginHorizontal: 4,
    marginBottom: 4,
  },
  player: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e0e0e0',
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  timeInfo: {
    flex: 1,
  },
  timeText: {
    fontSize: 16,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionText: {
    marginTop: 4,
    fontSize: 14,
    color: '#8E8E93',
  },
  actionTextActive: {
    color: '#333',
  },
  commentsSection: {
    flex: 1,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    padding: 8,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  commentsList: {
    flex: 1,
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    color: '#666',
  },
});

export default TrackDetailScreen; 