import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buildApiUrl, isUuid } from '@/lib/api';

export type OntologyGraphData = {
  nodes: {
    id: string;
    orgId: string;
    type: string;
    label: string;
    properties: Record<string, unknown> | null;
    createdAt: string;
  }[];
  edges: {
    id: string;
    orgId: string;
    sourceId: string;
    targetId: string;
    label: string;
    weight: number | null;
    createdAt: string;
  }[];
};

async function fetchOntology(orgId?: string): Promise<OntologyGraphData> {
  if (!isUuid(orgId)) return { nodes: [], edges: [] };
  const res = await fetch(`${buildApiUrl('/ontology')}?orgId=${orgId}`);
  if (!res.ok) throw new Error('Failed to fetch ontology graph');
  return res.json();
}

export function useOntologyData(orgId?: string) {
  return useQuery<OntologyGraphData>({
    queryKey: ['ontology', orgId],
    queryFn: () => fetchOntology(orgId),
    enabled: isUuid(orgId),
    refetchInterval: (query) => (query.state.status === 'error' ? false : 5_000),
  });
}

export function useClearOntology(orgId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!isUuid(orgId)) return;
      const res = await fetch(`${buildApiUrl('/ontology')}?orgId=${orgId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to clear ontology');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ontology', orgId] });
    },
  });
}
