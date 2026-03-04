import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAzureProjects, AzureProject, AzureTemplate } from "@/hooks/useAzureDevOps";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rocket, GitBranch, Box, CheckCircle2, FolderOpen, Search, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const langLabels: Record<string, string> = {
  java: "Java",
  python: "Python",
  dotnet: ".NET",
};

interface CreateComponentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: AzureTemplate | null;
}

type Step = "project" | "info" | "config" | "review";

export function CreateComponentDialog({ open, onOpenChange, template }: CreateComponentDialogProps) {
  const [step, setStep] = useState<Step>("project");
  const [selectedProject, setSelectedProject] = useState<AzureProject | null>(null);
  const [projectSearch, setProjectSearch] = useState("");
  const [componentName, setComponentName] = useState("");
  const [repoName, setRepoName] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [creating, setCreating] = useState(false);
  const { user } = useAuth();

  const { data: projects, isLoading: loadingProjects } = useAzureProjects();

  if (!template) return null;

  const handleCreate = async () => {
    if (!user || !selectedProject) return;
    setCreating(true);
    try {
      const { error } = await supabase.from("components").insert({
        name: componentName,
        description,
        language: template.language,
        template_id: template.id,
        project_name: selectedProject.name,
        repo_name: repoName,
        created_by: user.id,
        approval_status: "pending",
      });
      if (error) throw error;
      toast.success(`Solicitação enviada para aprovação!`, {
        description: `O componente "${componentName}" será criado após aprovação do DevOps.`,
        icon: <Clock className="h-4 w-4" />,
      });
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast.error("Erro ao solicitar criação", { description: err.message });
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setStep("project");
    setSelectedProject(null);
    setProjectSearch("");
    setComponentName("");
    setRepoName("");
    setDescription("");
    setOwner("");
  };

  const filteredProjects = (projects || []).filter((p) =>
    p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
    (p.description || "").toLowerCase().includes(projectSearch.toLowerCase())
  );

  const canProceedInfo = componentName.trim() && repoName.trim();
  const canProceedConfig = owner.trim();

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: "project", label: "Projeto", icon: <FolderOpen className="h-4 w-4" /> },
    { key: "info", label: "Informações", icon: <Box className="h-4 w-4" /> },
    { key: "config", label: "Configuração", icon: <GitBranch className="h-4 w-4" /> },
    { key: "review", label: "Revisão", icon: <CheckCircle2 className="h-4 w-4" /> },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  const getProjectColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${hash % 360}, 60%, 50%)`;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetForm(); }}>
      <DialogContent className="sm:max-w-lg w-[95vw] max-w-[95vw] overflow-hidden glass [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Rocket className="h-5 w-5 text-primary" />
            Solicitar Componente
          </DialogTitle>
          <DialogDescription>
            Template: <span className="font-medium text-foreground">{template.name}</span>
            <Badge variant="outline" className="ml-2 text-[10px]">
              {langLabels[template.language] || template.language}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2 mb-4 w-full">
          {steps.map((s, i) => (
            <div key={s.key} className="min-w-0 space-y-1.5">
              <div className={`h-1 rounded-full transition-colors ${i <= currentStepIndex ? "bg-primary" : "bg-border"}`} />
              <div className={`flex items-center justify-center gap-1 text-xs font-medium px-2 py-1 rounded-full transition-colors ${
                i <= currentStepIndex ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}>
                {s.icon}
                <span className="sr-only">{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === "project" && (
            <motion.div key="project" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-3 w-full min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar projeto no Azure DevOps..." className="pl-9" value={projectSearch} onChange={(e) => setProjectSearch(e.target.value)} />
              </div>
              <ScrollArea className="h-[280px] pr-2">
                {loadingProjects ? (
                  <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Carregando projetos...</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {filteredProjects.map((project) => {
                      const color = getProjectColor(project.name);
                      return (
                        <motion.div key={project.id} whileHover={{ x: 4 }} onClick={() => setSelectedProject(project)}
                          className={`flex w-full overflow-hidden items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedProject?.id === project.id ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50 border border-transparent"
                          }`}>
                          <div className="h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                            style={{ backgroundColor: color + "22", color }}>
                            {project.abbreviation || project.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{project.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{project.description || "Sem descrição"}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                    {filteredProjects.length === 0 && !loadingProjects && (
                      <p className="text-sm text-muted-foreground text-center py-8">Nenhum projeto encontrado</p>
                    )}
                  </div>
                )}
              </ScrollArea>
              <div className="flex justify-end pt-2">
                <Button onClick={() => setStep("info")} disabled={!selectedProject}>Próximo</Button>
              </div>
            </motion.div>
          )}

          {step === "info" && (
            <motion.div key="info" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 w-full min-w-0">
              <div>
                <Label htmlFor="name">Nome do Componente</Label>
                <Input id="name" placeholder="meu-servico-api" value={componentName}
                  onChange={(e) => { setComponentName(e.target.value); if (!repoName) setRepoName(e.target.value); }} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="repo">Nome do Repositório (Azure DevOps)</Label>
                <Input id="repo" placeholder="meu-servico-api" value={repoName} onChange={(e) => setRepoName(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="desc">Descrição</Label>
                <Textarea id="desc" placeholder="Descreva o propósito deste componente..." value={description}
                  onChange={(e) => setDescription(e.target.value)} className="mt-1.5 resize-none" rows={3} />
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep("project")}>Voltar</Button>
                <Button onClick={() => setStep("config")} disabled={!canProceedInfo}>Próximo</Button>
              </div>
            </motion.div>
          )}

          {step === "config" && (
            <motion.div key="config" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 w-full min-w-0">
              <div>
                <Label htmlFor="owner">Owner / Squad</Label>
                <Input id="owner" placeholder="squad-platform" value={owner} onChange={(e) => setOwner(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label>Lifecycle</Label>
                <Select defaultValue="experimental">
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="experimental">Experimental</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="production">Production</SelectItem>
                    <SelectItem value="deprecated">Deprecated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep("info")}>Voltar</Button>
                <Button onClick={() => setStep("review")} disabled={!canProceedConfig}>Próximo</Button>
              </div>
            </motion.div>
          )}

          {step === "review" && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4 w-full min-w-0">
              <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Projeto</span><span className="font-medium">{selectedProject?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Componente</span><span className="font-medium">{componentName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Repositório</span><span className="font-mono text-xs">{repoName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Template</span><span>{template.name} ({langLabels[template.language] || template.language})</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Owner</span><span>{owner}</span></div>
                {description && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground">Descrição:</span>
                    <p className="mt-1">{description}</p>
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-warning/5 border border-warning/20 p-3 flex items-start gap-2">
                <Clock className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Após enviar, a solicitação ficará <strong className="text-foreground">pendente de aprovação</strong> pelo time DevOps.
                  O repositório será criado automaticamente após aprovação.
                </p>
              </div>

              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep("config")}>Voltar</Button>
                <Button onClick={handleCreate} disabled={creating} className="gap-2">
                  {creating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
                  ) : (
                    <><Rocket className="h-4 w-4" />Solicitar Criação</>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
