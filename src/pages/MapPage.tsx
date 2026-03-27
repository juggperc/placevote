import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Map as MapIcon, Sparkles, MessageSquare } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/app-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { buildApiUrl, isUuid } from '@/lib/api';

interface SuburbData {
  suburbName: string;
  score: number;
  topIssues: string[];
  signalCount: number;
}

export default function MapPage() {
  const navigate = useNavigate();
  const org = useAppStore((s) => s.organization);
  const mapHighlights = useAppStore((s) => s.mapHighlights);

  const [geoData, setGeoData] = useState<any>(null);
  const [selectedSuburb, setSelectedSuburb] = useState<SuburbData | null>(null);

  // Fetch Friction Scores
  const { data: frictionRes, isLoading: isLoadingScores } = useQuery({
    queryKey: ['friction', org?.id],
    queryFn: async () => {
      const res = await fetch(`${buildApiUrl('/friction')}?orgId=${org?.id}`);
      if (!res.ok) throw new Error('Failed to fetch friction scores');
      return res.json();
    },
    enabled: isUuid(org?.id),
  });

  const scoresMap = useMemo(() => {
    const map = new Map<string, SuburbData>();
    if (frictionRes?.scores) {
      frictionRes.scores.forEach((s: any) => {
        // Assume mapping SA2_NAME21 to suburbName
        map.set(s.suburbName.toLowerCase(), {
          suburbName: s.suburbName,
          score: s.score,
          topIssues: s.topIssues,
          signalCount: s.signalCount,
        });
      });
    }
    return map;
  }, [frictionRes]);

  // Fetch GeoJSON
  useEffect(() => {
    fetch('/sa2-victoria.geojson')
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch((err) => console.error('Failed to load geojson', err));
  }, []);

  const getColor = (score: number) => {
    if (score > 60) return '#ea580c'; // red-orange (amber-600 / orange-600)
    if (score > 30) return '#d97706'; // amber
    return '#2563eb'; // cool blue
  };

  const styleFeature = (feature: any) => {
    const name = feature.properties.SA2_NAME21?.toLowerCase() || '';
    const data = scoresMap.get(name);
    
    // Check highlights
    const isHighlighted = mapHighlights.some((h) => h.name.toLowerCase() === name);

    return {
      fillColor: data ? getColor(data.score) : '#94a3b8',
      weight: isHighlighted ? 3 : 1,
      opacity: 1,
      color: isHighlighted ? '#ffffff' : '#334155',
      dashArray: isHighlighted ? '4' : '0',
      fillOpacity: 0.5,
      className: isHighlighted ? 'animate-pulse' : '',
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    const name = feature.properties.SA2_NAME21;
    layer.on({
      click: () => {
        const data = scoresMap.get(name?.toLowerCase());
        if (data) {
          setSelectedSuburb(data);
        } else {
          // If no friction score data, still allow selection but with null defaults
          setSelectedSuburb({
            suburbName: name,
            score: 0,
            topIssues: [],
            signalCount: 0,
          });
        }
      },
    });

    // Tooltip for quick hover
    layer.bindTooltip(name, {
      permanent: false,
      direction: 'center',
      className: 'bg-background text-foreground text-xs font-semibold px-2 border-0 shadow-sm rounded',
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden relative">
      {/* Page header */}
      <div className="shrink-0 border-b border-border/60 bg-card/50 px-4 py-3 sm:px-6 z-10 w-full shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <MapIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight">Geospatial Intelligence</h1>
              <p className="text-xs text-muted-foreground">
                Heatmap of community friction scores.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout containing Map and Canvas Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Leaflet Map Canvas */}
        <div className="flex-1 relative z-0 h-full w-full">
          {(!geoData || isLoadingScores) && (
            <div className="absolute inset-0 z-[60] bg-background">
              <Skeleton className="h-full w-full rounded-none" />
            </div>
          )}
          
          <MapContainer
            center={[-37.8136, 144.9631]}
            zoom={12}
            zoomControl={false}
            className="w-full h-[calc(100vh-64px)] z-0"
            style={{ isolation: 'isolate', zIndex: 0 }} // Keep leaflet behind navbars
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png"
              // Using CartoDB basemap for a better data viz aesthetic. OpenStreetMap data.
            />

            {geoData && frictionRes && (
              <GeoJSON
                data={geoData}
                style={styleFeature}
                onEachFeature={onEachFeature}
              />
            )}
          </MapContainer>

          {/* Map Legend */}
          <div className="absolute bottom-6 left-6 z-[10] rounded-xl border border-border/50 bg-background/90 p-4 shadow-lg backdrop-blur-sm">
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Friction Index</h4>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="h-3 w-4 rounded-sm bg-[#ea580c] opacity-60"></div>
                <span className="text-xs font-medium">Critical (61-100)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-4 rounded-sm bg-[#d97706] opacity-60"></div>
                <span className="text-xs font-medium">Elevated (31-60)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-4 rounded-sm bg-[#2563eb] opacity-60"></div>
                <span className="text-xs font-medium">Stable (0-30)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Info Panel Overlay */}
        {selectedSuburb && (
          <div className="w-80 shrink-0 border-l border-border/60 bg-card/95 shadow-2xl z-20 flex flex-col h-full animate-in slide-in-from-right relative">
            {/* Close Button top-right */}
            <button 
              onClick={() => setSelectedSuburb(null)}
              className="absolute top-4 right-4 h-6 w-6 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground flex items-center justify-center transition"
            >
              ×
            </button>
            
            <ScrollArea className="flex-1">
              <div className="flex flex-col gap-6 p-6">
                <div>
                  <h2 className="text-xl font-bold tracking-tight mb-1">{selectedSuburb.suburbName}</h2>
                  <p className="text-xs text-muted-foreground">Statistical Area Level 2</p>
                </div>

                {/* Score Big Card */}
                <div className="flex flex-col items-center justify-center rounded-2xl border border-border/50 bg-background py-8 shadow-sm">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Friction Score</span>
                  <div 
                    className="text-6xl font-black tracking-tighter" 
                    style={{ color: getColor(selectedSuburb.score) }}
                  >
                    {Math.round(selectedSuburb.score)}
                  </div>
                  <span className="mt-2 text-xs font-medium text-muted-foreground">0-100 Resistance Scale</span>
                </div>

                {/* Top Issues */}
                {selectedSuburb.topIssues.length > 0 && (
                  <div>
                    <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Sparkles className="h-3 w-3" /> Prominent Themes
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedSuburb.topIssues.map((issue, idx) => (
                        <Badge key={idx} variant="secondary" className="px-2.5 py-1 text-xs">{issue}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Volume Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-background p-3">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Signals</span>
                    <span className="text-lg font-bold">{selectedSuburb.signalCount}</span>
                  </div>
                  <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-background p-3">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Projects</span>
                    <span className="text-lg font-bold">{selectedSuburb.signalCount > 0 ? 'Linked to nodes' : '0'}</span>
                  </div>
                </div>

                {/* Deep Dive Action */}
                <div className="mt-4 border-t pt-6 border-border/50">
                  <Button 
                    className="w-full group shadow-md"
                    onClick={() => {
                      // Navigate to Chat tab with a generic pre-filled question
                      navigate(`/chat?q=${encodeURIComponent(`What are the key friction points and current community sentiment in ${selectedSuburb.suburbName}?`)}`);
                    }}
                  >
                    <MessageSquare className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                    Ask Assistant about {selectedSuburb.suburbName}
                  </Button>
                </div>

              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}
