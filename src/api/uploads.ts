import type { Upload } from '@/types';
import { buildApiUrl, getAuthHeaders } from '@/lib/api';

/** Upload a file to Vercel Blob via the serverless function */
export async function uploadFile(
  file: File,
  orgId: string,
): Promise<Upload> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(
    `${buildApiUrl('/upload')}?filename=${encodeURIComponent(file.name)}&orgId=${encodeURIComponent(orgId)}`,
    {
      method: 'POST',
      headers: authHeaders,
      body: file,
    },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Upload failed: ${res.status}`);
  }

  return res.json();
}

/** Fetch all uploads for an org */
export async function fetchUploads(orgId: string): Promise<Upload[]> {
  const res = await fetch(
    `${buildApiUrl('/uploads')}?orgId=${encodeURIComponent(orgId)}`,
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch uploads: ${res.status}`);
  }

  return res.json();
}

/** Delete an upload by ID */
export async function deleteUpload(id: string): Promise<void> {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(buildApiUrl(`/uploads/${id}`), {
    method: 'DELETE',
    headers: authHeaders,
  });

  if (!res.ok) {
    throw new Error(`Failed to delete upload: ${res.status}`);
  }
}
