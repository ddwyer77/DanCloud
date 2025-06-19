import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  ScrollView,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Alert,
  Keyboard,
  Platform,
  RefreshControl,
  ScrollView as RNScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useAudioPlayer, AUDIO_PLAYER_HEIGHT } from '../contexts/AudioPlayerContext';
import { trackService } from '../services/trackService';
import { commentService } from '../services/commentService';
import { Track, Comment } from '../types';
import AddToPlaylistButton from '../components/AddToPlaylistButton';

// Create a unified data type for FlatList
type ListItem = 
  | { type: 'track'; data: Track }
  | { type: 'actions'; data: Track }
  | { type: 'comment'; data: Comment }
  | { type: 'spacer'; data: { height: number } };

const TrackDetailScreen = ({ route, navigation }: any) => {
  const { trackId, openComments, playlist } = route.params;
  const [track, setTrack] = useState<Track | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [commentsVisible, setCommentsVisible] = useState(openComments || false);
  const [isCommentFocused, setIsCommentFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isInitialRenderComplete, setIsInitialRenderComplete] = useState(false);
  
  const commentInputRef = useRef<TextInput>(null);
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, pauseTrack, position, duration } = useAudioPlayer();
  const scrollViewRef = useRef<RNScrollView | null>(null);

  const isCurrentTrack = currentTrack?.id === track?.id;
  const isOwner = user && track && track.user_id === user.id;

  useEffect(() => {
    loadTrack();
    if (openComments) {
      loadComments();
    }
  }, [trackId]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        console.log('[KEYBOARD] Keyboard shown, height:', e.endCoordinates.height);
        
        // No auto-scroll needed for ScrollView - it handles this naturally
      }
    );

    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
        setIsCommentFocused(false);
        console.log('[KEYBOARD] Keyboard hidden');
      }
    );

    return () => {
      keyboardWillShow?.remove();
      keyboardWillHide?.remove();
    };
  }, [isCommentFocused, commentsVisible]);

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
      setIsInitialRenderComplete(true);
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
      
      // ScrollView will handle scrolling naturally
    } catch (error) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
    }
  };

  const toggleComments = () => {
    if (!commentsVisible) {
      setIsInitialRenderComplete(false); // Reset render state for smooth transition
      loadComments();
    } else {
      setCommentsVisible(false);
      setComments([]);
      setIsCommentFocused(false);
      setIsInitialRenderComplete(false); // Reset render state
      Keyboard.dismiss();
      
      // Re-enable scrolling after layout settles
      setTimeout(() => {
        setIsInitialRenderComplete(true);
      }, 150);
    }
  };

  const handleCommentFocus = () => {
    setIsCommentFocused(true);
  };

  const handleCommentBlur = () => {
    setIsCommentFocused(false);
  };

  // Create unified data for FlatList
  const getListData = (): ListItem[] => {
    if (!track) return [];

    const data: ListItem[] = [];
    
    // Add track info
    data.push({ type: 'track', data: track });
    
    // Add actions section
    data.push({ type: 'actions', data: track });
    
    // Add comments if visible
    if (commentsVisible) {
      comments.forEach(comment => {
        data.push({ type: 'comment', data: comment });
      });
    }
    
    // Add spacer for bottom padding (just audio player when no comments, handled by contentContainerStyle when comments visible)
    const spacerHeight = commentsVisible && user 
      ? 20 // Minimal spacing when comments visible (main spacing handled by contentContainerStyle)
      : (currentTrack ? AUDIO_PLAYER_HEIGHT + 20 : 20); // Normal spacing when no comments
    
    data.push({ type: 'spacer', data: { height: spacerHeight } });
    
    return data;
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

  const renderTrackInfo = (trackData: Track) => (
    <View style={styles.trackContainer}>
      <Image
        source={{ uri: trackData.cover_image_url || 'https://via.placeholder.com/300' }}
        style={styles.coverArt}
      />

      <View style={styles.trackInfo}>
        <Text style={styles.title}>{trackData.title}</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('UserProfile', { userId: trackData.user_id })}
          activeOpacity={0.7}
          delayPressIn={0}
        >
          <Text style={styles.artist}>{trackData.user?.username}</Text>
        </TouchableOpacity>
        
        {trackData.description && (
          <Text style={styles.description}>{trackData.description}</Text>
        )}

        {trackData.tags && trackData.tags.length > 0 && (
          <View style={styles.tags}>
            {trackData.tags.map((tag, index) => (
              <Text key={index} style={styles.tag}>#{tag}</Text>
            ))}
          </View>
        )}
      </View>

      <View style={styles.playButtonContainer}>
        <TouchableOpacity 
          style={styles.playButton} 
          onPress={handlePlayPause}
          activeOpacity={0.8}
          delayPressIn={0}
        >
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
                { width: `${duration > 0 ? (position / duration) * 100 : 0}%` }
              ]} 
            />
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(position * 1000)}</Text>
            <Text style={styles.timeText}>{formatTime(duration * 1000)}</Text>
          </View>
        </View>
      )}
    </View>
  );

  const renderActions = (trackData: Track) => (
    <View style={styles.actions}>
      <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
        <Ionicons
          name={trackData.is_liked ? 'heart' : 'heart-outline'}
          size={24}
          color={trackData.is_liked ? '#FF3B30' : '#8E8E93'}
        />
        <Text style={[styles.actionText, trackData.is_liked && styles.actionTextActive]}>
          {formatCount(trackData.like_count)}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={handleRepost}>
        <Ionicons
          name={trackData.is_reposted ? 'repeat' : 'repeat-outline'}
          size={24}
          color={trackData.is_reposted ? '#34C759' : '#8E8E93'}
        />
        <Text style={[styles.actionText, trackData.is_reposted && styles.actionTextActive]}>
          {formatCount(trackData.repost_count)}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.actionButton}
        onPress={toggleComments}
      >
        <Ionicons 
          name={commentsVisible ? 'chatbubble' : 'chatbubble-outline'} 
          size={24} 
          color={commentsVisible ? '#007AFF' : '#8E8E93'} 
        />
        <Text style={[styles.actionText, commentsVisible && styles.actionTextActive]}>
          {formatCount(trackData.comment_count)}
        </Text>
      </TouchableOpacity>

      <AddToPlaylistButton 
        trackId={trackData.id} 
        trackTitle={trackData.title}
        style={styles.actionButton}
        color="#8E8E93"
      />

      {/* Comments Section Header */}
      {commentsVisible && (
        <View style={styles.commentsHeader}>
          <Text style={styles.commentsTitle}>Comments</Text>
          <TouchableOpacity onPress={toggleComments}>
            <Ionicons name="chevron-up" size={24} color="#8E8E93" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderListItem = ({ item, index }: { item: ListItem; index: number }) => {
    switch (item.type) {
      case 'track':
        return renderTrackInfo(item.data);
      case 'actions':
        return renderActions(item.data);
      case 'comment':
        return renderComment(item.data);
      case 'spacer':
        return <View style={{ height: item.data.height }} />;
      default:
        return null;
    }
  };

  const renderComment = (comment: Comment) => (
    <View style={styles.commentItem}>
      <Image
        source={{
          uri: comment.user?.profile_image_url || 'https://via.placeholder.com/32',
        }}
        style={styles.commentAvatar}
      />
      <View style={styles.commentContent}>
        <Text style={styles.commentUsername}>{comment.user?.username}</Text>
        <Text style={styles.commentText}>{comment.content}</Text>
      </View>
    </View>
  );

  const activateScroll = () => {
    if (scrollViewRef.current) {
      try {
        // Trigger minimal scroll to activate gesture recognizers
        scrollViewRef.current.scrollTo({ y: 1, animated: false });
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        }, 50);
      } catch (err) {
        // Ignore – ref might be unmounted
      }
    }
  };

  // Activate on mount if comments already visible
  useEffect(() => {
    if (commentsVisible) {
      const timeout = setTimeout(() => activateScroll(), 300);
      return () => clearTimeout(timeout);
    }
  }, []);

  // Activate whenever comments are toggled on
  useEffect(() => {
    if (commentsVisible && isInitialRenderComplete) {
      const timeout = setTimeout(() => activateScroll(), 150);
      return () => clearTimeout(timeout);
    }
  }, [commentsVisible, isInitialRenderComplete]);

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

      <ScrollView
        ref={scrollViewRef as any}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={true}
        scrollEnabled={true}
        bounces={true}
        alwaysBounceVertical={true}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        contentContainerStyle={[
          styles.flatListContent,
          // Add bottom padding when comments are visible to prevent overlap with comment input
          commentsVisible && user && {
            paddingBottom: keyboardHeight > 0 
              ? keyboardHeight + 100
              : (currentTrack ? AUDIO_PLAYER_HEIGHT + 100 : 100)
          }
        ]}
        refreshControl={
          commentsVisible ? (
            <RefreshControl refreshing={loading} onRefresh={loadComments} />
          ) : undefined
        }
        testID="track-detail-scroll"
      >
        {getListData().map((item, index) => (
          <View key={
            item.type === 'comment' 
              ? `comment-${item.data.id}` 
              : `${item.type}-${commentsVisible ? 'with-comments' : 'no-comments'}-${index}`
          }>
            {renderListItem({ item, index })}
          </View>
        ))}
      </ScrollView>
      
      {/* Fixed Comment Input - Outside main container to prevent touch interference */}
      {commentsVisible && user && (
        <View 
          style={[
            styles.commentInputContainer,
            {
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingBottom: keyboardHeight > 0 
                ? Platform.OS === 'ios' ? 0 : 10
                : currentTrack ? AUDIO_PLAYER_HEIGHT : 10
            }
          ]}
          pointerEvents="box-none" // Allow touches to pass through except for input area
        >
          <View 
            style={styles.commentInputWrapper}
            pointerEvents="auto" // Capture touches only for input area
          >
            <TextInput
              ref={commentInputRef}
              style={[styles.textInput, isCommentFocused && styles.textInputFocused]}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Add a comment..."
              placeholderTextColor="#8E8E93"
              multiline
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleAddComment}
              blurOnSubmit={false}
              onFocus={handleCommentFocus}
              onBlur={handleCommentBlur}
            />
            <TouchableOpacity
              style={[styles.sendButton, !newComment.trim() && styles.sendButtonDisabled]}
              onPress={handleAddComment}
              disabled={!newComment.trim()}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={newComment.trim() ? "#007AFF" : "#8E8E93"} 
              />
            </TouchableOpacity>
          </View>
          {isCommentFocused && (
            <TouchableOpacity 
              style={styles.dismissKeyboardButton}
              onPress={() => Keyboard.dismiss()}
            >
              <Text style={styles.dismissKeyboardText}>Tap to dismiss keyboard</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'red',
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
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
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
  commentInputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  commentInputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    marginRight: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
  },
  textInputFocused: {
    borderColor: '#007AFF',
    backgroundColor: '#fff',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButton: {
    padding: 12,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  dismissKeyboardButton: {
    marginTop: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dismissKeyboardText: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f9f9f9',
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  flatListContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  noComments: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
});

export default TrackDetailScreen; 