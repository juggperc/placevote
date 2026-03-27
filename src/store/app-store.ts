import { create } from 'zustand';
import type { User, Organization } from '@/types';

interface AppStore {
  // Auth / identity
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;

  // Tools state
  mapHighlights: { name: string; score: number }[];

  // Actions
  setUser: (user: User | null) => void;
  setOrganization: (org: Organization | null) => void;
  setMapHighlights: (highlights: { name: string; score: number }[]) => void;
  logout: () => void;
}

// Stub user and org for development
const STUB_USER: User = {
  id: 'usr_001',
  email: 'alex@placevote.io',
  displayName: 'Alex McIntyre',
  role: 'admin',
};

const STUB_ORG: Organization = {
  id: 'org_001',
  name: 'City of Melbourne',
  slug: 'city-of-melbourne',
};

export const useAppStore = create<AppStore>((set) => ({
  user: STUB_USER,
  organization: STUB_ORG,
  isAuthenticated: true,
  mapHighlights: [],

  setUser: (user) =>
    set({ user, isAuthenticated: user !== null }),

  setOrganization: (organization) =>
    set({ organization }),
    
  setMapHighlights: (mapHighlights) =>
    set({ mapHighlights }),

  logout: () =>
    set({ user: null, organization: null, isAuthenticated: false, mapHighlights: [] }),
}));
