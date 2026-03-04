import { useState } from "react";
import { motion } from "framer-motion";
import { Layers, GitFork, Users, Activity, Plus, ArrowRight, Loader2 } from "lucide-react";
import { templates } from "@/data/templates";
import { TemplateCard } from "@/components/idp/TemplateCard";
import { CreateComponentDialog } from "@/components/idp/CreateComponentDialog";
import { StatsCard } from "@/components/idp/StatsCard";
import { Button } from "@/components/ui/button";
import { Template } from "@/data/templates";
import { useNavigate } from "react-router-dom";
import { useAzureRepos, useAzureProjects } from "@/hooks/useAzureDevOps";

export default function Dashboard() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  const { data: repos } = useAzureRepos();
  const { data: projects } = useAzureProjects();

  const handleUseTemplate = (template: Template) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  const featuredTemplates = templates.slice(0, 4);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-2xl gradient-mesh p-8 lg:p-10"
      >
        <div className="relative z-10">
          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-2">
            Bem-vindo ao <span className="text-primary">DevPortal</span>
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Crie componentes a partir de templates prontos, gerencie seus serviços e acelere
            o desenvolvimento com nossa plataforma interna.
          </p>
          <div className="flex gap-3 mt-6">
            <Button className="gap-2" onClick={() => navigate("/templates")}>
              <Plus className="h-4 w-4" />
              Novo Componente
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate("/catalog")}>
              <Layers className="h-4 w-4" />
              Ver Catálogo
            </Button>
          </div>
        </div>
        <motion.div
          className="absolute right-8 top-8 opacity-10"
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        >
          <GitFork className="h-32 w-32 text-primary" />
        </motion.div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Repositórios" value={repos?.length ?? "..."} subtitle="Azure DevOps" icon={Layers} color="primary" index={0} />
        <StatsCard title="Templates" value={templates.length} subtitle="3 linguagens" icon={GitFork} color="accent" index={1} />
        <StatsCard title="Projetos" value={projects?.length ?? "..."} subtitle="Azure DevOps" icon={Users} color="success" index={2} />
        <StatsCard title="Deploys" value={156} subtitle="últimos 30 dias" icon={Activity} color="warning" index={3} />
      </div>

      {/* Featured Templates */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Templates em Destaque</h2>
          <Button variant="ghost" size="sm" className="gap-1 text-primary" onClick={() => navigate("/templates")}>
            Ver todos
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredTemplates.map((template, i) => (
            <TemplateCard key={template.id} template={template} index={i} onUse={handleUseTemplate} />
          ))}
        </div>
      </div>

      <CreateComponentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={selectedTemplate}
      />
    </div>
  );
}
