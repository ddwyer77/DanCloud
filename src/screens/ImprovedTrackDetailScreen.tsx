import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer } from '../contexts/AudioPlayerContext';
import { trackService } from '../services/trackService';
import { commentService } from '../services/commentService';
import { Track, Comment } from '../types';

// Import our new components
import KeyboardAvoidingWrapper from '../components/KeyboardAvoidingWrapper';
import EnhancedScrollView from '../components/EnhancedScrollView';
import Button from '../components/ui/Button';
import Input, { InputRef } from '../components/ui/Input';
import { colors, typography, spacing, borderRadius, shadows, componentStyles } from '../styles/theme';

const ImprovedTrackDetailScreen = ({ route, navigation }: any) => {
  const { trackId, openComments } = route.params;
  const [track, setTrack] = useState<Track | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(openComments || false);
  const [submittingComment, setSubmittingComment] = useState(false);
  
  const commentInputRef = useRef<InputRef>(null);
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
      setCommentsVisible(true);
    } catch (error) {
      console.error('Error loading comments:', error);
      Alert.alert('Error', 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadTrack(),
        commentsVisible ? loadComments() : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
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
      Alert.alert('Error', 'Failed to like track');
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
      Alert.alert('Error', 'Failed to repost track');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !track) return;

    setSubmittingComment(true);
    try {
      const comment = await commentService.addComment(track.id, user.id, newComment.trim());
      setComments(prev => [comment, ...prev]);
      setNewComment('');
      setTrack(prev => prev ? { ...prev, comment_count: prev.comment_count + 1 } : null);
      commentInputRef.current?.blur();
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const toggleComments = () => {
    if (!commentsVisible) {
      loadComments();
    } else {
      setCommentsVisible(false);
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
        <Text style={styles.commentTime}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  if (!track) {
    return (
      <SafeAreaView style={componentStyles.container}>
        <View style={componentStyles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCurrentTrack = currentTrack?.id === track.id;

  return (
    <SafeAreaView style={componentStyles.container}>
      <KeyboardAvoidingWrapper>
        {/* Header */}
        <View style={componentStyles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={componentStyles.headerTitle}>Track</Text>
          <TouchableOpacity onPress={() => {}}>
            <Ionicons name="share-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <EnhancedScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refreshData} />
          }
          contentContainerStyle={styles.scrollContent}
        >
          {/* Track Container */}
          <View style={styles.trackContainer}>
            <Image source={{ uri: track.cover_image_url }} style={styles.coverArt} />

            <View style={styles.trackInfo}>
              <Text style={styles.title}>{track.title}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: track.user?.id })}>
                <Text style={styles.artist}>{track.user?.username}</Text>
              </TouchableOpacity>
              
              {track.description && (
                <Text style={styles.description}>{track.description}</Text>
              )}
              
              {track.tags && Array.isArray(track.tags) && track.tags.length > 0 && (
                <View style={styles.tags}>
                  {track.tags.map((tag, index) => (
                    <View key={index} style={styles.tagContainer}>
                      <Text style={styles.tag}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Play Button */}
            <View style={styles.playButtonContainer}>
              <Button
                title={isCurrentTrack && isPlaying ? 'Pause' : 'Play'}
                onPress={handlePlayPause}
                size="large"
                style={styles.playButton}
              />
            </View>

            {/* Track Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Ionicons name="play" size={16} color={colors.textMuted} />
                <Text style={styles.statText}>{formatCount(track.play_count)}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="time" size={16} color={colors.textMuted} />
                <Text style={styles.statText}>
                  {track.duration ? formatTime(track.duration * 1000) : '0:00'}
                </Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, track.is_liked && styles.actionButtonActive]}
                onPress={handleLike}
              >
                <Ionicons 
                  name={track.is_liked ? "heart" : "heart-outline"} 
                  size={24} 
                  color={track.is_liked ? colors.danger : colors.textSecondary} 
                />
                <Text style={[styles.actionText, track.is_liked && styles.actionTextActive]}>
                  {formatCount(track.like_count)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, track.is_reposted && styles.actionButtonActive]}
                onPress={handleRepost}
              >
                <Ionicons 
                  name={track.is_reposted ? "repeat" : "repeat-outline"} 
                  size={24} 
                  color={track.is_reposted ? colors.success : colors.textSecondary} 
                />
                <Text style={[styles.actionText, track.is_reposted && styles.actionTextActive]}>
                  {formatCount(track.repost_count)}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={toggleComments}>
                <Ionicons 
                  name="chatbubble-outline" 
                  size={24} 
                  color={colors.textSecondary} 
                />
                <Text style={styles.actionText}>{formatCount(track.comment_count)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Comments Section */}
          {commentsVisible && (
            <View style={styles.commentsSection}>
              <Text style={styles.sectionTitle}>Comments</Text>
              
              {/* Add Comment */}
              {user && (
                <View style={styles.addCommentContainer}>
                  <Input
                    ref={commentInputRef}
                    placeholder="Add a comment..."
                    value={newComment}
                    onChangeText={setNewComment}
                    multiline
                    maxLength={500}
                    showCharacterCount
                    rightIcon="send"
                    onRightIconPress={handleAddComment}
                    containerStyle={styles.commentInput}
                  />
                  <Button
                    title="Post"
                    onPress={handleAddComment}
                    disabled={!newComment.trim()}
                    loading={submittingComment}
                    size="small"
                    style={styles.postButton}
                  />
                </View>
              )}

              {/* Comments List */}
              {loading ? (
                <View style={styles.loadingComments}>
                  <Text>Loading comments...</Text>
                </View>
              ) : comments.length > 0 ? (
                <FlatList
                  data={comments}
                  renderItem={renderComment}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.noComments}>
                  <Text style={styles.noCommentsText}>No comments yet</Text>
                  <Text style={styles.noCommentsSubtext}>Be the first to comment!</Text>
                </View>
              )}
            </View>
          )}
        </EnhancedScrollView>
      </KeyboardAvoidingWrapper>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: spacing['4xl'], // Extra space for bottom audio player
  },
  trackContainer: {
    padding: spacing.base,
  },
  coverArt: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.gray200,
  },
  trackInfo: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  artist: {
    fontSize: typography.fontSize.lg,
    color: colors.primary,
    marginBottom: spacing.md,
  },
  description: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.base,
    marginBottom: spacing.md,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagContainer: {
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  tag: {
    fontSize: typography.fontSize.sm,
    color: colors.primary,
    fontWeight: typography.fontWeight.medium,
  },
  playButtonContainer: {
    marginBottom: spacing.lg,
  },
  playButton: {
    marginHorizontal: spacing.xl,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.md,
  },
  actionButton: {
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.base,
    minWidth: 80,
  },
  actionButtonActive: {
    backgroundColor: colors.gray100,
  },
  actionText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  actionTextActive: {
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  commentsSection: {
    padding: spacing.base,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    ...componentStyles.sectionTitle,
  },
  addCommentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  commentInput: {
    flex: 1,
    marginBottom: 0,
  },
  postButton: {
    marginBottom: spacing.base,
  },
  loadingComments: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  noComments: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  noCommentsText: {
    fontSize: typography.fontSize.base,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  noCommentsSubtext: {
    fontSize: typography.fontSize.sm,
    color: colors.textMuted,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    marginRight: spacing.md,
    backgroundColor: colors.gray200,
  },
  commentContent: {
    flex: 1,
  },
  commentUsername: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  commentText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    lineHeight: typography.lineHeight.normal * typography.fontSize.sm,
    marginBottom: spacing.xs,
  },
  commentTime: {
    fontSize: typography.fontSize.xs,
    color: colors.textMuted,
  },
});

export default ImprovedTrackDetailScreen; 