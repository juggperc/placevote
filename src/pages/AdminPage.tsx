import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '@/store/app-store';
import { ShieldAlert, Database, FileUp, Activity, FileKey, Settings, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';

export default function AdminPage() {
  const org = useAppStore((s) => s.organization);
  const user = useAppStore((s) => s.user);
  const queryClient = useQueryClient();

  const [aiModel, setAiModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [hasExistingKey, setHasExistingKey] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-stats', org?.id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/stats?orgId=${org?.id}`, {
        headers: {
          'Authorization': `Bearer ${user?.id}`
        }
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error('Forbidden: Requires Admin role');
        throw new Error('Failed to fetch admin stats');
      }
      return res.json();
    },
    enabled: !!org?.id && user?.role === 'admin',
    retry: false
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['org-settings', org?.id],
    queryFn: async () => {
      const res = await fetch(`/api/orgs/${org?.id}/settings`, {
        headers: {
          'Authorization': `Bearer ${user?.id}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
    enabled: !!org?.id && user?.role === 'admin',
  });

  useEffect(() => {
    if (settings) {
      setAiModel(settings.aiModel || '');
      setHasExistingKey(settings.hasApiKey || false);
    }
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: async (data: { aiModel?: string; openrouterApiKey?: string }) => {
      const res = await fetch(`/api/orgs/${org?.id}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save settings');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-settings', org?.id] });
    }
  });

  const handleSaveSettings = () => {
    const data: { aiModel?: string; openrouterApiKey?: string } = {};
    if (aiModel !== (settings?.aiModel || '')) {
      data.aiModel = aiModel || '';
    }
    if (apiKey) {
      data.openrouterApiKey = apiKey;
    }
    if (Object.keys(data).length > 0) {
      saveSettings.mutate(data);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center p-8 bg-background">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-bold tracking-tight">Access Denied</h2>
        <p className="text-muted-foreground mt-2">
          Your account does not possess organizational administrative privileges.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto bg-background/50 p-6 md:p-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
          <FileKey className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Global metrics for {org?.name || 'Organization'}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(idx => (
            <Card key={idx} className="animate-pulse bg-card/60">
              <CardHeader className="h-24"></CardHeader>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="p-6 border border-destructive/50 bg-destructive/10 rounded-xl text-destructive font-medium">
          {(error as any).message}
        </div>
      ) : data ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Uploads</CardTitle>
              <FileUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.uploads}</div>
              <p className="text-xs text-muted-foreground mt-1">Files queued or processed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Knowledge Nodes</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.nodes}</div>
              <p className="text-xs text-muted-foreground mt-1">Entities extracted natively</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Friction Engines</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data.frictionComputes}</div>
              <p className="text-xs text-muted-foreground mt-1">Polygons evaluating logic</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Last Engine Sync</CardTitle>
              <Activity className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{data.lastFrictionUpdate ? new Date(data.lastFrictionUpdate).toLocaleDateString() : 'N/A'}</div>
              <p className="text-xs text-muted-foreground mt-1 text-primary">Global analytics active</p>
            </CardContent>
          </Card>

        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">AI Configuration</CardTitle>
            <p className="text-sm text-muted-foreground">Configure organization-wide AI model and API keys</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {settingsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">AI Model</label>
                <Input
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="x-ai/grok-4.1-fast"
                />
                <p className="text-xs text-muted-foreground">
                  OpenRouter model identifier. Defaults to x-ai/grok-4.1-fast if not set.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">OpenRouter API Key</label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasExistingKey ? '••••••••••••' : 'sk-or-...'}
                />
                <p className="text-xs text-muted-foreground">
                  {hasExistingKey 
                    ? 'An API key is already configured. Enter a new key to update it.'
                    : 'Your OpenRouter API key. Falls back to system default if not set.'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleSaveSettings}
                  disabled={saveSettings.isPending}
                >
                  {saveSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </Button>

                {saveSettings.isSuccess && (
                  <span className="text-sm text-green-600">Settings saved successfully</span>
                )}
                {saveSettings.isError && (
                  <span className="text-sm text-destructive">
                    {(saveSettings.error as Error)?.message || 'Failed to save settings'}
                  </span>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}