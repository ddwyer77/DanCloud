import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { User } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      setSession(session);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching user profile for ID:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        
        // If user profile doesn't exist, try to create it
        if (error.code === 'PGRST116') {
          console.log('User profile not found, attempting to create it...');
          
          // Try to call the helper function to create the profile
          const { data: createResult, error: createError } = await supabase
            .rpc('ensure_user_profile', { user_id: userId });
            
          if (createError) {
            console.error('Failed to create user profile:', createError);
            throw error; // Throw original error
          }
          
          if (createResult) {
            console.log('Profile creation successful, retrying fetch...');
            // Retry fetching the profile
            const { data: retryData, error: retryError } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .single();
              
            if (retryError) {
              console.error('Profile fetch retry failed:', retryError);
              throw retryError;
            }
            
            console.log('User profile fetched successfully after creation:', retryData);
            setUser(retryData);
            return;
          }
        }
        
        throw error;
      }
      
      console.log('User profile fetched successfully:', data);
      setUser(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Don't throw the error - this prevents the app from crashing
      // Instead, keep the user logged in but with null profile
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('Attempting to sign in with email:', email);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Sign in error:', error);
      throw error;
    }
    console.log('Sign in successful');
  };

  const signUp = async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username }
      }
    });

    if (error) throw error;

    // User profile will be created automatically by database trigger
    // No need to manually insert into users table
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) throw new Error('No user logged in');

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;

    // Update local state
    setUser({ ...user, ...updates });
  };

  const value = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 