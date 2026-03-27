import type { Upload } from '@/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

/** Upload a file to Vercel Blob via the serverless function */
export async function uploadFile(
  file: File,
  orgId: string,
): Promise<Upload> {
  const res = await fetch(
    `${API_BASE}/api/upload?filename=${encodeURIComponent(file.name)}&orgId=${encodeURIComponent(orgId)}`,
    {
      method: 'POST',
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
    `${API_BASE}/api/uploads?orgId=${encodeURIComponent(orgId)}`,
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch uploads: ${res.status}`);
  }

  return res.json();
}

/** Delete an upload by ID */
export async function deleteUpload(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/uploads/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error(`Failed to delete upload: ${res.status}`);
  }
}
