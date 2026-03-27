import { useMemo, useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  type NodeProps,
  type Edge,
  type Node,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import '@xyflow/react/dist/style.css';

import {
  MapPin,
  Hammer,
  MessageSquare,
  CircleDollarSign,
  AlertTriangle,
  Component,
  Trash2,
  X,
} from 'lucide-react';

import { useAppStore } from '@/store/app-store';
import { useOntologyData, useClearOntology } from '@/hooks/use-ontology';
import { useUploads } from '@/hooks/use-uploads';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// ─── Constants & Types ─────────────────────────────────────────

const TYPE_CONFIG: Record<
  string,
  { color: string; bg: string; icon: React.ElementType }
> = {
  Place: {
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: MapPin,
  },
  Project: {
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800',
    icon: Hammer,
  },
  Submission: {
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    icon: MessageSquare,
  },
  Budget: {
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    icon: CircleDollarSign,
  },
  Signal: {
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    icon: AlertTriangle,
  },
};

const DEFAULT_CONFIG = {
  color: 'text-slate-600 dark:text-slate-400',
  bg: 'bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800',
  icon: Component,
};

// ─── Custom Node Component ─────────────────────────────────────

function EntityNode({ data }: NodeProps) {
  const type = data.type as string;
  const config = TYPE_CONFIG[type] || DEFAULT_CONFIG;
  const Icon = config.icon;

  return (
    <div
      className={`rounded-full border-2 px-4 py-2 shadow-sm transition-transform hover:scale-105 ${config.bg}`}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${config.color}`} />
        <span className="text-sm font-semibold">{data.label as React.ReactNode}</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

const nodeTypes = {
  entity: EntityNode,
};

// ─── Layout Algorithm (Dagre) ──────────────────────────────────

const getLayoutedElements = (
  nodes: Node[],
  edges: Edge[],
  direction = 'TB',
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Standard node dimensions
  const nodeWidth = 200;
  const nodeHeight = 50;

  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition:
        direction === 'TB' ? Position.Top : Position.Left,
      sourcePosition:
        direction === 'TB' ? Position.Bottom : Position.Right,
      // Shift to center
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

// ─── Main Component ────────────────────────────────────────────

export default function OntologyGraph() {
  const org = useAppStore((s) => s.organization);
  const { data: uploads } = useUploads(org?.id);
  const shouldPollOntology =
    uploads?.some((upload) =>
      ['queued', 'processing', 'classified'].includes(upload.status),
    ) ?? false;
  const { data, isLoading } = useOntologyData(org?.id, shouldPollOntology);
  const rawData = data as import('@/hooks/use-ontology').OntologyGraphData | undefined;
  const clearMutation = useClearOntology(org?.id);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  // Derive active selection details
  const selectedNode = useMemo(
    () => rawData?.nodes.find((n) => n.id === selectedNodeId) || null,
    [selectedNodeId, rawData]
  );
  
  const connectedNodes = useMemo(() => {
    if (!selectedNodeId || !rawData) return [];
    
    // Find all edges connected to the selected node
    const connectedEdges = rawData.edges.filter(
      (e) => e.sourceId === selectedNodeId || e.targetId === selectedNodeId
    );
    
    // Find all other nodes in those edges
    return connectedEdges.map(edge => {
      const otherId = edge.sourceId === selectedNodeId ? edge.targetId : edge.sourceId;
      const otherNode = rawData.nodes.find(n => n.id === otherId);
      return {
        ...otherNode,
        relationship: edge.label,
        direction: edge.sourceId === selectedNodeId ? 'out' : 'in'
      };
    }).filter(n => n.id !== undefined);
  }, [selectedNodeId, rawData]);

  useEffect(() => {
    if (!rawData) return;

    // Filter nodes manually if required, but usually just highlighting is better.
    // For pure filtering, we can dim non-matches.
    const mappedNodes: Node[] = rawData.nodes.map((node) => ({
      id: node.id,
      type: 'entity',
      data: { label: node.label, type: node.type, properties: node.properties },
      position: { x: 0, y: 0 },
      hidden: filterType ? node.type !== filterType : false,
      selected: node.id === selectedNodeId,
      style: {
        opacity: filterType && node.type !== filterType ? 0.2 : 1,
      },
    }));

    const mappedEdges: Edge[] = rawData.edges.map((edge) => ({
      id: edge.id,
      source: edge.sourceId,
      target: edge.targetId,
      label: edge.label,
      labelStyle: { fill: 'var(--foreground)', fontSize: 10, fontWeight: 500 },
      labelBgStyle: { fill: 'var(--background)', fillOpacity: 0.8 },
      animated: true,
      style: { strokeWidth: 1.5 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#888',
      },
      hidden: filterType
        ? (rawData.nodes.find((n) => n.id === edge.sourceId)?.type !== filterType &&
          rawData.nodes.find((n) => n.id === edge.targetId)?.type !== filterType)
        : false,
    }));

    // Re-layout only visible nodes to prevent weird jumps
    const visibleNodes = mappedNodes.filter((n) => !n.hidden);
    const visibleEdges = mappedEdges.filter((e) => !e.hidden);

    const layouted = getLayoutedElements(visibleNodes, visibleEdges, 'TB');
    
    // Include hidden nodes in react state without coordinates overriding layout
    const allLayoutedNodes = mappedNodes.map(n => {
      const layoutedMatch = layouted.nodes.find(ln => ln.id === n.id);
      return layoutedMatch ? layoutedMatch : n;
    });

    setNodes(allLayoutedNodes);
    setEdges(mappedEdges);
  }, [rawData, filterType, selectedNodeId, setNodes, setEdges]);

  // Handlers
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const handleClear = () => {
    clearMutation.mutate(undefined, {
      onSuccess: () => setIsConfirmingClear(false),
    });
  };

  const typesPresent = useMemo(
    () => Array.from(new Set(rawData?.nodes.map((n) => n.type) || [])),
    [rawData]
  );

  if (isLoading && !rawData?.nodes) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span className="text-muted-foreground animate-pulse">
          Loading graph...
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      {/* ── Filter Bar ── */}
      <div className="absolute top-4 left-4 z-10 flex gap-2 rounded-lg border bg-background/95 p-2 shadow-sm backdrop-blur">
        <Button
          variant={filterType === null ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setFilterType(null)}
          className="text-xs"
        >
          All
        </Button>
        {typesPresent.map((t) => (
          <Button
            key={t}
            variant={filterType === t ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilterType(t)}
            className="text-xs"
          >
            {t}
          </Button>
        ))}
      </div>

      {/* ── Clear Data ── */}
      <div className="absolute top-4 right-4 z-10">
        {!isConfirmingClear ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsConfirmingClear(true)}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Data
          </Button>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-background/95 p-2 shadow-sm backdrop-blur">
            <span className="text-xs font-medium text-destructive px-2">
              Are you sure?
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClear}
              disabled={clearMutation.isPending}
            >
              {clearMutation.isPending ? 'Clearing...' : 'Confirm'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsConfirmingClear(false)}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {/* ── React Flow Canvas ── */}
      <div className="flex-1 bg-muted/20">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={() => setSelectedNodeId(null)}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background color="#cbd5e1" gap={16} />
          <Controls className="bottom-4 left-4" />
          <MiniMap
            zoomable
            pannable
            nodeColor={(node: Node) => {
              const type = node.data?.type as string;
              if (type === 'Place') return '#3b82f6';
              if (type === 'Project') return '#6366f1';
              if (type === 'Submission') return '#22c55e';
              if (type === 'Budget') return '#f59e0b';
              if (type === 'Signal') return '#ef4444';
              return '#94a3b8';
            }}
          />
        </ReactFlow>
      </div>

      {/* ── Side Panel ── */}
      {selectedNode && (
        <div className="absolute right-0 top-0 z-20 h-full w-80 shrink-0 border-l bg-background/95 shadow-xl backdrop-blur-md transition-transform duration-300">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase">
                {selectedNode.type}
              </Badge>
              <h3 className="font-semibold truncate max-w-[150px]">
                {selectedNode.label}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setSelectedNodeId(null)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-60px)] px-4 py-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Properties
            </h4>
            <div className="flex flex-col gap-2 rounded-lg border bg-card p-3 shadow-sm mb-6">
              {Object.entries(selectedNode.properties || {}).length > 0 ? (
                Object.entries(selectedNode.properties || {}).map(([key, val]) => (
                  <div key={key} className="flex flex-col border-b border-border/40 pb-2 last:border-0 last:pb-0">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">
                      {key}
                    </span>
                    <span className="text-sm font-medium">
                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </span>
                  </div>
                ))
              ) : (
                <span className="text-sm text-muted-foreground italic">No properties found</span>
              )}
            </div>

            <Separator className="my-6" />

            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Connected Nodes ({connectedNodes.length})
            </h4>
            <div className="flex flex-col gap-2">
              {connectedNodes.length > 0 ? (
                connectedNodes.map((n, i) => (
                  <div
                    key={`${n.id}-${i}`}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border bg-card p-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    onClick={() => setSelectedNodeId(n.id as string)}
                  >
                    <div className="flex flex-1 flex-col">
                      <span className="font-medium">{n.label as string}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {n.direction === 'out' ? '→ ' : '← '}
                        {n.relationship}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-[9px]">
                      {n.type as string}
                    </Badge>
                  </div>
                ))
              ) : (
                <span className="text-sm text-muted-foreground italic">No connected nodes</span>
              )}
            </div>
            
            <div className="h-20" /> {/* Bottom padding */}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
