import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

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
  if (!orgId) return { nodes: [], edges: [] };
  const res = await fetch(`${API_BASE}/api/ontology?orgId=${orgId}`);
  if (!res.ok) throw new Error('Failed to fetch ontology graph');
  return res.json();
}

export function useOntologyData(orgId?: string) {
  return useQuery<OntologyGraphData>({
    queryKey: ['ontology', orgId],
    queryFn: () => fetchOntology(orgId),
    enabled: !!orgId,
    refetchInterval: 5000, 
  });
}

export function useClearOntology(orgId?: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!orgId) return;
      const res = await fetch(`${API_BASE}/api/ontology?orgId=${orgId}`, {
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
