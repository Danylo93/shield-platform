import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Play,
  ExternalLink,
  GitBranch,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

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

export default function PipelineApprovals() {
  const queryClient = useQueryClient();
  const [rejectDialog, setRejectDialog] = useState<any | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  const { data: approvals, isLoading } = useQuery({
    queryKey: ["pipeline-approvals"],
    queryFn: async () => {
      const data = await fetchAzure("pending-approvals");
      return (data.value || []) as any[];
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const approveMutation = useMutation({
    mutationFn: (approval: any) =>
      postAzure("update-approval", {
        projectName: approval.projectName,
        approvalId: approval.id,
        status: "approved",
        comment: "Aprovado via S.H.I.E.L.D Platform",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-approvals"] });
      toast.success("Pipeline aprovado!");
    },
    onError: (err: Error) => {
      toast.error("Erro ao aprovar", { description: err.message });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ approval, comment }: { approval: any; comment: string }) =>
      postAzure("update-approval", {
        projectName: approval.projectName,
        approvalId: approval.id,
        status: "rejected",
        comment,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline-approvals"] });
      setRejectDialog(null);
      setRejectComment("");
      toast.success("Pipeline rejeitado");
    },
    onError: (err: Error) => {
      toast.error("Erro ao rejeitar", { description: err.message });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Buscando aprovações de pipeline...</span>
      </div>
    );
  }

  if (!approvals?.length) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">Nenhuma aprovação de pipeline pendente</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-warning" />
          <h3 className="text-sm font-semibold text-foreground font-display tracking-wide">
            Aprovações de Pipeline
          </h3>
          <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]">
            {approvals.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["pipeline-approvals"] })}
          className="gap-1.5 text-xs"
        >
          <RefreshCw className="h-3 w-3" />
          Atualizar
        </Button>
      </div>

      <div className="space-y-2">
        <AnimatePresence>
          {approvals.map((approval: any, i: number) => (
            <motion.div
              key={approval.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="p-4 glass-hover border-l-2 border-l-warning">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                    <Play className="h-5 w-5 text-warning" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-foreground truncate">
                        {approval.pipeline?.name || `Pipeline #${approval.pipeline?.id || "?"}`}
                      </h4>
                      <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning border-warning/20 gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        Aguardando
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="font-medium">{approval.projectName}</span>
                      {approval.pipeline?.folder && (
                        <span>• {approval.pipeline.folder}</span>
                      )}
                      {approval.resource?.type === "environment" && (
                        <span className="inline-flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded text-[10px]">
                          🌐 {approval.resource.name || approval.resource.id}
                        </span>
                      )}
                      {approval.createdOn && (
                        <span>• {new Date(approval.createdOn).toLocaleString("pt-BR")}</span>
                      )}
                    </div>
                    {approval.instructions && (
                      <p className="text-xs text-muted-foreground mt-1 italic">{approval.instructions}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="gap-1 h-8 shadow-sm"
                      onClick={() => approveMutation.mutate(approval)}
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
                      onClick={() => setRejectDialog(approval)}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Rejeitar
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar aprovação de pipeline</DialogTitle>
          </DialogHeader>
          <Textarea
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder="Motivo da rejeição..."
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => rejectDialog && rejectMutation.mutate({ approval: rejectDialog, comment: rejectComment })}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
