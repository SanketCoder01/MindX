"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client'
// Using any types to avoid import issues
type Session = any
type User = any

interface UserProfile {
  id?: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  // Add other fields for both students and faculty as needed
}

interface UserContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  fetchUserProfile: (user: User) => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (user: User) => {
    // First, check the 'students' table
    let { data: profileData } = await supabase.from('students').select('*').eq('id', user.id).single();
    
    // If not found in students, check 'faculty'
    if (!profileData) {
      ({ data: profileData } = await supabase.from('faculty').select('*').eq('id', user.id).single());
    }

    setProfile(profileData || null);
  };

  useEffect(() => {
    console.log('UserProvider: Initializing');
    const getInitialSession = async () => {
      setIsLoading(true);
      console.log('UserProvider: Getting initial session...');
      const { data: { session } } = await supabase.auth.getSession();
      console.log('UserProvider: Initial session object:', session);
      setSession(session);
      const currentUser = session?.user;
      setUser(currentUser ?? null);
      if (currentUser) {
        console.log('UserProvider: Fetching profile for initial user:', currentUser.id);
        await fetchUserProfile(currentUser);
      } else {
        console.log('UserProvider: No initial user found.');
      }
      setIsLoading(false);
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      console.log('🔍 Auth state changed. Event:', event);
      
      setSession(session);
      const currentUser = session?.user;
      setUser(currentUser ?? null);
      
      if (currentUser && event === 'SIGNED_IN') {
        console.log('✅ User signed in:', currentUser.email);
        
        try {
          // Check if user exists in database with detailed error handling
          const { data: student, error: studentError } = await supabase
            .from('students')
            .select('*')
            .eq('email', currentUser.email)
            .maybeSingle();
            
          const { data: faculty, error: facultyError } = await supabase
            .from('faculty')
            .select('*')
            .eq('email', currentUser.email)
            .maybeSingle();
            
          const { data: pending, error: pendingError } = await supabase
            .from('pending_registrations')
            .select('*')
            .eq('email', currentUser.email)
            .maybeSingle();
          
          console.log('🔍 Database queries completed');
          console.log('👤 Student result:', student ? 'FOUND' : 'NOT FOUND', studentError ? `ERROR: ${studentError.message}` : '');
          console.log('👨‍🏫 Faculty result:', faculty ? 'FOUND' : 'NOT FOUND', facultyError ? `ERROR: ${facultyError.message}` : '');
          console.log('⏳ Pending result:', pending ? 'FOUND' : 'NOT FOUND', pendingError ? `ERROR: ${pendingError.message}` : '');
          
          if (studentError || facultyError || pendingError) {
            console.error('❌ Database errors detected:', { studentError, facultyError, pendingError });
          }
          
          if (student || faculty) {
            // Existing user - go to dashboard
            console.log('🏠 Existing user found, redirecting to dashboard');
            window.location.href = '/dashboard';
          } else if (pending) {
            // Pending approval
            console.log('⏳ Pending registration found, redirecting to pending approval');
            window.location.href = '/auth/pending-approval';
          } else {
            // New user - go to registration
            console.log('📝 New user detected, redirecting to registration');
            const params = new URLSearchParams({
              email: currentUser.email!,
              name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
              photo: currentUser.user_metadata?.avatar_url || ''
            });
            window.location.href = `/student-registration?${params.toString()}`;
          }
        } catch (error) {
          console.error('💥 Critical error in auth flow:', error);
          // Fallback to registration on any error
          const params = new URLSearchParams({
            email: currentUser.email!,
            name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || '',
            photo: currentUser.user_metadata?.avatar_url || ''
          });
          window.location.href = `/student-registration?${params.toString()}`;
        }
      } else if (!currentUser) {
        setProfile(null);
      }
    });

    return () => {
      console.log('UserProvider: Unsubscribing from auth listener.');
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = {
    session,
    user,
    profile,
    isLoading,
    fetchUserProfile
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
