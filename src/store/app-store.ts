import { create } from 'zustand';
import type { User, Organization } from '@/types';

interface AppStore {
  // Auth / identity
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
  getAuthToken: (() => Promise<string | null>) | null;

  // Tools state
  mapHighlights: { name: string; score: number }[];

  // Actions
  setUser: (user: User | null) => void;
  setOrganization: (org: Organization | null) => void;
  setAuthTokenGetter: (getAuthToken: (() => Promise<string | null>) | null) => void;
  setMapHighlights: (highlights: { name: string; score: number }[]) => void;
  logout: () => void;
}

const CLERK_CONFIGURED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';
const DEMO_ORG_ID = '00000000-0000-4000-8000-000000000002';

// Stub user and org for development (when Clerk is not configured)
const STUB_USER: User = {
  id: DEMO_USER_ID,
  email: 'demo@placevote.io',
  displayName: 'Demo User',
  role: 'admin',
};

const STUB_ORG: Organization = {
  id: DEMO_ORG_ID,
  name: 'Demo Council',
  slug: 'demo-council',
};

export const useAppStore = create<AppStore>((set) => ({
  user: CLERK_CONFIGURED ? null : STUB_USER,
  organization: CLERK_CONFIGURED ? null : STUB_ORG,
  isAuthenticated: !CLERK_CONFIGURED,
  getAuthToken: null,
  mapHighlights: [],

  setUser: (user) =>
    set({ user, isAuthenticated: user !== null }),

  setOrganization: (organization) =>
    set({ organization }),

  setAuthTokenGetter: (getAuthToken) =>
    set({ getAuthToken }),
    
  setMapHighlights: (mapHighlights) =>
    set({ mapHighlights }),

  logout: () =>
    set({
      user: null,
      organization: null,
      isAuthenticated: false,
      getAuthToken: null,
      mapHighlights: [],
    }),
}));
