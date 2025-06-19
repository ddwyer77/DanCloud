import React from 'react';
import {
  View,
  StyleSheet,
  Image,
  Dimensions,
  SafeAreaView,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RouteParams {
  imageUrl: string;
}

const ViewImageScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { imageUrl } = route.params as RouteParams;

  // Safely position close button below notch if needed
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity
        style={[styles.backButton, { top: insets.top + 10 }]}
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={28} color="#fff" />
      </TouchableOpacity>
      {/* Allow tapping anywhere on the image to dismiss */}
      <TouchableWithoutFeedback onPress={() => navigation.goBack()}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="contain"
        />
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width,
    height: height,
  },
  backButton: {
    position: 'absolute',
    left: 16,
    zIndex: 2,
  },
});

export default ViewImageScreen; 