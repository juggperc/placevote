import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUploads, uploadFile, deleteUpload } from '@/api/uploads';
import { isUuid } from '@/lib/api';
import type { UploadStatus } from '@/types';

const UPLOADS_KEY = 'uploads';
const LIVE_UPLOAD_STATUSES: UploadStatus[] = ['queued', 'processing', 'classified'];

/** Polls org uploads every 3 seconds */
export function useUploads(orgId: string | undefined) {
  return useQuery({
    queryKey: [UPLOADS_KEY, orgId],
    queryFn: () => fetchUploads(orgId!),
    enabled: isUuid(orgId),
    refetchInterval: (query) => {
      if (query.state.status === 'error') return false;

      const uploads = query.state.data;
      return uploads?.some((upload) => LIVE_UPLOAD_STATUSES.includes(upload.status))
        ? 3_000
        : false;
    },
  });
}

/** Upload a file and invalidate the uploads list */
export function useUploadFile(orgId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      if (!isUuid(orgId)) {
        throw new Error('A valid workspace is required before uploading.');
      }

      return uploadFile(file, orgId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [UPLOADS_KEY, orgId] });
    },
  });
}

/** Delete an upload and invalidate the uploads list */
export function useDeleteUpload(orgId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      if (!isUuid(orgId)) {
        throw new Error('A valid workspace is required before deleting uploads.');
      }

      return deleteUpload(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [UPLOADS_KEY, orgId] });
    },
  });
}
