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
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer, AUDIO_PLAYER_HEIGHT } from '../contexts/AudioPlayerContext';
import { trackService } from '../services/trackService';
import { commentService } from '../services/commentService';
import { Track, Comment } from '../types';
import AddToPlaylistButton from '../components/AddToPlaylistButton';

const TrackDetailScreen = ({ route, navigation }: any) => {
  const { trackId, openComments, playlist } = route.params;
  const [track, setTrack] = useState<Track | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(openComments || false);
  
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, pauseTrack, position, duration } = useAudioPlayer();

  const isCurrentTrack = currentTrack?.id === track?.id;
  const isOwner = user && track && track.user_id === user.id;

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
      await playTrack(track, playlist);
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
      Keyboard.dismiss();
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

  const renderTrackHeader = () => (
    <View style={styles.trackContainer}>
      <Image source={{ uri: track?.cover_image_url }} style={styles.coverArt} />

      <View style={styles.trackInfo}>
        <Text style={styles.title}>{track?.title}</Text>
        <Text style={styles.artist}>{track?.user?.username}</Text>
        {track?.description && (
          <Text style={styles.description}>{track.description}</Text>
        )}
        {track?.tags && Array.isArray(track.tags) && track.tags.length > 0 && (
          <View style={styles.tags}>
            {track.tags.map((tag, index) => (
              <Text key={index} style={styles.tag}>
                #{tag}
              </Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.playButtonContainer}>
        <TouchableOpacity style={styles.playButton} onPress={handlePlayPause}>
          <Ionicons
            name={isCurrentTrack && isPlaying ? 'pause' : 'play'}
            size={32}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {isCurrentTrack && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((position || 0) / (duration || 1)) * 100}%` },
              ]}
            />
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {formatTime(position || 0)}
            </Text>
            <Text style={styles.timeText}>
              {formatTime(duration || 0)}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Ionicons
            name={track?.is_liked ? 'heart' : 'heart-outline'}
            size={24}
            color={track?.is_liked ? '#FF3B30' : '#8E8E93'}
          />
          <Text style={[styles.actionText, track?.is_liked && styles.actionTextActive]}>
            {formatCount(track?.like_count)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleRepost}>
          <Ionicons
            name={track?.is_reposted ? 'repeat' : 'repeat-outline'}
            size={24}
            color={track?.is_reposted ? '#34C759' : '#8E8E93'}
          />
          <Text style={[styles.actionText, track?.is_reposted && styles.actionTextActive]}>
            {formatCount(track?.repost_count)}
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
          <Text style={styles.actionText}>{formatCount(track?.comment_count)}</Text>
        </TouchableOpacity>

        {track && (
          <AddToPlaylistButton 
            trackId={track.id} 
            trackTitle={track.title}
            style={styles.actionButton}
            color="#8E8E93"
          />
        )}
      </View>

      {/* Comments Section Header */}
      {commentsVisible && (
        <View style={styles.commentsHeader}>
          <Text style={styles.commentsTitle}>Comments</Text>
        </View>
      )}
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

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track</Text>
          {isOwner ? (
            <TouchableOpacity onPress={() => navigation.navigate('EditTrack', { trackId: track.id })}>
              <Ionicons name="create-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        {commentsVisible ? (
          // When comments are visible, use FlatList for better scrolling
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={renderComment}
            ListHeaderComponent={renderTrackHeader}
            ListFooterComponent={<View style={{ height: currentTrack ? AUDIO_PLAYER_HEIGHT + 20 : 20 }} />}
            refreshing={loading}
            onRefresh={loadComments}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            contentContainerStyle={styles.flatListContent}
            ListEmptyComponent={
              <View style={styles.noComments}>
                <Text style={styles.noCommentsText}>No comments yet</Text>
                <Text style={styles.noCommentsSubtext}>Be the first to comment!</Text>
              </View>
            }
          />
        ) : (
          // When comments are hidden, use ScrollView
          <ScrollView 
            style={styles.content}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: currentTrack ? AUDIO_PLAYER_HEIGHT + 20 : 20 }
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {renderTrackHeader()}
          </ScrollView>
        )}

        {/* Comment Input - Fixed at bottom when comments are visible */}
        {commentsVisible && user && (
          <View style={styles.commentInputContainer}>
            <View style={styles.commentInput}>
              <TextInput
                style={styles.textInput}
                value={newComment}
                onChangeText={setNewComment}
                placeholder="Add a comment..."
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={handleAddComment}
                blurOnSubmit={false}
              />
              <TouchableOpacity
                style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
                onPress={handleAddComment}
                disabled={!newComment.trim()}
              >
                <Ionicons name="send" size={20} color="#007AFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  trackContainer: {
    padding: 16,
  },
  coverArt: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  trackInfo: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
    lineHeight: 22,
    marginBottom: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    fontSize: 14,
    color: '#007AFF',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  playButtonContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  progressContainer: {
    paddingVertical: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    minHeight: 300,
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
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
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  sendButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  commentsList: {
    flex: 1,
    backgroundColor: '#fff',
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
    backgroundColor: '#f0f0f0',
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
    lineHeight: 20,
  },
  commentsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  flatListContent: {
    paddingBottom: 20,
  },
  noComments: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCommentsText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  noCommentsSubtext: {
    fontSize: 14,
    color: '#666',
  },
  commentInputContainer: {
    padding: 16,
  },
});

export default TrackDetailScreen; 