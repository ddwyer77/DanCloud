import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { userService } from '../services/userService';

const EditProfileScreen = ({ navigation }: any) => {
  const { user, updateProfile } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [profileImage, setProfileImage] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    try {
      console.log('=== IMAGE PICKER DEBUG ===');
      console.log('Starting image picker...');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets[0]) {
        const selectedImage = {
          uri: result.assets[0].uri,
          name: 'profile_image.jpg',
          type: 'image/jpeg',
        };
        console.log('Selected image object:', selectedImage);
        setProfileImage(selectedImage);
        console.log('Profile image state updated');
      } else {
        console.log('Image picker was canceled or no image selected');
      }
      console.log('=== END IMAGE PICKER DEBUG ===');
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSave = async () => {
    if (!user) return;

    if (!username.trim()) {
      Alert.alert('Error', 'Username is required');
      return;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }

    setLoading(true);
    try {
      let profileImageUrl = user.profile_image_url;

      console.log('=== HANDLE SAVE DEBUG ===');
      console.log('Current user profile_image_url:', user.profile_image_url);
      console.log('Selected profileImage:', profileImage);
      console.log('Will upload new image:', !!profileImage);

      // Upload new profile image if selected
      if (profileImage) {
        console.log('Starting profile image upload...');
        profileImageUrl = await userService.uploadProfileImage(user.id, profileImage);
        console.log('=== PROFILE UPDATE DEBUG ===');
        console.log('New profile image URL:', profileImageUrl);
        console.log('=== END PROFILE UPDATE DEBUG ===');
      }

      console.log('Updating profile with data:', {
        username: username.trim(),
        bio: bio.trim() || undefined,
        profile_image_url: profileImageUrl,
      });

      // Update profile
      await updateProfile({
        username: username.trim(),
        bio: bio.trim() || undefined,
        profile_image_url: profileImageUrl,
      });

      console.log('Profile updated with URL:', profileImageUrl);
      console.log('=== END HANDLE SAVE DEBUG ===');

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={loading}
                style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              >
                <Text style={styles.saveButtonText}>
                  {loading ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.content} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.imageSection}>
                <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
                  <Image
                    source={{
                      uri: profileImage?.uri || user?.profile_image_url || 'https://via.placeholder.com/120',
                    }}
                    style={styles.profileImage}
                  />
                  <View style={styles.imageOverlay}>
                    <Ionicons name="camera" size={24} color="#fff" />
                  </View>
                </TouchableOpacity>
                <Text style={styles.imageHint}>Tap to change profile photo</Text>
              </View>

              <View style={styles.form}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Username *</Text>
                  <TextInput
                    style={styles.input}
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Enter username"
                    autoCapitalize="none"
                    maxLength={30}
                    returnKeyType="next"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Bio</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={bio}
                    onChangeText={setBio}
                    placeholder="Tell us about yourself..."
                    multiline
                    numberOfLines={4}
                    maxLength={200}
                    textAlignVertical="top"
                    returnKeyType="done"
                  />
                  <Text style={styles.charCount}>{bio.length}/200</Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  content: {
    flex: 1,
  },
  imageSection: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  imageContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  imageHint: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    textAlign: 'right',
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  scrollContent: {
    padding: 16,
  },
});

export default EditProfileScreen; 