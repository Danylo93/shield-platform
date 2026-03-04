import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Search, Loader2, AlertCircle, Clock, CheckCircle2, XCircle, ExternalLink, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  approved: { label: "Aprovado", color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  creating: { label: "Criando...", color: "bg-primary/10 text-primary border-primary/20", icon: Loader2 },
  created: { label: "Criado", color: "bg-success/10 text-success border-success/20", icon: GitBranch },
  rejected: { label: "Rejeitado", color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  error: { label: "Erro", color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle },
};

const langColors: Record<string, string> = {
  java: "bg-[hsl(var(--java))]/10 text-[hsl(var(--java))]",
  python: "bg-[hsl(var(--python))]/10 text-[hsl(var(--python))]",
  dotnet: "bg-[hsl(var(--dotnet))]/10 text-[hsl(var(--dotnet))]",
};

export default function Catalog() {
  const { user, isDevOps, profile } = useAuth();
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: components, isLoading, error } = useQuery({
    queryKey: ["my-components", user?.id, isDevOps, profile?.squad],
    queryFn: async () => {
      let query = supabase.from("components").select("*").order("created_at", { ascending: false });
      if (!isDevOps && user) {
        if (profile?.squad) {
          query = query.or(`created_by.eq.${user.id},squad.eq.${profile.squad}`);
        } else {
          query = query.eq("created_by", user.id);
        }
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Realtime subscription for live updates
  useEffect(() => {
    const channel = supabase
      .channel('catalog-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'components' }, () => {
        queryClient.invalidateQueries({ queryKey: ["my-components"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const filtered = (components || []).filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.project_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground mb-1">
          {isDevOps ? "Todos os Componentes" : "Meus Componentes"}
        </h1>
        <p className="text-muted-foreground text-sm">
          {isDevOps
            ? "Visualize todos os componentes da plataforma"
            : `Componentes criados por você${profile?.squad ? ` e pela ${profile.squad}` : ""}`}
        </p>
      </motion.div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar componente..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando componentes...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Erro ao carregar componentes</p>
            <p className="text-xs mt-0.5">{(error as Error).message}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{filtered.length} componentes</p>
          {filtered.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum componente encontrado</p>
              <p className="text-xs mt-1">Solicite a criação de um componente na página de Templates</p>
            </div>
          )}
          {filtered.map((comp: any, i: number) => {
            const status = statusConfig[comp.approval_status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const isCreating = comp.approval_status === "creating";
            return (
              <motion.div
                key={comp.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass rounded-xl p-4 space-y-2"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <GitBranch className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-semibold text-sm text-foreground truncate">{comp.name}</h3>
                      <Badge variant="outline" className={`text-[10px] ${langColors[comp.language] || ""}`}>
                        {comp.language}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {comp.project_name}
                      {comp.squad && ` • ${comp.squad}`}
                      {comp.repo_name && ` • ${comp.repo_name}`}
                    </p>
                  </div>
                  <Badge variant="outline" className={`gap-1 shrink-0 ${status.color}`}>
                    {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : <StatusIcon className="h-3 w-3" />}
                    {status.label}
                  </Badge>
                </div>

                {/* Show repo link when created */}
                {comp.repo_url && comp.approval_status === "created" && (
                  <div className="flex items-center gap-2 ml-14 p-2 rounded-lg bg-success/5 border border-success/20">
                    <GitBranch className="h-3.5 w-3.5 text-success shrink-0" />
                    <a href={comp.repo_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-success hover:underline truncate flex items-center gap-1">
                      Acessar Repositório
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}

                {/* Show error */}
                {comp.approval_status === "error" && comp.rejection_reason && (
                  <div className="flex items-center gap-2 ml-14 p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <p className="text-xs text-destructive truncate">{comp.rejection_reason}</p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
