import { CheckCircle2, Loader2, GitFork, GitBranch, Play, Settings, Workflow, Server, Plus, Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const steps = [
  { key: "creating_repo", label: "Criando repositório", icon: GitFork },
  { key: "pushing_code", label: "Enviando código base", icon: Settings },
  { key: "creating_branches", label: "Criando branches", icon: GitBranch },
  { key: "setting_default_branch", label: "Definindo branch padrão", icon: GitBranch },
  { key: "creating_environments", label: "Configurando environments", icon: Server },
  { key: "creating_pipeline", label: "Criando pipeline", icon: Workflow },
  { key: "running_pipeline", label: "Executando pipeline em develop", icon: Play },
  { key: "done", label: "Concluído", icon: CheckCircle2 },
];

interface EnvDetail {
  name: string;
  status: "criado" | "existente";
}

function parseEnvDetails(currentStep: string | null): EnvDetail[] {
  if (!currentStep) return [];
  // Format: "creating_environments:dev=criado,stg=existente,rc=criado,prd=existente"
  const match = currentStep.match(/^creating_environments:(.+)$/);
  if (!match) return [];
  return match[1].split(",").map((item) => {
    const [name, status] = item.split("=");
    return { name, status: status as "criado" | "existente" };
  });
}

function getBaseStep(currentStep: string | null): string | null {
  if (!currentStep) return null;
  return currentStep.split(":")[0];
}

interface CreationStepperProps {
  currentStep: string | null;
  isComplete: boolean;
}

export default function CreationStepper({ currentStep, isComplete }: CreationStepperProps) {
  const baseStep = getBaseStep(currentStep);
  const currentIndex = steps.findIndex((s) => s.key === baseStep);
  const envDetails = parseEnvDetails(currentStep);

  // If step moved past environments, try to get env details from a previous snapshot
  // For completed components, we won't have the detail anymore, so show generic

  return (
    <div className="ml-14 p-4 rounded-xl bg-muted/30 border border-border/50 space-y-1">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isDone = isComplete || (currentIndex > i);
        const isActive = !isComplete && currentIndex === i;
        const isPending = !isComplete && currentIndex < i;
        const isEnvStep = step.key === "creating_environments";

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

            {/* Environment details */}
            {isEnvStep && envDetails.length > 0 && (isDone || isActive) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="ml-10 mt-1 mb-1.5 space-y-0.5"
              >
                {envDetails.map((env) => (
                  <div
                    key={env.name}
                    className={cn(
                      "flex items-center gap-2 text-[11px] px-2 py-1 rounded-md",
                      env.status === "criado"
                        ? "text-primary bg-primary/5"
                        : "text-muted-foreground bg-muted/30"
                    )}
                  >
                    {env.status === "criado" ? (
                      <Plus className="h-3 w-3" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    <span className="font-mono uppercase font-medium">{env.name}</span>
                    <span className="text-[10px] opacity-70">
                      {env.status === "criado" ? "— criado" : "— já existente"}
                    </span>
                  </div>
                ))}
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}
