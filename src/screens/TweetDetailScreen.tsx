import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import TweetCard from '../components/TweetCard';
import { tweetService } from '../services/tweetService';
import { Tweet, TweetComment } from '../types';
import { useAuth } from '../contexts/AuthContext';
import KeyboardAvoidingWrapper from '../components/KeyboardAvoidingWrapper';
import { useAudioPlayer, AUDIO_PLAYER_HEIGHT } from '../contexts/AudioPlayerContext';

interface RouteParams {
  tweetId: string;
}

const TweetDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { tweetId } = route.params as RouteParams;
  const { user } = useAuth();
  const { currentTrack } = useAudioPlayer();

  const [tweet, setTweet] = useState<Tweet | null>(null);
  const [comments, setComments] = useState<TweetComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const commentInputRef = React.useRef<TextInput>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const fetchedTweet = await tweetService.getTweetById(tweetId, user?.id);
      const fetchedComments = await tweetService.getComments(tweetId);
      setTweet(fetchedTweet);
      setComments(fetchedComments);
    } catch (error) {
      console.error('Error loading tweet detail', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!user || commentText.trim().length === 0) return;
    try {
      setSubmitting(true);
      const newComment = await tweetService.createComment(tweetId, user.id, commentText.trim());
      setComments(prev => [newComment, ...prev]);
      setTweet(prev => (prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : prev));
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment', error);
    } finally {
      setSubmitting(false);
    }
  };

  const focusCommentInput = () => {
    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 50);
  };

  const renderComment = ({ item }: { item: TweetComment }) => (
    <View style={styles.commentContainer}>
      {item.user?.profile_image_url ? (
        <Image source={{ uri: item.user.profile_image_url }} style={styles.commentAvatar} />
      ) : (
        <Ionicons name="person-circle" size={32} color="#ccc" />
      )}
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={styles.commentUsername}>{item.user?.username || 'Unknown'}</Text>
        <Text>{item.content}</Text>
      </View>
    </View>
  );

  const handleDelete = () => {
    if (!user || !tweet) return;

    Alert.alert('Delete tweet?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await tweetService.deleteTweet(tweet.id, user.id);
            navigation.goBack();
          } catch (err) {
            console.error('Delete tweet error', err);
            Alert.alert('Error', 'Could not delete tweet');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!tweet) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: '#666' }}>Tweet not found.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#1DA1F2" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tweet</Text>
        {user?.id === tweet.user_id ? (
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color="#E0245E" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <KeyboardAvoidingWrapper
        enablePanGesture={true}
        enableTouchDismiss={false}
        extraOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <FlatList
          style={{ flex: 1 }}
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          ListHeaderComponent={
            <TweetCard
              tweet={tweet}
              onLike={() => {}}
              onRepost={() => {}}
              onComment={focusCommentInput}
              onQuote={() => navigation.navigate('QuoteTweet', { tweet })}
              onPressUser={() => navigation.navigate('UserProfile', { userId: tweet.user_id })}
              onPressImage={() =>
                tweet.image_url &&
                navigation.navigate('ViewImage', { imageUrl: tweet.image_url })
              }
            />
          }
          contentContainerStyle={{
            paddingBottom: 80 + (currentTrack ? AUDIO_PLAYER_HEIGHT : 0),
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {user && (
          <View
            style={[
              styles.commentInputContainer,
              currentTrack && { marginBottom: AUDIO_PLAYER_HEIGHT },
            ]}
          >
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              value={commentText}
              onChangeText={setCommentText}
              editable={!submitting}
              multiline
              ref={commentInputRef}
            />
            <TouchableOpacity
              style={[styles.commentSendButton, commentText.trim().length === 0 && { opacity: 0.4 }]}
              onPress={handleAddComment}
              disabled={commentText.trim().length === 0 || submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingWrapper>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
  },
  headerTitle: { marginLeft: 12, fontSize: 18, fontWeight: '600', color: '#333' },
  commentContainer: {
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
    marginRight: 8,
  },
  commentUsername: { fontWeight: '600', marginBottom: 2 },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e6e6e6',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  commentInput: { flex: 1, fontSize: 16, padding: 8 },
  commentSendButton: {
    backgroundColor: '#1DA1F2',
    padding: 8,
    borderRadius: 20,
    marginLeft: 8,
  },
});

export default TweetDetailScreen; 