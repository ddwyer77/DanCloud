import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tweetService } from '../services/tweetService';
import { Tweet } from '../types';
import TweetCard from '../components/TweetCard';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

const PAGE_SIZE = 20;

const TwitterFeedScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(0);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  useEffect(() => {
    loadTweets(0);
  }, []);

  const loadTweets = async (pageToLoad: number) => {
    if (pageToLoad === 0) {
      setLoading(true);
    } else {
      setIsFetchingMore(true);
    }

    try {
      const newTweets = await tweetService.getTweets(user?.id, PAGE_SIZE, pageToLoad * PAGE_SIZE);
      if (pageToLoad === 0) {
        setTweets(newTweets);
      } else {
        setTweets(prev => [...prev, ...newTweets]);
      }
      setPage(pageToLoad);
    } catch (error) {
      console.error('Error loading tweets', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setIsFetchingMore(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTweets(0);
  };

  const onEndReached = () => {
    if (!isFetchingMore) {
      loadTweets(page + 1);
    }
  };

  const handleLike = async (tweet: Tweet) => {
    if (!user) return;

    try {
      const isLiked = await tweetService.toggleLike(tweet.id, user.id);
      setTweets(prev =>
        prev.map(t =>
          t.id === tweet.id
            ? {
                ...t,
                is_liked: isLiked,
                like_count: isLiked ? t.like_count + 1 : t.like_count - 1,
              }
            : t
        )
      );
    } catch (error) {
      console.error('Error toggling tweet like', error);
    }
  };

  const handleRepost = async (tweet: Tweet) => {
    if (!user) return;

    try {
      const isReposted = await tweetService.toggleRepost(tweet.id, user.id);
      setTweets(prev =>
        prev.map(t =>
          t.id === tweet.id
            ? {
                ...t,
                is_reposted: isReposted,
                repost_count: isReposted ? t.repost_count + 1 : t.repost_count - 1,
              }
            : t
        )
      );
    } catch (error) {
      console.error('Error toggling tweet repost', error);
    }
  };

  const renderTweet = ({ item }: { item: Tweet }) => (
    <TweetCard
      tweet={item}
      onLike={() => handleLike(item)}
      onRepost={() => handleRepost(item)}
      onComment={() => navigation.navigate('TweetDetail', { tweetId: item.id })}
      onPressUser={() => navigation.navigate('UserProfile', { userId: item.user_id })}
      onPressImage={() =>
        navigation.navigate('ViewImage', { imageUrl: item.image_url })
      }
      onPress={() => navigation.navigate('TweetDetail', { tweetId: item.id })}
      onQuote={() => navigation.navigate('QuoteTweet', { tweet: item })}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1DA1F2" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Danwitter</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={tweets}
          keyExtractor={item => item.id}
          renderItem={renderTweet}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReachedThreshold={0.5}
          onEndReached={onEndReached}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateTweet')}
      >
        <Ionicons name="create" size={24} color="#fff" />
      </TouchableOpacity>
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e6e6e6',
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1DA1F2',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1DA1F2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default TwitterFeedScreen; 