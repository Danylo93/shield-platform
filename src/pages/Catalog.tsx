import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Search, Loader2, AlertCircle, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pendente", color: "bg-warning/10 text-warning border-warning/20", icon: Clock },
  approved: { label: "Aprovado", color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  rejected: { label: "Rejeitado", color: "bg-destructive/10 text-destructive border-destructive/20", icon: XCircle },
  created: { label: "Criado", color: "bg-primary/10 text-primary border-primary/20", icon: GitBranch },
};

const langColors: Record<string, string> = {
  java: "bg-[hsl(var(--java))]/10 text-[hsl(var(--java))]",
  python: "bg-[hsl(var(--python))]/10 text-[hsl(var(--python))]",
  dotnet: "bg-[hsl(var(--dotnet))]/10 text-[hsl(var(--dotnet))]",
};

export default function Catalog() {
  const { user, isDevOps, profile } = useAuth();
  const [search, setSearch] = useState("");

  // Devs: see only their own components + squad components
  // DevOps: see all components
  const { data: components, isLoading, error } = useQuery({
    queryKey: ["my-components", user?.id, isDevOps, profile?.squad],
    queryFn: async () => {
      let query = supabase.from("components").select("*").order("created_at", { ascending: false });

      if (!isDevOps && user) {
        // Dev sees their own + squad's components
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
        <Input
          placeholder="Buscar componente..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
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
            return (
              <motion.div
                key={comp.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="glass rounded-xl p-4 flex items-center gap-4"
              >
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
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </Badge>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
