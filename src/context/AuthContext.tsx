import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { UserRole } from '../types';
import {
  AllowedFamilyMember,
  ALLOWED_EMAILS_MAP,
  getFamilyMemberByEmail,
  isAllowedFamilyEmail,
} from '../utils/authConstants';

export { ALLOWED_EMAILS_MAP, getFamilyMemberByEmail, isAllowedFamilyEmail };
export type { AllowedFamilyMember };

interface AuthContextType {
  user: User | null;
  member: AllowedFamilyMember | null;
  userRole: UserRole | null;
  displayName: string;
  loading: boolean;
  isAuthorized: boolean;
  blockedEmail: string | null;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearBlockedState: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<AllowedFamilyMember | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [blockedEmail, setBlockedEmail] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email) {
        const familyMember = getFamilyMemberByEmail(currentUser.email);
        if (familyMember) {
          setUser(currentUser);
          setMember(familyMember);
          setBlockedEmail(null);
          setAuthError(null);
        } else {
          // Unauthorized email: capture blocked email and sign out
          const unauthEmail = currentUser.email;
          setBlockedEmail(unauthEmail);
          setUser(null);
          setMember(null);
          setAuthError(
            `Access Denied: ${unauthEmail} is not authorized to access this budget. Only Hubby (jabuobed1@gmail.com) and Wifey (lumzayopa@gmail.com) have access.`
          );
          try {
            await signOut(auth);
          } catch (e) {
            console.error('Error signing out unauthorized user:', e);
          }
        }
      } else {
        setUser(null);
        setMember(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setAuthError(null);
      setBlockedEmail(null);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account',
      });
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;

      if (!email || !isAllowedFamilyEmail(email)) {
        const unauthEmail = email || 'Unknown Google Account';
        setBlockedEmail(unauthEmail);
        setUser(null);
        setMember(null);
        setAuthError(
          `Access Denied: ${unauthEmail} is not allowed to access this application unless added to the list of allowed emails.`
        );
        await signOut(auth);
        return;
      }

      const familyMember = getFamilyMemberByEmail(email);
      setUser(result.user);
      setMember(familyMember);
      setBlockedEmail(null);
      setAuthError(null);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error('Google Sign-In Error:', err);
      setAuthError(err.message || 'Failed to sign in with Google. Please try again.');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setMember(null);
      setBlockedEmail(null);
      setAuthError(null);
    } catch (err) {
      console.error('Sign-Out Error:', err);
    }
  };

  const clearBlockedState = () => {
    setBlockedEmail(null);
    setAuthError(null);
  };

  const userRole = member?.role || null;
  const displayName = member?.displayName || (user?.displayName ? user.displayName : 'Family Member');
  const isAuthorized = Boolean(user && member);

  return (
    <AuthContext.Provider
      value={{
        user,
        member,
        userRole,
        displayName,
        loading,
        isAuthorized,
        blockedEmail,
        authError,
        signInWithGoogle,
        logout,
        clearBlockedState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
