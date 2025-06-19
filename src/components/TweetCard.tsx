import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Tweet } from '../types';

interface Props {
  tweet: Tweet;
  onLike?: () => void;
  onComment?: () => void;
  onRepost?: () => void;
  onQuote?: () => void;
  onPressUser?: () => void;
  onPressImage?: () => void;
  onPress?: () => void;
}

// Simple time-ago formatting (seconds/minutes/hours/days)
const timeAgo = (date: string): string => {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
};

const QuotedPreview: React.FC<{ tweet: Tweet }> = ({ tweet }) => (
  <View style={styles.quoteContainer}>
    <Text style={styles.quoteUsername}>{tweet.user?.username || 'Unknown'}</Text>
    <Text style={styles.quoteContent} numberOfLines={3}>
      {tweet.content}
    </Text>
    {tweet.image_url ? (
      <Image source={{ uri: tweet.image_url }} style={styles.quoteImage} resizeMode="contain" />
    ) : null}
  </View>
);

const TweetCard: React.FC<Props> = ({ tweet, onLike, onComment, onRepost, onQuote, onPressUser, onPressImage, onPress }) => {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.container}>
      <TouchableOpacity onPress={onPressUser}>
        {tweet.user?.profile_image_url ? (
          <Image source={{ uri: tweet.user.profile_image_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder} />
        )}
      </TouchableOpacity>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onPressUser}>
            <Text style={styles.username}>{tweet.user?.username || 'Unknown'}</Text>
          </TouchableOpacity>
          <Text style={styles.dot}>•</Text>
          <Text style={styles.timestamp}>{timeAgo(tweet.created_at)}</Text>
        </View>

        <Text style={styles.contentText}>{tweet.content}</Text>

        {tweet.image_url ? (
          <TouchableOpacity activeOpacity={0.9} onPress={onPressImage}>
            <Image source={{ uri: tweet.image_url }} style={styles.tweetImage} resizeMode="contain" />
          </TouchableOpacity>
        ) : null}

        {tweet.original_tweet ? <QuotedPreview tweet={tweet.original_tweet} /> : null}

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={event => {
              event.stopPropagation();
              onComment && onComment();
            }}
          >
            <Ionicons name="chatbubble-outline" size={18} color="#666" />
            <Text style={styles.actionCount}>{tweet.comment_count}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={event => {
              event.stopPropagation();
              onRepost && onRepost();
            }}
          >
            <Ionicons
              name={tweet.is_reposted ? 'repeat' : 'repeat'}
              size={18}
              color={tweet.is_reposted ? '#1DA1F2' : '#666'}
            />
            <Text style={styles.actionCount}>{tweet.repost_count}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={event => {
              event.stopPropagation();
              onQuote && onQuote();
            }}
          >
            <Ionicons name="chatbox-outline" size={18} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={event => {
              event.stopPropagation();
              onLike && onLike();
            }}
          >
            <Ionicons
              name={tweet.is_liked ? 'heart' : 'heart-outline'}
              size={18}
              color={tweet.is_liked ? '#E0245E' : '#666'}
            />
            <Text style={styles.actionCount}>{tweet.like_count}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
    backgroundColor: '#fff',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#ccc',
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    fontWeight: '600',
    color: '#333',
  },
  dot: {
    marginHorizontal: 4,
    color: '#888',
  },
  timestamp: {
    color: '#888',
    fontSize: 12,
  },
  contentText: {
    color: '#333',
    fontSize: 15,
    marginBottom: 8,
  },
  tweetImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#eee',
  },
  quoteContainer: {
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 12,
    padding: 8,
    marginTop: 8,
  },
  quoteUsername: { fontWeight: '600', marginBottom: 4 },
  quoteContent: { color: '#333' },
  quoteImage: { width: '100%', height: 150, borderRadius: 8, marginTop: 6, backgroundColor: '#eee' },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionCount: {
    marginLeft: 4,
    color: '#666',
    fontSize: 12,
  },
});

export default TweetCard; 