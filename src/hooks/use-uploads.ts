import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUploads, uploadFile, deleteUpload } from '@/api/uploads';

const UPLOADS_KEY = 'uploads';

/** Polls org uploads every 3 seconds */
export function useUploads(orgId: string | undefined) {
  return useQuery({
    queryKey: [UPLOADS_KEY, orgId],
    queryFn: () => fetchUploads(orgId!),
    enabled: !!orgId,
    refetchInterval: 3_000,
  });
}

/** Upload a file and invalidate the uploads list */
export function useUploadFile(orgId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadFile(file, orgId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [UPLOADS_KEY, orgId] });
    },
  });
}

/** Delete an upload and invalidate the uploads list */
export function useDeleteUpload(orgId: string | undefined) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteUpload(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [UPLOADS_KEY, orgId] });
    },
  });
}
