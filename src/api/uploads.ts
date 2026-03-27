import type { Upload } from '@/types';
import { buildApiUrl, getAuthHeaders } from '@/lib/api';

function getErrorMessage(rawBody: string, status: number): string {
  if (!rawBody) {
    return `Upload failed: ${status}`;
  }

  try {
    const body = JSON.parse(rawBody) as { error?: string };
    return body.error ?? `Upload failed: ${status}`;
  } catch {
    return rawBody;
  }
}

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
    const rawBody = await res.text().catch(() => '');
    throw new Error(getErrorMessage(rawBody, res.status));
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
  const res = await fetch(`${buildApiUrl('/upload-delete')}?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders,
  });

  if (!res.ok) {
    throw new Error(`Failed to delete upload: ${res.status}`);
  }
}
