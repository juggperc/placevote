// Placevote global types

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: 'admin' | 'member' | 'viewer';
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
}

export interface AppState {
  user: User | null;
  organization: Organization | null;
  isAuthenticated: boolean;
}

// ─── Uploads ─────────────────────────────────────────────────────
export type UploadStatus = 'queued' | 'processing' | 'classified' | 'ready' | 'error';

export interface Upload {
  id: string;
  orgId: string;
  filename: string;
  blobUrl: string;
  status: UploadStatus;
  detectedType: string | null;
  rowCount: number | null;
  createdAt: string;
}
