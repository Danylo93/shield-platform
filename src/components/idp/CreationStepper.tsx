import { CheckCircle2, Loader2, GitFork, GitBranch, Play, Settings, Workflow, Server, Plus, Check, ExternalLink, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const steps = [
  { key: "creating_repo", label: "Repositório", icon: GitFork },
  { key: "pushing_code", label: "Enviando código base", icon: Settings },
  { key: "creating_branches", label: "Branches", icon: GitBranch },
  { key: "setting_default_branch", label: "Branch padrão → develop", icon: GitBranch },
  { key: "creating_environments", label: "Environments", icon: Server },
  { key: "creating_pipeline", label: "Pipeline", icon: Workflow },
  { key: "running_pipeline", label: "Execução inicial", icon: Play },
  { key: "done", label: "Concluído", icon: CheckCircle2 },
];

interface CreationStepperProps {
  currentStep: string | null;
  isComplete: boolean;
  details?: Record<string, any> | null;
}

function DetailItem({ name, status, icon }: { name: string; status: string; icon: "created" | "existing" }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-[11px] px-2 py-0.5 rounded-md",
        icon === "created" ? "text-primary bg-primary/5" : "text-muted-foreground bg-muted/30"
      )}
    >
      {icon === "created" ? <Plus className="h-3 w-3 shrink-0" /> : <Check className="h-3 w-3 shrink-0" />}
      <span className="font-mono uppercase font-medium">{name}</span>
      <span className="text-[10px] opacity-70 ml-auto">
        {icon === "created" ? "criado" : "já existente"}
      </span>
    </div>
  );
}

export default function CreationStepper({ currentStep, isComplete, details }: CreationStepperProps) {
  const baseStep = currentStep?.split(":")[0] || currentStep;
  const currentIndex = steps.findIndex((s) => s.key === baseStep);

  return (
    <div className="ml-14 p-4 rounded-xl bg-muted/30 border border-border/50 space-y-1">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isDone = isComplete || (currentIndex > i);
        const isActive = !isComplete && currentIndex === i;
        const isPending = !isComplete && currentIndex < i;

        // Build detail items for this step
        let stepDetails: React.ReactNode = null;

        if (details && (isDone || isActive)) {
          if (step.key === "creating_repo" && details.repo) {
            stepDetails = (
              <div className="ml-10 mt-1 mb-1.5">
                <DetailItem
                  name={details.repo.name}
                  status={details.repo.status}
                  icon={details.repo.status === "criado" ? "created" : "existing"}
                />
              </div>
            );
          }

          if (step.key === "creating_branches" && details.branches) {
            stepDetails = (
              <div className="ml-10 mt-1 mb-1.5 space-y-0.5">
                {Object.entries(details.branches).map(([name, status]) => (
                  <DetailItem
                    key={name}
                    name={name}
                    status={status as string}
                    icon={(status as string) === "criada" ? "created" : "existing"}
                  />
                ))}
              </div>
            );
          }

          if (step.key === "creating_environments" && details.environments) {
            stepDetails = (
              <div className="ml-10 mt-1 mb-1.5 space-y-0.5">
                {Object.entries(details.environments).map(([name, status]) => (
                  <DetailItem
                    key={name}
                    name={name}
                    status={status as string}
                    icon={(status as string) === "criado" ? "created" : "existing"}
                  />
                ))}
              </div>
            );
          }

          if (step.key === "creating_pipeline" && details.pipeline) {
            stepDetails = (
              <div className="ml-10 mt-1 mb-1.5">
                <DetailItem
                  name={`Pipeline #${details.pipeline.id || "?"}`}
                  status={details.pipeline.status}
                  icon={details.pipeline.status === "criado" ? "created" : "existing"}
                />
                {details.pipeline.error && (
                  <div className="flex items-center gap-2 text-[11px] px-2 py-0.5 rounded-md text-destructive bg-destructive/5 mt-0.5">
                    <XCircle className="h-3 w-3 shrink-0" />
                    <span className="truncate">{details.pipeline.error}</span>
                  </div>
                )}
              </div>
            );
          }

          if (step.key === "running_pipeline" && details.pipelineRun) {
            const run = details.pipelineRun;
            stepDetails = (
              <div className="ml-10 mt-1 mb-1.5">
                <div className="flex items-center gap-2 text-[11px] px-2 py-0.5 rounded-md bg-primary/5 text-primary">
                  <Play className="h-3 w-3 shrink-0" />
                  <span className="font-mono font-medium">Run #{run.id}</span>
                  <span className="text-[10px] opacity-70">{run.state || "triggered"}</span>
                  {run.url && (
                    <a
                      href={run.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          }
        }

        return (
          <div key={step.key}>
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "flex items-center gap-3 py-1.5 px-2 rounded-lg text-xs transition-colors",
                isDone && "text-success",
                isActive && "text-primary bg-primary/5",
                isPending && "text-muted-foreground/50"
              )}
            >
              <div className="w-5 h-5 flex items-center justify-center shrink-0">
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span className={cn("font-medium", isActive && "text-foreground")}>
                {step.label}
              </span>
              {isDone && (
                <span className="text-[10px] text-success/60 ml-auto">✓</span>
              )}
            </motion.div>
            {stepDetails}
          </div>
        );
      })}
    </div>
  );
}
