import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Play,
  GitBranch,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Rocket,
  ExternalLink,
  Layers,
} from "lucide-react";
import { toast } from "sonner";

const langIcons: Record<string, string> = { java: "☕", python: "🐍", dotnet: "🔷" };

async function fetchAzure(action: string, params?: Record<string, string>) {
  const qs = new URLSearchParams({ action, ...params });
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(`${supabaseUrl}/functions/v1/azure-devops?${qs}`, {
    headers: { Authorization: `Bearer ${supabaseKey}`, apikey: supabaseKey },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

async function postAzure(action: string, body: Record<string, any>) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const res = await fetch(`${supabaseUrl}/functions/v1/azure-devops?action=${action}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function RunStatusBadge({ state, result }: { state: string; result?: string }) {
  const s = state?.toLowerCase();
  const r = result?.toLowerCase();
  if (s === "completed" && r === "succeeded")
    return <Badge className="bg-[hsl(var(--success))]/15 text-[hsl(var(--success))] border-[hsl(var(--success))]/30 gap-1"><CheckCircle2 className="h-3 w-3" />Sucesso</Badge>;
  if (s === "completed" && (r === "failed" || r === "canceled"))
    return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{r === "failed" ? "Falhou" : "Cancelado"}</Badge>;
  if (s === "completed" && r === "partiallysucceeded")
    return <Badge className="bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30 gap-1"><XCircle className="h-3 w-3" />Parcial</Badge>;
  if (s === "inprogress" || s === "notstarted")
    return <Badge className="bg-[hsl(var(--warning))]/15 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/30 gap-1"><Loader2 className="h-3 w-3 animate-spin" />Em execução</Badge>;
  return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{state || "Desconhecido"}</Badge>;
}

export default function PipelinesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>("develop");

  // Fetch user's created components (only "created" ones have repos)
  const { data: components, isLoading: loadingComponents } = useQuery({
    queryKey: ["my-components-pipelines", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("components")
        .select("*")
        .eq("created_by", user!.id)
        .eq("approval_status", "created");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const comp = useMemo(() => components?.find((c) => c.id === selectedComponent), [components, selectedComponent]);

  // Fetch branches for selected component's repo
  const { data: branches, isLoading: loadingBranches } = useQuery({
    queryKey: ["branches", comp?.project_name, comp?.repo_name],
    queryFn: () => fetchAzure("branches", { project: comp!.project_name, repo: comp!.repo_name || comp!.name }),
    enabled: !!comp,
    select: (d) => d.value as { name: string; objectId: string }[],
  });

  // Fetch pipelines for selected component's project
  const { data: pipelines, isLoading: loadingPipelines } = useQuery({
    queryKey: ["pipelines", comp?.project_name],
    queryFn: () => fetchAzure("pipelines", { project: comp!.project_name }),
    enabled: !!comp,
    select: (d) => d.value as { id: number; name: string; folder: string; _links: any }[],
  });

  // Find pipeline matching this repo
  const matchedPipeline = useMemo(() => {
    if (!pipelines || !comp) return null;
    const repoName = comp.repo_name || comp.name;
    return pipelines.find((p) => p.name.toLowerCase() === repoName.toLowerCase()) || pipelines[0] || null;
  }, [pipelines, comp]);

  // Fetch runs for matched pipeline
  const { data: runs, isLoading: loadingRuns } = useQuery({
    queryKey: ["pipeline-runs", comp?.project_name, matchedPipeline?.id],
    queryFn: () => fetchAzure("pipeline-runs", { project: comp!.project_name, pipelineId: String(matchedPipeline!.id) }),
    enabled: !!comp && !!matchedPipeline,
    select: (d) => d.value as any[],
    refetchInterval: 15000,
  });

  // Run pipeline mutation
  const runMutation = useMutation({
    mutationFn: () =>
      postAzure("run-pipeline", {
        projectName: comp!.project_name,
        pipelineId: matchedPipeline!.id,
        branch: selectedBranch,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-runs"] });
      toast.success("Pipeline iniciado!", { description: `Branch: ${selectedBranch}` });
    },
    onError: (err: Error) => {
      toast.error("Erro ao executar pipeline", { description: err.message });
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pipelines</h1>
        <p className="text-sm text-muted-foreground mt-1">Execute e acompanhe os pipelines dos seus componentes</p>
      </div>

      {/* Component Selector */}
      <Card className="p-4 glass">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
          Selecione um componente
        </label>
        {loadingComponents ? (
          <div className="flex items-center gap-2 text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Carregando componentes...</span>
          </div>
        ) : !components?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <Layers className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhum componente criado ainda.</p>
            <p className="text-xs mt-1">Crie um componente na página de Templates para ver seus pipelines aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {components.map((c) => (
              <motion.button
                key={c.id}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  setSelectedComponent(c.id);
                  setSelectedBranch("develop");
                }}
                className={`flex items-center gap-3 p-3 rounded-lg text-left transition-all border ${
                  selectedComponent === c.id
                    ? "bg-primary/10 border-primary/30 shadow-sm"
                    : "bg-card hover:bg-muted/50 border-border"
                }`}
              >
                <span className="text-lg">{langIcons[c.language] || "📦"}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate text-foreground">{c.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{c.project_name}</p>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </Card>

      {/* Pipeline Controls */}
      <AnimatePresence>
        {comp && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-4"
          >
            {/* Run Pipeline Card */}
            <Card className="p-5 glass">
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
                <div className="flex-1 space-y-3 w-full">
                  <div>
                    <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                      <Rocket className="h-4 w-4 text-primary" />
                      Executar Pipeline
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {matchedPipeline ? `Pipeline: ${matchedPipeline.name}` : "Nenhum pipeline encontrado"}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-xs">
                      <label className="text-[11px] text-muted-foreground mb-1 block">Branch</label>
                      {loadingBranches ? (
                        <div className="flex items-center gap-2 text-muted-foreground text-sm h-9">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Carregando...
                        </div>
                      ) : (
                        <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                          <SelectTrigger className="h-9">
                            <GitBranch className="h-3 w-3 mr-1.5 text-muted-foreground" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(branches || []).map((b) => (
                              <SelectItem key={b.name} value={b.name}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => runMutation.mutate()}
                  disabled={runMutation.isPending || !matchedPipeline}
                  className="gap-2 shrink-0"
                >
                  {runMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Iniciando...</>
                  ) : (
                    <><Play className="h-4 w-4" />Executar</>
                  )}
                </Button>
              </div>
            </Card>

            {/* Pipeline Runs */}
            <Card className="glass overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">Execuções Recentes</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["pipeline-runs"] })}
                  className="gap-1.5 text-xs"
                >
                  <RefreshCw className="h-3 w-3" />
                  Atualizar
                </Button>
              </div>

              <ScrollArea className="max-h-[400px]">
                {loadingRuns || loadingPipelines ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Carregando execuções...</span>
                  </div>
                ) : !runs?.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Nenhuma execução encontrada</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {runs.slice(0, 20).map((run: any, i: number) => (
                      <motion.div
                        key={run.id || i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">#{run.id}</span>
                            <RunStatusBadge state={run.state} result={run.result} />
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {run.resources?.repositories?.self?.refName && (
                              <span className="flex items-center gap-1">
                                <GitBranch className="h-3 w-3" />
                                {run.resources.repositories.self.refName.replace("refs/heads/", "")}
                              </span>
                            )}
                            {run.createdDate && (
                              <span>{new Date(run.createdDate).toLocaleString("pt-BR")}</span>
                            )}
                          </div>
                        </div>
                        {run._links?.web?.href && (
                          <a
                            href={run._links.web.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
