import {
  FileSpreadsheet,
  FileText,
  Braces,
  Globe,
  Archive,
  File,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useUploads, useDeleteUpload } from '@/hooks/use-uploads';
import { useAppStore } from '@/store/app-store';
import type { Upload, UploadStatus } from '@/types';

/* ─── File icon by detected type ──────────────────────────── */
const TYPE_ICONS: Record<string, typeof File> = {
  csv: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  pdf: FileText,
  json: Braces,
  geojson: Globe,
  shapefile: Archive,
};

function FileIcon({ type }: { type: string | null }) {
  const Icon = (type && TYPE_ICONS[type]) || File;
  return <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />;
}

/* ─── Status badge config ─────────────────────────────────── */
const STATUS_CONFIG: Record<UploadStatus, { label: string; className: string }> = {
  queued: {
    label: 'Queued',
    className: 'bg-muted text-muted-foreground',
  },
  processing: {
    label: 'Processing',
    className: 'bg-primary/15 text-primary animate-pulse',
  },
  classified: {
    label: 'Classified',
    className: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  },
  ready: {
    label: 'Ready',
    className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  },
  error: {
    label: 'Error',
    className: 'bg-destructive/15 text-destructive',
  },
};

/* ─── Single upload row ───────────────────────────────────── */
function UploadRow({
  upload,
  onDelete,
  isDeleting,
}: {
  upload: Upload;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const status = STATUS_CONFIG[upload.status] ?? STATUS_CONFIG.queued;

  return (
    <div
      className={cn(
        'group flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 transition-all duration-200 hover:shadow-sm',
        isDeleting && 'pointer-events-none opacity-50',
      )}
    >
      {/* File icon */}
      <FileIcon type={upload.detectedType} />

      {/* Filename + metadata */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-tight">
          {upload.filename}
        </p>
        <div className="mt-1 flex items-center gap-2">
          {/* Detected type badge */}
          {upload.detectedType ? (
            <Badge
              variant="secondary"
              className="text-[10px] uppercase tracking-wider"
            >
              {upload.detectedType}
            </Badge>
          ) : (
            <Badge
              variant="secondary"
              className="text-[10px] uppercase tracking-wider text-muted-foreground/60"
            >
              detecting…
            </Badge>
          )}

          {/* Row count */}
          {upload.rowCount != null && (
            <span className="text-[11px] text-muted-foreground">
              {upload.rowCount.toLocaleString()} rows
            </span>
          )}
        </div>
      </div>

      {/* Status badge */}
      <Badge variant="outline" className={cn('shrink-0 border-0 text-[11px] font-medium', status.className)}>
        {upload.status === 'processing' && (
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
        )}
        {status.label}
      </Badge>

      {/* Delete button */}
      <button
        onClick={() => onDelete(upload.id)}
        disabled={isDeleting}
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground/60 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
        title="Delete upload"
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

/* ─── Upload list ─────────────────────────────────────────── */
export default function UploadList() {
  const org = useAppStore((s) => s.organization);
  const { data: uploads, isLoading, isError } = useUploads(org?.id);
  const deleteMutation = useDeleteUpload(org?.id);
  const isPolling =
    uploads?.some((upload) =>
      ['queued', 'processing', 'classified'].includes(upload.status),
    ) ?? false;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <p className="text-sm">Loading uploads…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
        Failed to load uploads. Check your connection.
      </div>
    );
  }

  if (!uploads || uploads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <File className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No uploads yet</p>
        <p className="text-xs text-muted-foreground/60">
          Drop some files on the left to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-muted-foreground">
          Uploads ({uploads.length})
        </h3>
        {isPolling && (
          <span className="text-[10px] text-muted-foreground/60">
            Polling every 3s
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {uploads.map((upload) => (
          <UploadRow
            key={upload.id}
            upload={upload}
            onDelete={(id) => deleteMutation.mutate(id)}
            isDeleting={
              deleteMutation.isPending &&
              deleteMutation.variables === upload.id
            }
          />
        ))}
      </div>
    </div>
  );
}
