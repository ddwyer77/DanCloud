import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

// Import our new components
import { 
  KeyboardAvoidingWrapper, 
  Button, 
  Input, 
  InputRef,
  colors, 
  typography, 
  spacing, 
  borderRadius,
  componentStyles 
} from '../../components/ui';

const ImprovedLoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const passwordRef = useRef<InputRef>(null);
  const { signIn } = useAuth();

  const validateForm = () => {
    let isValid = true;
    
    // Reset errors
    setEmailError('');
    setPasswordError('');
    
    // Email validation
    if (!email.trim()) {
      setEmailError('Email is required');
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address');
      isValid = false;
    }
    
    // Password validation
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    }
    
    return isValid;
  };

  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = () => {
    passwordRef.current?.focus();
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <SafeAreaView style={componentStyles.container}>
      <KeyboardAvoidingWrapper>
        <View style={styles.container}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>🎵</Text>
            </View>
            <Text style={styles.title}>Welcome to DanCloud</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <Input
              label="Email Address"
              placeholder="Enter your email"
              value={email}
              onChangeText={(text: string) => {
                setEmail(text);
                if (emailError) setEmailError('');
              }}
              error={emailError}
              leftIcon="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={handleEmailSubmit}
              required
            />

            <Input
              ref={passwordRef}
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={(text: string) => {
                setPassword(text);
                if (passwordError) setPasswordError('');
              }}
              error={passwordError}
              leftIcon="lock-closed-outline"
              rightIcon={showPassword ? "eye-off-outline" : "eye-outline"}
              onRightIconPress={togglePasswordVisibility}
              secureTextEntry={!showPassword}
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              required
            />

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              fullWidth
              style={styles.loginButton}
            />

            <Button
              title="Forgot Password?"
              onPress={() => navigation.navigate('ForgotPassword')}
              variant="ghost"
              style={styles.forgotButton}
            />
          </View>

          {/* Footer Section */}
          <View style={styles.footerSection}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text 
                style={styles.linkText}
                onPress={() => navigation.navigate('Register')}
              >
                Sign Up
              </Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingWrapper>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  logoSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing['2xl'],
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoText: {
    fontSize: 40,
  },
  title: {
    fontSize: typography.fontSize['3xl'],
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: typography.fontSize.lg,
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  formSection: {
    flex: 2,
    justifyContent: 'center',
  },
  loginButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  forgotButton: {
    marginBottom: spacing.lg,
  },
  footerSection: {
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  linkText: {
    color: colors.primary,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default ImprovedLoginScreen; 