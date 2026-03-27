import { useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Paperclip, Sparkles, Bot } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSearchParams } from 'react-router-dom';
import { Download, FileText, FileDown, Loader2 } from 'lucide-react';
import { useCompletion } from '@ai-sdk/react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Document, Page, Text, StyleSheet, pdf } from '@react-pdf/renderer';

const pdfStyles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', color: '#1E293B' },
  title: { fontSize: 18, color: '#1E40AF', marginBottom: 10, fontWeight: 'extrabold' },
  subtitle: { fontSize: 12, color: '#64748B', marginBottom: 20 },
  heading: { fontSize: 14, color: '#0F172A', marginTop: 15, marginBottom: 5, fontWeight: 'bold' },
  body: { fontSize: 10, color: '#334155', lineHeight: 1.5, marginBottom: 8 },
});

// Native PDF Document Render utilizing regex to parse standard system markdown responses into Page Elements
const ReportDocument = ({ content, orgName }: { content: string; orgName: string }) => {
  const sections = content.split('\n').map((line, idx) => {
    if (line.startsWith('## ')) {
      return <Text key={idx} style={pdfStyles.heading}>{line.replace(/^##\s*/, '').replace(/\*/g, '')}</Text>;
    } else if (line.startsWith('# ')) {
      return <Text key={idx} style={pdfStyles.title}>{line.replace(/^#\s*/, '').replace(/\*/g, '')}</Text>;
    } else if (line.trim() !== '') {
      return <Text key={idx} style={pdfStyles.body}>{line.replace(/\*/g, '')}</Text>;
    }
    return null;
  }).filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <Text style={pdfStyles.title}>Placevote Civic Intelligence</Text>
        <Text style={pdfStyles.subtitle}>{orgName} Executive Brief - {new Date().toLocaleDateString()}</Text>
        {sections}
      </Page>
    </Document>
  );
};

export default function ChatPage() {
  const org = useAppStore((s) => s.organization);
  const user = useAppStore((s) => s.user);
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useChat({
    api: import.meta.env.VITE_API_BASE_URL
      ? `${import.meta.env.VITE_API_BASE_URL}/chat`
      : '/api/chat',
    body: {
      orgId: org?.id,
    },
    initialMessages: [],
  });

  // Handle ?q=... param from navigation (e.g., from Map Suburb "Ask about")
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      handleInputChange({ target: { value: q } } as any);
      // Remove it from URL so it doesn't stay if user refreshes
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams, handleInputChange]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Handle keyboard submission
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() || isLoading) {
        handleSubmit(e as any);
      }
    }
  };

  // ── Executive Brief Generator ──
  const {
    completion: reportCompletion,
    complete: generateReport,
    isLoading: isGeneratingReport,
  } = useCompletion({
    api: import.meta.env.VITE_API_BASE_URL
      ? `${import.meta.env.VITE_API_BASE_URL}/report`
      : '/api/report',
  });

  const exportPdf = async () => {
    if (!reportCompletion) return;
    try {
      const blob = await pdf(<ReportDocument content={reportCompletion} orgName={org?.name || 'Council'} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Placevote_Brief_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Executive Brief downloaded successfully as PDF');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate PDF');
    }
  };

  const exportMarkdown = () => {
    if (!reportCompletion) return;
    navigator.clipboard.writeText(reportCompletion).then(() => {
      toast.success('Markdown copied to clipboard');
    });
  };

  return (
    <div className="flex h-full flex-col bg-background/50">
      {/* ── Chat Header ── */}
      <div className="shrink-0 border-b border-border/60 bg-card/50 px-4 py-3 sm:px-6 flex justify-between items-center z-10 w-full shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">Intelligence Assistant</h1>
            <p className="text-xs text-muted-foreground">
              Interact with the dataset natively or generate insight reports.
            </p>
          </div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="hidden md:flex shadow-sm" onClick={() => generateReport("", { body: { orgId: org?.id, suburbName: 'All', dateRange: 'All Time' }})}>
              <FileText className="mr-2 h-4 w-4" />
              Export Brief
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Executive Action Brief</DialogTitle>
              <DialogDescription>
                Generating insights using Grok Fast across all live {org?.name} datasets. 
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <ScrollArea className="h-[50vh] w-full rounded-md border p-4 bg-muted/30">
                {isGeneratingReport && !reportCompletion ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">Synthesising spatial patterns...</span>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-sm dark:prose-invert">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {reportCompletion || "Press Export to begin generation..."}
                    </ReactMarkdown>
                  </div>
                )}
              </ScrollArea>
            </div>
            <DialogFooter className="sm:justify-between items-center sm:space-x-2">
              <div className="text-xs text-muted-foreground hidden sm:block">A4 Optimized Layout Ready</div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={exportMarkdown} disabled={isGeneratingReport || !reportCompletion}>
                  <FileDown className="mr-2 h-4 w-4" />
                  Copy MD
                </Button>
                <Button onClick={exportPdf} disabled={isGeneratingReport || !reportCompletion}>
                  <Download className="mr-2 h-4 w-4" />
                  Save PDF
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Chat Messages Area ── */}
      <ScrollArea className="flex-1 px-4 lg:px-8 py-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6 pb-24">
          
          {/* Welcome State */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center pt-24 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold tracking-tight">
                Civic Intelligence Assistant
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
                I can help you analyse Placevote community submissions, budget layouts,
                service requests, and connected mapping ontologies. Ask a question to get started.
              </p>
              
              <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-lg">
                {[
                  'What are the main issues in the recent Development Application?',
                  'Summarise the budget timeline for next quarter.',
                  'Identify community friction points near the new Precinct.',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => handleInputChange({ target: { value: suggestion } } as any)}
                    className="rounded-full border border-border bg-card px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Render Messages */}
          {messages.map((message) => {
            const isUser = message.role === 'user';

            return (
              <div
                key={message.id}
                className={cn(
                  'flex w-full items-start gap-4',
                  isUser ? 'justify-end' : 'justify-start'
                )}
              >
                {/* Assistant Avatar */}
                {!isUser && (
                  <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg bg-primary/10 text-primary mt-1">
                    <Bot className="h-5 w-5" />
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={cn(
                    'relative flex max-w-[85%] flex-col gap-2 rounded-2xl px-5 py-3.5 text-sm sm:max-w-[75%]',
                    isUser
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-muted/60 border border-border/50 rounded-bl-sm text-foreground'
                  )}
                >
                  <div
                    className={cn(
                      'prose max-w-none break-words text-sm dark:prose-invert',
                      isUser 
                        ? 'prose-p:leading-relaxed prose-pre:bg-blue-700/50 text-white' 
                        : 'prose-p:leading-relaxed prose-pre:bg-muted'
                    )}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                  
                  {/* Render Tool Invocations Inline */}
                  {message.toolInvocations && message.toolInvocations.length > 0 && (
                    <div className="mt-3 flex flex-col gap-4 w-full">
                      {message.toolInvocations.map((rawToolCall: any) => {
                        const { toolName, toolCallId, state, args, result } = rawToolCall;
                        
                        // Handle side effects specifically
                        if (toolName === 'highlight_map_zones' && state === 'result') {
                          // Zustand state updating usually shouldn't happen directly in render without useEffect
                          // but since it's an MVP, a deferred call using Promise.resolve().then() avoids react warnings 
                          // and safely commits the side effect.
                          Promise.resolve().then(() => {
                            if (result?.suburbs) {
                              useAppStore.getState().setMapHighlights(result.suburbs);
                            } else if (args?.suburbs && state !== 'result') {
                              useAppStore.getState().setMapHighlights(args.suburbs);
                            }
                          });
                        }

                        if (state !== 'result') {
                          // Loading State Skeletons
                          return (
                            <div key={toolCallId} className="w-full space-y-2 border border-border/50 bg-background/50 rounded-lg p-4">
                              <Skeleton className="h-4 w-3/4 bg-primary/10" />
                              <Skeleton className="h-24 w-full bg-primary/5" />
                              <div className="flex w-full items-center gap-2 mt-2">
                                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                                <span className="text-xs text-muted-foreground italic">
                                  Running {toolName}...
                                </span>
                              </div>
                            </div>
                          );
                        }

                        // Loaded Results Rendering
                        
                        if (toolName === 'render_bar_chart') {
                          return (
                            <Card key={toolCallId} className="p-4 bg-background shadow-sm border-border/60 w-full overflow-hidden mt-2">
                              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
                                {args.title || 'Bar Chart'}
                              </span>
                              <div className="h-48 w-full -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={args.labels.map((l: string, i: number) => ({ name: l, value: args.values[i] }))} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Bar dataKey="value" fill={args.colour || "hsl(var(--primary))"} radius={[4, 4, 0, 0]} />
                                  </BarChart>
                                </ResponsiveContainer>
                              </div>
                            </Card>
                          );
                        }

                        if (toolName === 'render_line_chart') {
                          return (
                            <Card key={toolCallId} className="p-4 bg-background shadow-sm border-border/60 w-full overflow-hidden mt-2">
                              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
                                {args.title || 'Line Chart Trend'}
                              </span>
                              <div className="h-48 w-full -ml-4">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart 
                                    data={args.x_labels.map((l: string, i: number) => {
                                      const row: Record<string, any> = { name: l };
                                      args.series.forEach((s: any) => { row[s.name] = s.data[i]; });
                                      return row;
                                    })} 
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                                    <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                                    {args.series.map((s: any, idx: number) => (
                                      <Line key={s.name} type="monotone" dataKey={s.name} stroke={`hsl(var(--chart-${(idx % 5) + 1}))`} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                                    ))}
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            </Card>
                          );
                        }

                        if (toolName === 'render_table') {
                          return (
                            <Card key={toolCallId} className="bg-background shadow-sm border-border/60 w-full overflow-hidden mt-2">
                              <Table>
                                <TableHeader className="bg-muted/50">
                                  <TableRow>
                                    {args.columns.map((col: string, i: number) => (
                                      <TableHead key={i} className="h-8 text-xs font-medium">{col}</TableHead>
                                    ))}
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {args.rows.map((row: string[], rIdx: number) => (
                                    <TableRow key={rIdx}>
                                      {row.map((cell: string, cIdx: number) => (
                                        <TableCell key={cIdx} className="py-2 text-xs">{cell}</TableCell>
                                      ))}
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </Card>
                          );
                        }

                        if (toolName === 'render_suburb_card') {
                          return (
                            <Card key={toolCallId} className="p-4 bg-background shadow-sm border-border/60 w-full mt-2 relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-4">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-xl font-bold text-destructive">
                                  {args.friction_score}
                                </div>
                              </div>
                              <h4 className="text-lg font-bold text-card-foreground mb-1">{args.suburb_name}</h4>
                              <p className="text-xs text-muted-foreground mb-4">
                                Activity Volume: <span className="font-semibold text-foreground">{args.signal_count} Data Points</span>
                              </p>
                              <div className="space-y-2">
                                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Top Identified Friction Themes</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {args.top_issues.map((issue: string, i: number) => (
                                    <Badge variant="outline" key={i} className="text-[10px] bg-muted/50">
                                      {issue}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </Card>
                          );
                        }
                        
                        if (toolName === 'highlight_map_zones') {
                          return (
                            <div key={toolCallId} className="flex items-center gap-2 rounded-lg border border-border/50 bg-green-500/10 px-3 py-2 mt-2">
                              <Sparkles className="h-4 w-4 text-green-600 dark:text-green-500" />
                              <span className="text-xs font-medium text-green-700 dark:text-green-400">
                                Highlighted {args.suburbs.length} zones on the Map tab
                              </span>
                            </div>
                          );
                        }
                        
                        if (toolName === 'query_ontology') {
                          return (
                            <div key={toolCallId} className="flex flex-col gap-1 rounded-lg border border-border/50 bg-blue-500/10 px-3 py-2 mt-2">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                  Queried internal knowledge graph
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground ml-6">
                                Discovered {result?.nodes_found || 0} entities related to "{args.label_contains || args.node_type || 'all'}"
                              </span>
                            </div>
                          );
                        }

                        return null;
                      })}
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {isUser && (
                  <Avatar className="h-8 w-8 mt-1 shrink-0">
                    <AvatarImage src={user?.avatarUrl} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                      {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && messages[messages.length - 1]?.role === 'user' && (
            <div className="flex w-full items-start gap-4 justify-start">
              <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-lg bg-primary/10 text-primary mt-1">
                <Bot className="h-5 w-5 animate-pulse" />
              </div>
              <div className="flex items-center rounded-2xl rounded-bl-sm bg-muted/60 border border-border/50 px-5 py-4">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-primary/50 animate-bounce" />
                </span>
              </div>
            </div>
          )}

          <div ref={scrollRef} className="h-1" />
        </div>
      </ScrollArea>

      {/* ── Bottom Input Bar ── */}
      <div className="shrink-0 border-t bg-background/95 p-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto max-w-4xl">
          <form
            onSubmit={handleSubmit}
            className="relative flex items-end gap-2 rounded-2xl border border-input bg-background pb-2 pl-3 pr-2 pt-2 focus-within:ring-1 focus-within:ring-ring"
          >
            {/* Attachment Button (UI Only) */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-muted-foreground hover:bg-muted/50 mb-1 rounded-xl h-9 w-9"
              title="Attach File"
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            {/* Input Textarea */}
            <Textarea
              ref={textareaRef}
              tabIndex={0}
              onKeyDown={onKeyDown}
              placeholder="Message the assistant... (Shift+Enter for newline)"
              className="min-h-[44px] w-full resize-none border-0 bg-transparent px-2 py-3 text-sm focus-visible:ring-0 shadow-none"
              value={input}
              onChange={handleInputChange}
              rows={1}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || !input.trim()}
              size="icon"
              className="shrink-0 transition-all mb-1 h-9 w-9 rounded-xl shadow-sm"
              title="Send Message"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
          <div className="mt-2 text-center text-[10px] text-muted-foreground">
            Placevote Assistant can make mistakes. Verify important council data.
          </div>
        </div>
      </div>
    </div>
  );
}
