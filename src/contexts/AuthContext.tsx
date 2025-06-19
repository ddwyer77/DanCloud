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
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    
    const initializeAuth = async () => {
      try {
        console.log('[AUTH] Initializing authentication...');
        
        // Set a timeout to prevent hanging indefinitely
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn('[AUTH] Auth initialization timed out, continuing with current state');
            setLoading(false);
          }
        }, 20000); // 20 second timeout - reduced since we have more granular timeouts now
        
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        clearTimeout(timeoutId);
        
        if (error) {
          console.error('[AUTH] Error getting session:', error);
          setLoading(false);
          return;
        }
        
        console.log('[AUTH] Initial session:', session?.user?.id ? 'Found' : 'None');
        setSession(session);
        
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('[AUTH] Failed to initialize:', error);
        if (isMounted) {
          clearTimeout(timeoutId);
          setLoading(false);
        }
      }
    };

    // Initialize auth
    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      console.log('[AUTH] State changed:', event, session?.user?.id);
      setSession(session);
      
      if (session?.user) {
        // Add timeout for auth state change profile fetching
        try {
          const profileFetchPromise = fetchUserProfile(session.user.id);
          const authTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Auth state change timeout')), 15000);
          });
          
          await Promise.race([profileFetchPromise, authTimeoutPromise]);
        } catch (error) {
          console.error('[AUTH] Auth state change profile fetch failed:', error);
          
          // Create minimal profile from session as fallback
          console.log('[AUTH] Creating minimal profile from auth state change');
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            username: session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as User);
          setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string, retryCount = 0) => {
    const maxRetries = 2;
    
    try {
      console.log('[AUTH] Fetching user profile for ID:', userId, retryCount > 0 ? `(retry ${retryCount})` : '');
      
      // Create a promise with timeout for the database query
      const profileQueryPromise = supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile query timeout')), 20000); // Increased to 20 second timeout
      });
        
      console.log('[AUTH] Starting profile query...');
      
      const { data, error } = await Promise.race([
        profileQueryPromise,
        timeoutPromise
      ]) as any;
      
      console.log('[AUTH] Profile query completed:', { hasData: !!data, hasError: !!error });

      if (error) {
        console.error('[AUTH] Error fetching user profile:', error);
        
        // If user profile doesn't exist, try to create it
        if (error.code === 'PGRST116') {
          console.log('[AUTH] User profile not found, attempting to create it...');
          
          try {
            const createPromise = supabase.rpc('ensure_user_profile', { user_id: userId });
            const createTimeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Profile creation timeout')), 15000); // Increased timeout
            });
            
            const { data: createResult, error: createError } = await Promise.race([
              createPromise,
              createTimeoutPromise
            ]) as any;
            
            if (createError) {
              console.error('[AUTH] Failed to create user profile:', createError);
              throw createError;
            }
            
            if (createResult) {
              console.log('[AUTH] Profile creation successful, retrying fetch...');
              
              const retryPromise = supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
                
              const retryTimeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Profile retry timeout')), 10000); // Increased timeout
              });
              
              const { data: retryData, error: retryError } = await Promise.race([
                retryPromise,
                retryTimeoutPromise
              ]) as any;
              
              if (retryError) {
                console.error('[AUTH] Profile fetch retry failed:', retryError);
                throw retryError;
              }
              
              console.log('[AUTH] User profile fetched successfully after creation');
              setUser(retryData);
              return;
            }
          } catch (createError) {
            console.error('[AUTH] Profile creation failed:', createError);
            // Fall through to create minimal profile
          }
        }
        
        // Don't throw - allow app to continue with minimal user profile
        console.warn('[AUTH] Continuing with minimal user profile');
        
        // Try a simple query without timeout as backup
        try {
          console.log('[AUTH] Attempting simple profile fetch...');
          const { data: simpleData, error: simpleError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .limit(1);
            
          if (!simpleError && simpleData && simpleData.length > 0) {
            console.log('[AUTH] Simple profile fetch successful');
            setUser(simpleData[0]);
            return;
          }
        } catch (simpleQueryError) {
          console.log('[AUTH] Simple query also failed, using session fallback');
        }
        
        // Get current session for fallback user creation
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession?.user) {
          setUser({
            id: currentSession.user.id,
            email: currentSession.user.email || '',
            username: currentSession.user.user_metadata?.username || currentSession.user.email?.split('@')[0] || 'User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as User);
        } else {
          setUser(null);
        }
      } else {
        console.log('[AUTH] User profile fetched successfully');
        setUser(data);
      }
    } catch (error) {
      console.error('[AUTH] Error in fetchUserProfile:', error);
      
      // Retry on timeout or network errors
      if (retryCount < maxRetries && (
        error instanceof Error && (
          error.message.includes('timeout') || 
          error.message.includes('network') ||
          error.message.includes('fetch')
        )
      )) {
        console.log('[AUTH] Retrying profile fetch in 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fetchUserProfile(userId, retryCount + 1);
      }
      
      // Create minimal user profile even on complete failure
      try {
        const { data: { session: fallbackSession } } = await supabase.auth.getSession();
        if (fallbackSession?.user) {
          console.log('[AUTH] Creating fallback user profile from session');
          setUser({
            id: fallbackSession.user.id,
            email: fallbackSession.user.email || '',
            username: fallbackSession.user.user_metadata?.username || fallbackSession.user.email?.split('@')[0] || 'User',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as User);
        } else {
          setUser(null);
        }
      } catch (sessionError) {
        console.error('[AUTH] Failed to get fallback session:', sessionError);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('[AUTH] Attempting to sign in with email:', email);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('[AUTH] Sign in error:', error);
      throw error;
    }
    console.log('[AUTH] Sign in successful');
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