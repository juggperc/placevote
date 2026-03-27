import { Network, RefreshCcw, Loader2 } from 'lucide-react';
import UploadDropzone from '@/components/UploadDropzone';
import UploadList from '@/components/UploadList';
import OntologyGraph from '@/components/OntologyGraph';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAppStore } from '@/store/app-store';
import { buildApiUrl, getAuthHeaders, isUuid } from '@/lib/api';

import { Skeleton } from '@/components/ui/skeleton';

export default function OntologyPage() {
  const org = useAppStore((s) => s.organization);

  const { data: scores, isLoading } = useQuery({
    queryKey: ['friction', org?.id],
    queryFn: async () => {
      const res = await fetch(`${buildApiUrl('/friction')}?orgId=${org?.id}`);
      if (!res.ok) throw new Error('Failed to fetch logic');
      return res.json();
    },
    enabled: isUuid(org?.id),
  });

  const recomputeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(buildApiUrl('/friction/recompute'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({ orgId: org?.id }),
      });
      if (!res.ok) throw new Error('Compute error');
    },
  });

  const lastUpdated = scores?.scores?.[0]?.updatedAt;

  if (isLoading) {
    return (
      <div className="flex flex-1 overflow-hidden p-6 gap-6 h-full w-full">
        <Skeleton className="w-80 h-full rounded-xl" />
        <Skeleton className="flex-1 h-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Page header */}
      <div className="shrink-0 border-b border-border/60 bg-card/50 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Network className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">Knowledge Graph</h1>
              <p className="text-xs text-muted-foreground">
                Map and explore civic dataset entities across Placevote.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Friction computed: {new Date(lastUpdated).toLocaleDateString()} {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => recomputeMutation.mutate()} 
              disabled={recomputeMutation.isPending || !isUuid(org?.id)}
              className="text-xs"
            >
              {recomputeMutation.isPending ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="mr-2 h-3.5 w-3.5" />
              )}
              Recompute Friction
            </Button>
          </div>
        </div>
      </div>

      {/* Content: Sidebar left / Canvas right */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Uploads */}
        <div className="flex w-80 shrink-0 flex-col border-r border-border/60 bg-card/30">
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-6 p-4">
              <section>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Ingest Data
                </div>
                <UploadDropzone />
              </section>

              <section>
                <UploadList />
              </section>
            </div>
          </ScrollArea>
        </div>

        {/* Right Canvas: Graph */}
        <div className="relative flex-1 bg-background">
          <OntologyGraph />
        </div>
      </div>
    </div>
  );
}
