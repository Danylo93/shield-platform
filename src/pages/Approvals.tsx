import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Clock, Loader2, GitFork, ExternalLink, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  approved: { label: "Aprovado", color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  creating: { label: "Criando...", color: "bg-primary/10 text-primary border-primary/20", icon: Loader2 },
  created: { label: "Criado", color: "bg-success/10 text-success border-success/20", icon: GitFork },
  rejected: { label: "Rejeitado", color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  error: { label: "Erro", color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle },
};

export default function Approvals() {
  const { isDevOps } = useAuth();
  const queryClient = useQueryClient();
  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: components, isLoading } = useQuery({
    queryKey: ["components-approvals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("components")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch creator names
      const creatorIds = [...new Set((data || []).map((c: any) => c.created_by))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", creatorIds);
      
      const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name]));
      return (data || []).map((c: any) => ({ ...c, creator_name: profileMap[c.created_by] || "" }));
      return data;
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('components-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'components' }, () => {
        queryClient.invalidateQueries({ queryKey: ["components-approvals"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const approveMutation = useMutation({
    mutationFn: async (comp: any) => {
      // First approve
      const { error } = await supabase
        .from("components")
        .update({ approval_status: "approved", approved_at: new Date().toISOString() })
        .eq("id", comp.id);
      if (error) throw error;

      // Then trigger repo creation via edge function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/azure-devops?action=create-repo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          componentId: comp.id,
          projectName: comp.project_name,
          repoName: comp.repo_name || comp.name,
          language: comp.language,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["components-approvals"] });
      toast({ title: "Repositório criado com sucesso!", description: data.repoUrl ? `URL: ${data.repoUrl}` : undefined });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["components-approvals"] });
      toast({ title: "Erro ao criar repositório", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("components")
        .update({ approval_status: "rejected", rejection_reason: reason })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["components-approvals"] });
      setRejectDialog(null);
      setRejectReason("");
      toast({ title: "Componente rejeitado" });
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (comp: any) => {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/azure-devops?action=create-repo`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          componentId: comp.id,
          projectName: comp.project_name,
          repoName: comp.repo_name || comp.name,
          language: comp.language,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["components-approvals"] });
      toast({ title: "Repositório criado com sucesso!" });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ["components-approvals"] });
      toast({ title: "Erro ao retentar", description: error.message, variant: "destructive" });
    },
  });

  const langColors: Record<string, string> = {
    java: "bg-[hsl(var(--java))]/10 text-[hsl(var(--java))]",
    python: "bg-[hsl(var(--python))]/10 text-[hsl(var(--python))]",
    dotnet: "bg-[hsl(var(--dotnet))]/10 text-[hsl(var(--dotnet))]",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Carregando solicitações...</span>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Aprovações</h1>
        <p className="text-sm text-muted-foreground">
          {isDevOps
            ? "Gerencie as solicitações de criação de componentes."
            : "Acompanhe o status das suas solicitações."}
        </p>
      </div>

      {(!components || components.length === 0) ? (
        <div className="text-center py-20 text-muted-foreground">
          <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma solicitação encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {components.map((comp: any, i: number) => {
            const status = statusConfig[comp.approval_status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const isCreating = comp.approval_status === "creating";
            const hasError = comp.approval_status === "error";
            return (
              <motion.div
                key={comp.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-5 space-y-3"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <GitFork className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-foreground truncate">{comp.name}</h3>
                      <Badge variant="outline" className={`text-[10px] ${langColors[comp.language] || ""}`}>
                        {comp.language}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {comp.project_name} • {new Date(comp.created_at).toLocaleDateString("pt-BR")}
                      {comp.squad && ` • ${comp.squad}`}
                      {comp.creator_name && ` • Dev: ${comp.creator_name}`}
                    </p>
                    {comp.rifc && (
                      <p className="text-xs text-primary font-mono">
                        RIFC: {comp.rifc}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className={`gap-1 ${status.color}`}>
                    {isCreating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <StatusIcon className="h-3 w-3" />
                    )}
                    {status.label}
                  </Badge>
                  {isDevOps && comp.approval_status === "pending" && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="gap-1 h-8"
                        onClick={() => approveMutation.mutate(comp)}
                        disabled={approveMutation.isPending}
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        )}
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 h-8"
                        onClick={() => setRejectDialog(comp.id)}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                  {isDevOps && hasError && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 h-8"
                      onClick={() => retryMutation.mutate(comp)}
                      disabled={retryMutation.isPending}
                    >
                      {retryMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                      Retentar
                    </Button>
                  )}
                </div>

                {/* Repo URL when created */}
                {comp.repo_url && comp.approval_status === "created" && (
                  <div className="flex items-center gap-2 ml-14 p-2 rounded-lg bg-success/5 border border-success/20">
                    <GitFork className="h-3.5 w-3.5 text-success shrink-0" />
                    <a href={comp.repo_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-success hover:underline truncate flex items-center gap-1">
                      {comp.repo_url}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}

                {/* Error message */}
                {hasError && comp.rejection_reason && (
                  <div className="flex items-center gap-2 ml-14 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <p className="text-xs text-destructive truncate">{comp.rejection_reason}</p>
                  </div>
                )}

                {/* Rejection reason */}
                {comp.approval_status === "rejected" && comp.rejection_reason && (
                  <div className="flex items-center gap-2 ml-14 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                    <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <p className="text-xs text-destructive">{comp.rejection_reason}</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da rejeição</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Descreva o motivo..."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => rejectDialog && rejectMutation.mutate({ id: rejectDialog, reason: rejectReason })}
              disabled={rejectMutation.isPending}
            >
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
