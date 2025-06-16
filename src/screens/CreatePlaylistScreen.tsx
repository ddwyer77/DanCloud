import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Switch,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { playlistService } from '../services/playlistService';
import { useAuth } from '../contexts/AuthContext';
import { Input, Button } from '../components/ui';
import { colors, typography, spacing, borderRadius, shadows } from '../styles/theme';

export default function CreatePlaylistScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCoverImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemoveImage = () => {
    setCoverImage(null);
  };

  const handleCreatePlaylist = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a playlist title');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in to create a playlist');
      return;
    }

    try {
      setLoading(true);

      const playlistData = {
        title: title.trim(),
        description: description.trim() || undefined,
        is_public: isPublic,
        is_collaborative: isCollaborative,
        coverImageFile: coverImage ? {
          uri: coverImage,
          name: 'playlist-cover.jpg',
          type: 'image/jpeg',
        } : undefined,
      };

      const newPlaylist = await playlistService.createPlaylist(playlistData, user.id);

      Alert.alert(
        'Success',
        'Playlist created successfully!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error creating playlist:', error);
      Alert.alert('Error', 'Failed to create playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Playlist</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={handleCreatePlaylist}
            disabled={loading || !title.trim()}
          >
            <Text style={[
              styles.createButtonText,
              (!title.trim() || loading) && styles.createButtonTextDisabled
            ]}>
              {loading ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <View style={styles.coverSection}>
            <TouchableOpacity
              style={styles.coverImageContainer}
              onPress={handlePickImage}
            >
              {coverImage ? (
                <View style={styles.coverImageWrapper}>
                  <Image source={{ uri: coverImage }} style={styles.coverImage} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={handleRemoveImage}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.white} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.placeholderCover}>
                  <Ionicons name="image-outline" size={40} color={colors.gray400} />
                  <Text style={styles.placeholderText}>Add Cover Image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.inputSection}>
            <Input
              label="Playlist Title"
              value={title}
              onChangeText={setTitle}
              placeholder="Enter playlist title"
              maxLength={100}
              required
            />

            <Input
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your playlist"
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Playlist Settings</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Public Playlist</Text>
                <Text style={styles.settingDescription}>
                  Anyone can see and listen to this playlist
                </Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                trackColor={{ false: colors.gray300, true: colors.primaryLight }}
                thumbColor={isPublic ? colors.primary : colors.gray400}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Collaborative</Text>
                <Text style={styles.settingDescription}>
                  Allow others to add tracks to this playlist
                </Text>
              </View>
              <Switch
                value={isCollaborative}
                onValueChange={setIsCollaborative}
                trackColor={{ false: colors.gray300, true: colors.primaryLight }}
                thumbColor={isCollaborative ? colors.primary : colors.gray400}
                disabled={!isPublic}
              />
            </View>

            {isCollaborative && !isPublic && (
              <Text style={styles.warningText}>
                Collaborative playlists must be public
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelButton: {
    padding: spacing.sm,
  },
  cancelButtonText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  createButton: {
    padding: spacing.sm,
  },
  createButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.primary,
  },
  createButtonTextDisabled: {
    color: colors.textMuted,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: spacing.base,
  },
  coverSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  coverImageContainer: {
    width: 150,
    height: 150,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  coverImageWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: borderRadius.full,
  },
  placeholderCover: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray200,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray300,
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: typography.fontSize.sm,
    color: colors.gray400,
    marginTop: spacing.sm,
  },
  inputSection: {
    marginBottom: spacing.xl,
  },
  settingsSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.base,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.base,
  },
  settingTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  settingDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: typography.lineHeight.relaxed,
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    color: colors.warning,
    fontStyle: 'italic',
    marginTop: spacing.sm,
  },
}); 