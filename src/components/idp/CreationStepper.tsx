import { CheckCircle2, Loader2, GitFork, GitBranch, Play, Settings, Workflow } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const steps = [
  { key: "creating_repo", label: "Criando repositório", icon: GitFork },
  { key: "pushing_code", label: "Enviando código base", icon: Settings },
  { key: "creating_branches", label: "Criando branches", icon: GitBranch },
  { key: "setting_default_branch", label: "Definindo branch padrão", icon: GitBranch },
  { key: "creating_pipeline", label: "Criando pipeline", icon: Workflow },
  { key: "running_pipeline", label: "Executando pipeline em develop", icon: Play },
  { key: "done", label: "Concluído", icon: CheckCircle2 },
];

interface CreationStepperProps {
  currentStep: string | null;
  isComplete: boolean;
}

export default function CreationStepper({ currentStep, isComplete }: CreationStepperProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="ml-14 p-4 rounded-xl bg-muted/30 border border-border/50 space-y-1">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isDone = isComplete || (currentIndex > i);
        const isActive = !isComplete && currentIndex === i;
        const isPending = !isComplete && currentIndex < i;

        return (
          <motion.div
            key={step.key}
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
        );
      })}
    </div>
  );
}
