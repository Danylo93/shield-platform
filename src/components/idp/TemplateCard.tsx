import { motion } from "framer-motion";
import { ArrowRight, FolderGit2 } from "lucide-react";
import { AzureTemplate } from "@/hooks/useAzureDevOps";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TemplateCardProps {
  template: AzureTemplate;
  index: number;
  onUse: (template: AzureTemplate) => void;
}

const langIcons: Record<string, string> = {
  java: "☕",
  python: "🐍",
  dotnet: "🔷",
};

const langLabels: Record<string, string> = {
  java: "Java",
  python: "Python",
  dotnet: ".NET",
};

const langColorClass: Record<string, string> = {
  java: "bg-java/15 text-java border-java/30",
  python: "bg-python/15 text-python border-python/30",
  dotnet: "bg-dotnet/15 text-dotnet border-dotnet/30",
};

const langBarClass: Record<string, string> = {
  java: "bg-java",
  python: "bg-python",
  dotnet: "bg-dotnet",
};

export function TemplateCard({ template, index, onUse }: TemplateCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="group relative glass rounded-xl overflow-hidden cursor-pointer transition-shadow duration-300 hover:glow-primary"
      onClick={() => onUse(template)}
    >
      <div className={`h-1 w-full ${langBarClass[template.language] || "bg-primary"}`} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{langIcons[template.language] || "📦"}</span>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {template.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${langColorClass[template.language] || ""}`}
                >
                  {langLabels[template.language] || template.language}
                </Badge>
              </div>
            </div>
          </div>
          <FolderGit2 className="h-4 w-4 text-muted-foreground" />
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
          Template {langLabels[template.language] || template.language} do repositório {template.repoName}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            {template.path}
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary"
          >
            Usar
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
