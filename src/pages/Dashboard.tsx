import { useState } from "react";
import { motion } from "framer-motion";
import { Layers, GitFork, Users, Activity, Plus, ArrowRight, Zap } from "lucide-react";
import { TemplateCard } from "@/components/idp/TemplateCard";
import { CreateComponentDialog } from "@/components/idp/CreateComponentDialog";
import { StatsCard } from "@/components/idp/StatsCard";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAzureRepos, useAzureProjects, useAzureTemplates, AzureTemplate } from "@/hooks/useAzureDevOps";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const [selectedTemplate, setSelectedTemplate] = useState<AzureTemplate | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  const { data: repos } = useAzureRepos();
  const { data: projects } = useAzureProjects();
  const { data: templates, isLoading: loadingTemplates } = useAzureTemplates();

  const handleUseTemplate = (template: AzureTemplate) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  const featuredTemplates = (templates || []).slice(0, 4);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl gradient-hero border border-border/30 p-8 lg:p-10"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDIwMjAiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <span className="text-xs font-medium text-primary uppercase tracking-wider">Developer Platform</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3 tracking-tight">
            Bem-vindo ao <span className="text-gradient">DevPortal</span>
          </h1>
          <p className="text-muted-foreground max-w-xl leading-relaxed">
            Crie componentes a partir de templates prontos, gerencie seus serviços e acelere
            o desenvolvimento com nossa plataforma interna.
          </p>
          <div className="flex gap-3 mt-8">
            <Button className="gap-2 h-11 px-6 shadow-lg shadow-primary/20" onClick={() => navigate("/templates")}>
              <Plus className="h-4 w-4" />
              Novo Componente
            </Button>
            <Button variant="outline" className="gap-2 h-11 px-6" onClick={() => navigate("/catalog")}>
              <Layers className="h-4 w-4" />
              Ver Catálogo
            </Button>
          </div>
        </div>
        <motion.div
          className="absolute right-8 top-8 opacity-[0.06]"
          animate={{ y: [0, -8, 0], rotate: [0, 5, 0] }}
          transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
        >
          <GitFork className="h-40 w-40 text-primary" />
        </motion.div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Repositórios" value={repos?.length ?? "..."} subtitle="Azure DevOps" icon={Layers} color="primary" index={0} />
        <StatsCard title="Templates" value={templates?.length ?? "..."} subtitle="argo-code" icon={GitFork} color="accent" index={1} />
        <StatsCard title="Projetos" value={projects?.length ?? "..."} subtitle="Azure DevOps" icon={Users} color="success" index={2} />
        <StatsCard title="Deploys" value={156} subtitle="últimos 30 dias" icon={Activity} color="warning" index={3} />
      </div>

      {/* Templates */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Templates em Destaque</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Comece rapidamente com templates prontos para produção</p>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary" onClick={() => navigate("/templates")}>
            Ver todos
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        {loadingTemplates ? (
          <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Carregando templates...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredTemplates.map((template, i) => (
              <TemplateCard key={template.id} template={template} index={i} onUse={handleUseTemplate} />
            ))}
          </div>
        )}
      </div>

      <CreateComponentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={selectedTemplate}
      />
    </div>
  );
}
