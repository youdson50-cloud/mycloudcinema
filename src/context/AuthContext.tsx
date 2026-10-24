import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  isDemoUser: boolean;
  loginAsDemo: () => void;
  authError: string | null;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOutUser: async () => {},
  isDemoUser: false,
  loginAsDemo: () => {},
  authError: null,
  clearAuthError: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoUser, setIsDemoUser] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check if demo user was active
    const savedDemo = localStorage.getItem('mycloud_demo_mode');
    if (savedDemo === 'true') {
      setIsDemoUser(true);
      setUser({
        uid: 'demo_user_cinema_vip',
        email: 'youdson.demo@cinema.local',
        displayName: 'Youdson (Compte Démo)',
        photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
        emailVerified: true,
      } as unknown as User);
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsDemoUser(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      localStorage.removeItem('mycloud_demo_mode');
      setIsDemoUser(false);
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Sign-in Error:', err);
      setAuthError(err.message || 'Impossible de se connecter avec Google.');
    }
  };

  const loginAsDemo = () => {
    localStorage.setItem('mycloud_demo_mode', 'true');
    setIsDemoUser(true);
    setUser({
      uid: 'demo_user_cinema_vip',
      email: 'youdson.demo@cinema.local',
      displayName: 'Youdson (Compte Démo)',
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
      emailVerified: true,
    } as unknown as User);
  };

  const signOutUser = async () => {
    localStorage.removeItem('mycloud_demo_mode');
    setIsDemoUser(false);
    setUser(null);
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const clearAuthError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signInWithGoogle,
        signOutUser,
        isDemoUser,
        loginAsDemo,
        authError,
        clearAuthError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
