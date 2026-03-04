import { useState } from "react";
import { motion } from "framer-motion";
import { TemplateCard } from "@/components/idp/TemplateCard";
import { CreateComponentDialog } from "@/components/idp/CreateComponentDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAzureTemplates, AzureTemplate } from "@/hooks/useAzureDevOps";

type LangFilter = "all" | "java" | "python" | "dotnet";

export default function TemplatesPage() {
  const [selectedLang, setSelectedLang] = useState<LangFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<AzureTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: templates, isLoading, error } = useAzureTemplates();

  const filtered = (templates || []).filter((t) => {
    if (selectedLang !== "all" && t.language !== selectedLang) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleUse = (template: AzureTemplate) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  const langs: { key: LangFilter; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "java", label: "Java" },
    { key: "python", label: "Python" },
    { key: "dotnet", label: ".NET" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground mb-1">Templates</h1>
        <p className="text-muted-foreground text-sm">
          Templates do repositório <span className="font-mono text-foreground">argo-code/base-argoit</span>
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4 items-start sm:items-center"
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar templates..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {langs.map((l) => (
            <Button
              key={l.key}
              variant={selectedLang === l.key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedLang(l.key)}
              className="text-xs"
            >
              {l.label}
            </Button>
          ))}
        </div>
      </motion.div>

      {isLoading && (
        <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Carregando templates do Azure DevOps...</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold text-sm">Erro ao carregar templates</p>
            <p className="text-xs mt-0.5">{(error as Error).message}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((template, i) => (
              <TemplateCard key={template.id} template={template} index={i} onUse={handleUse} />
            ))}
          </div>

          {filtered.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 text-muted-foreground"
            >
              <p className="text-lg">Nenhum template encontrado</p>
              <p className="text-sm mt-1">Tente ajustar os filtros</p>
            </motion.div>
          )}
        </>
      )}

      <CreateComponentDialog open={dialogOpen} onOpenChange={setDialogOpen} template={selectedTemplate} />
    </div>
  );
}
