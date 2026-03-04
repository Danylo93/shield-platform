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
  java: "from-java to-java/60",
  python: "from-python to-python/60",
  dotnet: "from-dotnet to-dotnet/60",
};

export function TemplateCard({ template, index, onUse }: TemplateCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      whileHover={{ y: -6, scale: 1.02 }}
      className="group relative glass-hover rounded-xl overflow-hidden cursor-pointer card-shine"
      onClick={() => onUse(template)}
    >
      <div className={`h-1 w-full bg-gradient-to-r ${langBarClass[template.language] || "from-primary to-primary/60"}`} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="text-2xl h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center">
              {langIcons[template.language] || "📦"}
            </div>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {template.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${langColorClass[template.language] || ""}`}
                >
                  {langLabels[template.language] || template.language}
                </Badge>
              </div>
            </div>
          </div>
          <FolderGit2 className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
          Template {langLabels[template.language] || template.language} do repositório {template.repoName}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-border/30">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono min-w-0 flex-1">
            <span className="truncate">{template.path}</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 text-primary hover:text-primary"
          >
            Usar
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
