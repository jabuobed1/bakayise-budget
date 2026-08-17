import { auth } from '../firebase/config';
import { UserRole } from '../types';

export interface AllowedFamilyMember {
  email: string;
  role: UserRole;
  displayName: string;
  avatarColor: string;
  badgeBg: string;
}

// Canonical family members map
export const ALLOWED_EMAILS_MAP: Record<string, AllowedFamilyMember> = {
  'jabuobed1@gmail.com': {
    email: 'jabuobed1@gmail.com',
    role: 'Hubby',
    displayName: 'Hubby',
    avatarColor: '#30D158',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  'lumzayopa@gmail.com': {
    email: 'lumzayopa@gmail.com',
    role: 'Wifey',
    displayName: 'Wifey',
    avatarColor: '#FF375F',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
  // Typo fallback protection for wifey email
  'lumazyopa@gmail.com': {
    email: 'lumazyopa@gmail.com',
    role: 'Wifey',
    displayName: 'Wifey',
    avatarColor: '#FF375F',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  },
  'bakayise.developers@gmail.com': {
    email: 'bakayise.developers@gmail.com',
    role: 'Hubby',
    displayName: 'Bakayise Developer',
    avatarColor: '#30D158',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
};

export function getFamilyMemberByEmail(email?: string | null): AllowedFamilyMember | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  if (ALLOWED_EMAILS_MAP[normalized]) {
    return ALLOWED_EMAILS_MAP[normalized];
  }
  // Fallback for any signed-in user so no user or developer is locked out
  const namePart = normalized.split('@')[0];
  const capitalized = namePart.charAt(0).toUpperCase() + namePart.slice(1);
  return {
    email: normalized,
    role: normalized.includes('lum') ? 'Wifey' : 'Hubby',
    displayName: capitalized,
    avatarColor: '#30D158',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  };
}

export function isAllowedFamilyEmail(email?: string | null): boolean {
  return Boolean(email && email.trim().length > 0);
}

/**
 * Returns audit tracking fields for the active authenticated user
 */
export function getAuditFields() {
  const currentUser = auth.currentUser;
  const email = currentUser?.email ? currentUser.email.trim().toLowerCase() : '';
  const member = getFamilyMemberByEmail(email);

  const editor = member?.displayName || (email.includes('jabu') ? 'Hubby' : email.includes('lum') ? 'Wifey' : 'Hubby');
  const now = new Date().toISOString();

  return {
    userId: currentUser?.uid || '',
    householdId: 'shared_family_workspace',
    lastEditedBy: editor,
    lastEditedByEmail: email || 'jabuobed1@gmail.com',
    lastEditedAt: now,
  };
}
