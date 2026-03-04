import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, GitBranch, Search, Loader2, AlertCircle } from "lucide-react";
import { useAzureRepos } from "@/hooks/useAzureDevOps";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function Catalog() {
  const { data: repos, isLoading, error } = useAzureRepos();
  const [search, setSearch] = useState("");

  const filtered = (repos || []).filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.project.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground mb-1">Catálogo de Componentes</h1>
        <p className="text-muted-foreground text-sm">Repositórios reais do Azure DevOps</p>
      </motion.div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar repositório ou projeto..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando repositórios do Azure DevOps...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Erro ao carregar repositórios</p>
            <p className="text-xs mt-0.5">{(error as Error).message}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{filtered.length} repositórios encontrados</p>
          {filtered.map((repo, i) => (
            <motion.a
              key={repo.id}
              href={repo.webUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="glass rounded-xl p-4 flex items-center justify-between gap-4 hover:glow-primary transition-shadow cursor-pointer group block"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <GitBranch className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {repo.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {repo.project.name}
                    {repo.defaultBranch && ` • ${repo.defaultBranch.replace("refs/heads/", "")}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant="outline" className="text-[10px]">
                  {repo.project.name}
                </Badge>
                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.a>
          ))}
          {filtered.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum repositório encontrado</p>
          )}
        </div>
      )}
    </div>
  );
}
