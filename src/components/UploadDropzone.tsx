import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, CloudUpload, FileSpreadsheet, FileText, Braces, Globe, Archive, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUploadFile } from '@/hooks/use-uploads';
import { useAppStore } from '@/store/app-store';
import { isUuid } from '@/lib/api';
import { toast } from 'sonner';

const ACCEPT = {
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/pdf': ['.pdf'],
  'application/json': ['.json', '.geojson'],
  'application/geo+json': ['.geojson'],
  'application/zip': ['.zip'],
};

const FILE_TYPE_LABELS: Record<string, { label: string; icon: typeof FileText }> = {
  csv: { label: 'CSV', icon: FileSpreadsheet },
  xlsx: { label: 'XLSX', icon: FileSpreadsheet },
  pdf: { label: 'PDF', icon: FileText },
  json: { label: 'JSON', icon: Braces },
  geojson: { label: 'GeoJSON', icon: Globe },
  zip: { label: 'Shapefile', icon: Archive },
};

type UploadQueueItem = {
  id: string;
  name: string;
  status: 'uploading' | 'error';
  message?: string;
};

export default function UploadDropzone() {
  const org = useAppStore((s) => s.organization);
  const { mutateAsync, isPending } = useUploadFile(org?.id);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const canUpload = isUuid(org?.id);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        const queueId = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setUploadQueue((q) => [...q, { id: queueId, name: file.name, status: 'uploading' }]);

        try {
          await mutateAsync(file);
          setUploadQueue((q) => q.filter((item) => item.id !== queueId));
        } catch (err) {
          const message =
            err instanceof Error ? err.message : `Failed to upload ${file.name}.`;
          console.error(`Failed to upload ${file.name}:`, err);
          toast.error(message);
          setUploadQueue((q) =>
            q.map((item) =>
              item.id === queueId
                ? { ...item, status: 'error', message }
                : item,
            ),
          );
          window.setTimeout(() => {
            setUploadQueue((q) => q.filter((item) => item.id !== queueId));
          }, 6000);
        }
      }
    },
    [mutateAsync],
  );

  const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } =
    useDropzone({
      onDrop,
      accept: ACCEPT,
      multiple: true,
      disabled: isPending || !canUpload,
    });

  return (
    <div className="flex flex-col gap-4">
      <div
        {...getRootProps()}
        className={cn(
          'group relative flex min-h-[280px] cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 transition-all duration-300',
          isDragActive && isDragAccept
            ? 'border-primary bg-primary/5 shadow-lg shadow-primary/5'
          : isDragReject
              ? 'border-destructive bg-destructive/5'
              : 'border-border hover:border-primary/40 hover:bg-muted/50',
          (isPending || !canUpload) && 'pointer-events-none opacity-60',
        )}
      >
        <input {...getInputProps()} />

        {/* Icon */}
        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300',
            isDragActive && isDragAccept
              ? 'bg-primary/15 text-primary scale-110'
              : isDragReject
                ? 'bg-destructive/15 text-destructive'
                : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary',
          )}
        >
          {isPending ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : isDragActive ? (
            <Upload className="h-8 w-8" />
          ) : (
            <CloudUpload className="h-8 w-8" />
          )}
        </div>

        {/* Text */}
        <div className="text-center">
          <p className="text-sm font-medium">
            {isDragActive
              ? isDragReject
                ? 'Unsupported file type'
                : 'Drop files here…'
              : 'Drag & drop files here'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {canUpload ? (
              <>
                or <span className="text-primary underline underline-offset-2">browse files</span>
              </>
            ) : (
              'Workspace is still initialising…'
            )}
          </p>
        </div>

        {/* Supported types */}
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {Object.entries(FILE_TYPE_LABELS).map(([ext, { label, icon: Icon }]) => (
            <span
              key={ext}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              <Icon className="h-3 w-3" />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Active upload queue */}
      {uploadQueue.length > 0 && (
        <div className="space-y-1">
          {uploadQueue.map((item) => (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-xs',
                item.status === 'error'
                  ? 'border border-destructive/25 bg-destructive/5 text-destructive'
                  : 'bg-muted/50',
              )}
            >
              {item.status === 'error' ? (
                <Upload className="h-3.5 w-3.5" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              )}
              <span className="truncate">{item.name}</span>
              <span className={cn('ml-auto', item.status === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
                {item.status === 'error' ? 'Upload failed' : 'Uploading…'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
