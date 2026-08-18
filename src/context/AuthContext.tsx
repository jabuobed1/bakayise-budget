import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { UserRole, Workspace, UserProfile } from '../types';
import {
  AllowedFamilyMember,
  ALLOWED_EMAILS_MAP,
  getFamilyMemberByEmail,
  isAllowedFamilyEmail,
} from '../utils/authConstants';
import {
  fetchAllUserWorkspaces,
  joinWorkspaceById,
  toggleWorkspacePrivacy,
} from '../services/firestoreService';

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
  activeWorkspaceId: string | null;
  workspaces: Workspace[];
  availablePublicWorkspaces: Workspace[];
  switchWorkspace: (workspaceId: string) => Promise<void>;
  renameWorkspace: (workspaceId: string, newName: string) => Promise<void>;
  createWorkspace: (name: string, isPrivate?: boolean, description?: string) => Promise<string>;
  joinWorkspace: (workspaceId: string) => Promise<void>;
  togglePrivacy: (workspaceId: string, isPrivate: boolean) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
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
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [availablePublicWorkspaces, setAvailablePublicWorkspaces] = useState<Workspace[]>([]);

  const fetchWorkspaces = useCallback(async (u: User, profile?: UserProfile) => {
    try {
      const { joined, availablePublic } = await fetchAllUserWorkspaces(u.uid);

      // If user has no joined workspaces and no public workspaces exist at all, create an initial default
      if (joined.length === 0 && availablePublic.length === 0) {
        const email = u.email?.toLowerCase() || '';
        const memberInfo = getFamilyMemberByEmail(email);
        const name = memberInfo ? `${memberInfo.displayName}'s Family Budget` : 'My Family Budget';
        
        const newWorkspaceId = `ws_${Date.now()}`;
        const newWs: Workspace = {
          id: newWorkspaceId,
          name,
          ownerId: u.uid,
          memberIds: [u.uid],
          isPrivate: false, // Default family shared
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastEditedBy: u.displayName || 'User',
          lastEditedByEmail: u.email || '',
          lastEditedAt: new Date().toISOString(),
          userId: u.uid,
          householdId: newWorkspaceId,
          workspaceId: newWorkspaceId,
        };

        await setDoc(doc(db, 'workspaces', newWorkspaceId), newWs);
        setWorkspaces([newWs]);
        setAvailablePublicWorkspaces([]);
        setActiveWorkspaceId(newWorkspaceId);

        // Update profile with this workspace
        const profileRef = doc(db, 'user_profiles', u.uid);
        await setDoc(profileRef, {
          activeWorkspaceId: newWorkspaceId,
          defaultWorkspaceId: newWorkspaceId,
          workspaceIds: [newWorkspaceId],
          updatedAt: new Date().toISOString(),
        }, { merge: true });

        return;
      }

      setWorkspaces(joined);
      setAvailablePublicWorkspaces(availablePublic);

      if (joined.length > 0) {
        // Preference: profile.defaultWorkspaceId > profile.activeWorkspaceId > first joined workspace
        let targetId = profile?.defaultWorkspaceId || profile?.activeWorkspaceId;
        
        if (!targetId || !joined.find(w => w.id === targetId)) {
          targetId = joined[0].id;
        }
        
        setActiveWorkspaceId(targetId);

        const profileRef = doc(db, 'user_profiles', u.uid);
        await setDoc(profileRef, {
          activeWorkspaceId: targetId,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
      } else if (availablePublic.length > 0) {
        // Automatically set first discoverable as active preview or let user join
        setActiveWorkspaceId(null);
      }
    } catch (err) {
      console.error('Error fetching workspaces:', err);
    }
  }, []);

  const refreshWorkspaces = useCallback(async () => {
    if (!user) return;
    const profileRef = doc(db, 'user_profiles', user.uid);
    const profileSnap = await getDoc(profileRef);
    const profile = profileSnap.exists() ? (profileSnap.data() as UserProfile) : undefined;
    await fetchWorkspaces(user, profile);
  }, [user, fetchWorkspaces]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && currentUser.email) {
        const familyMember = getFamilyMemberByEmail(currentUser.email);
        if (familyMember) {
          setUser(currentUser);
          setMember(familyMember);
          setBlockedEmail(null);
          setAuthError(null);

          // Fetch or create profile and workspaces
          const profileRef = doc(db, 'user_profiles', currentUser.uid);
          const profileSnap = await getDoc(profileRef);
          let profile: UserProfile | undefined;
          
          if (profileSnap.exists()) {
            profile = profileSnap.data() as UserProfile;
          }
          
          await fetchWorkspaces(currentUser, profile);
        } else {
          // Unauthorized email
          const unauthEmail = currentUser.email;
          setBlockedEmail(unauthEmail);
          setUser(null);
          setMember(null);
          setAuthError(
            `Access Denied: ${unauthEmail} is not authorized. Access is restricted to allowed family members.`
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
        setActiveWorkspaceId(null);
        setWorkspaces([]);
        setAvailablePublicWorkspaces([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchWorkspaces]);

  const switchWorkspace = async (workspaceId: string) => {
    if (!user) return;
    setActiveWorkspaceId(workspaceId);
    try {
      const profileRef = doc(db, 'user_profiles', user.uid);
      await updateDoc(profileRef, {
        activeWorkspaceId: workspaceId,
        defaultWorkspaceId: workspaceId, // Update default as well when manually switching
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Error updating active workspace in profile:', err);
    }
  };

  const renameWorkspace = async (workspaceId: string, newName: string) => {
    if (!user) return;
    try {
      const wsRef = doc(db, 'workspaces', workspaceId);
      await updateDoc(wsRef, {
        name: newName,
        updatedAt: new Date().toISOString(),
        lastEditedBy: user.displayName || 'User',
        lastEditedAt: new Date().toISOString(),
      });
      setWorkspaces(prev => prev.map(ws => ws.id === workspaceId ? { ...ws, name: newName } : ws));
    } catch (err) {
      console.error('Error renaming workspace:', err);
    }
  };

  const createWorkspace = async (name: string, isPrivate: boolean = false, description: string = ''): Promise<string> => {
    if (!user) throw new Error('User not signed in');
    const newWorkspaceId = `ws_${Date.now()}`;
    const newWs: Workspace = {
      id: newWorkspaceId,
      name,
      description,
      isPrivate,
      ownerId: user.uid,
      memberIds: [user.uid],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastEditedBy: user.displayName || 'User',
      lastEditedByEmail: user.email || '',
      lastEditedAt: new Date().toISOString(),
      userId: user.uid,
      householdId: newWorkspaceId,
      workspaceId: newWorkspaceId,
    };

    await setDoc(doc(db, 'workspaces', newWorkspaceId), newWs);
    setWorkspaces(prev => [newWs, ...prev]);
    setActiveWorkspaceId(newWorkspaceId);

    // Update profile
    const profileRef = doc(db, 'user_profiles', user.uid);
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      const profile = profileSnap.data() as UserProfile;
      const currentIds = profile.workspaceIds || [];
      await updateDoc(profileRef, {
        activeWorkspaceId: newWorkspaceId,
        defaultWorkspaceId: newWorkspaceId,
        workspaceIds: Array.from(new Set([...currentIds, newWorkspaceId])),
        updatedAt: new Date().toISOString(),
      });
    }

    return newWorkspaceId;
  };

  const joinWorkspace = async (workspaceId: string) => {
    if (!user) return;
    await joinWorkspaceById(workspaceId, {
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
    });
    await refreshWorkspaces();
    await switchWorkspace(workspaceId);
  };

  const togglePrivacy = async (workspaceId: string, isPrivate: boolean) => {
    if (!user) return;
    await toggleWorkspacePrivacy(workspaceId, isPrivate, {
      displayName: user.displayName,
      email: user.email,
    });
    await refreshWorkspaces();
  };

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
          `Access Denied: ${unauthEmail} is not allowed to access this application.`
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
      setActiveWorkspaceId(null);
      setWorkspaces([]);
      setAvailablePublicWorkspaces([]);
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
        activeWorkspaceId,
        workspaces,
        availablePublicWorkspaces,
        switchWorkspace,
        renameWorkspace,
        createWorkspace,
        joinWorkspace,
        togglePrivacy,
        refreshWorkspaces,
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
