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
  subscribeToAllWorkspaces,
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
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
    return localStorage.getItem('bakayise_active_workspace_id') || null;
  });
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [availablePublicWorkspaces, setAvailablePublicWorkspaces] = useState<Workspace[]>([]);

  // Real-time workspace subscription on user change
  useEffect(() => {
    if (!user || !member) {
      setWorkspaces([]);
      setAvailablePublicWorkspaces([]);
      return;
    }

    let isSubscribed = true;
    let unsubWorkspaces: (() => void) | null = null;

    async function initUserWorkspaces() {
      if (!user) return;
      try {
        // Fetch current profile
        const profileRef = doc(db, 'user_profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        const profile = profileSnap.exists() ? (profileSnap.data() as UserProfile) : undefined;
        const profileWsIds = profile?.workspaceIds || [];

        // Subscribe in real-time to workspaces collection
        unsubWorkspaces = subscribeToAllWorkspaces(
          user.uid,
          user.email || '',
          profileWsIds,
          async (result) => {
            if (!isSubscribed) return;
            const { joined, availablePublic, allWorkspaces } = result;

            // Only create initial workspace if Firestore workspaces collection is completely empty (0 documents)
            if (allWorkspaces.length === 0) {
              const email = user.email?.toLowerCase() || '';
              const memberInfo = getFamilyMemberByEmail(email);
              const name = memberInfo ? `${memberInfo.displayName}'s Family Budget` : 'My Family Budget';
              
              const newWorkspaceId = `ws_${Date.now()}`;
              const newWs: Workspace = {
                id: newWorkspaceId,
                name,
                ownerId: user.uid,
                memberIds: [user.uid],
                isPrivate: false,
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
              setWorkspaces([newWs]);
              setAvailablePublicWorkspaces([]);
              setActiveWorkspaceId(newWorkspaceId);
              localStorage.setItem('bakayise_active_workspace_id', newWorkspaceId);

              const pRef = doc(db, 'user_profiles', user.uid);
              await setDoc(pRef, {
                activeWorkspaceId: newWorkspaceId,
                defaultWorkspaceId: newWorkspaceId,
                workspaceIds: [newWorkspaceId],
                updatedAt: new Date().toISOString(),
              }, { merge: true });
              return;
            }

            // Normal state: Workspaces exist in Firestore
            setWorkspaces(joined);
            setAvailablePublicWorkspaces(availablePublic);

            // Resolve active workspace accurately
            setActiveWorkspaceId((currentActive) => {
              const storedId = localStorage.getItem('bakayise_active_workspace_id');
              const profileActive = profile?.activeWorkspaceId || profile?.defaultWorkspaceId;

              // 1. Current active if it exists in Firestore
              if (currentActive && allWorkspaces.some((w) => w.id === currentActive)) {
                return currentActive;
              }
              // 2. Stored ID in localStorage if it exists in Firestore
              if (storedId && allWorkspaces.some((w) => w.id === storedId)) {
                return storedId;
              }
              // 3. Profile default/active if it exists in Firestore
              if (profileActive && allWorkspaces.some((w) => w.id === profileActive)) {
                localStorage.setItem('bakayise_active_workspace_id', profileActive);
                return profileActive;
              }
              // 4. First joined/user workspace
              if (joined.length > 0) {
                const target = joined[0].id;
                localStorage.setItem('bakayise_active_workspace_id', target);
                return target;
              }
              // 5. First available other workspace
              if (availablePublic.length > 0) {
                const target = availablePublic[0].id;
                localStorage.setItem('bakayise_active_workspace_id', target);
                return target;
              }
              return null;
            });
          }
        );
      } catch (err) {
        console.error('Error initiating workspaces subscription:', err);
      }
    }

    initUserWorkspaces();

    return () => {
      isSubscribed = false;
      if (unsubWorkspaces) {
        unsubWorkspaces();
      }
    };
  }, [user, member]);

  const refreshWorkspaces = useCallback(async () => {
    if (!user) return;
    try {
      const profileRef = doc(db, 'user_profiles', user.uid);
      const profileSnap = await getDoc(profileRef);
      const profile = profileSnap.exists() ? (profileSnap.data() as UserProfile) : undefined;
      const { joined, availablePublic } = await fetchAllUserWorkspaces(
        user.uid,
        user.email || '',
        profile?.workspaceIds
      );
      setWorkspaces(joined);
      setAvailablePublicWorkspaces(availablePublic);
    } catch (err) {
      console.error('Error refreshing workspaces:', err);
    }
  }, [user]);

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
  }, []);

  const switchWorkspace = async (workspaceId: string) => {
    if (!user) return;
    setActiveWorkspaceId(workspaceId);
    localStorage.setItem('bakayise_active_workspace_id', workspaceId);
    try {
      const profileRef = doc(db, 'user_profiles', user.uid);
      await setDoc(
        profileRef,
        {
          activeWorkspaceId: workspaceId,
          defaultWorkspaceId: workspaceId,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
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
        lastEditedByEmail: user.email || '',
        lastEditedAt: new Date().toISOString(),
      });
      setWorkspaces((prev) =>
        prev.map((ws) => (ws.id === workspaceId ? { ...ws, name: newName } : ws))
      );
    } catch (err) {
      console.error('Error renaming workspace:', err);
    }
  };

  const createWorkspace = async (
    name: string,
    isPrivate: boolean = false,
    description: string = ''
  ): Promise<string> => {
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
    setActiveWorkspaceId(newWorkspaceId);
    localStorage.setItem('bakayise_active_workspace_id', newWorkspaceId);

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
      localStorage.removeItem('bakayise_active_workspace_id');
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

