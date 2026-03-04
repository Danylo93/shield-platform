import { motion } from "framer-motion";
import { Star, ArrowRight, Users } from "lucide-react";
import { Template, languageLabels } from "@/data/templates";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TemplateCardProps {
  template: Template;
  index: number;
  onUse: (template: Template) => void;
}

const langColorClass: Record<string, string> = {
  java: "bg-java/15 text-java border-java/30",
  python: "bg-python/15 text-python border-python/30",
  dotnet: "bg-dotnet/15 text-dotnet border-dotnet/30",
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
      {/* Top accent bar */}
      <div
        className={`h-1 w-full ${
          template.language === "java"
            ? "bg-java"
            : template.language === "python"
            ? "bg-python"
            : "bg-dotnet"
        }`}
      />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{template.icon}</span>
            <div>
              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                {template.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 ${langColorClass[template.language]}`}
                >
                  {languageLabels[template.language]}
                  {template.dotnetVersion && ` ${template.dotnetVersion}`}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-warning text-xs">
            <Star className="h-3.5 w-3.5 fill-current" />
            <span>{template.stars}</span>
          </div>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
          {template.description}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {template.tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-[10px] px-2 py-0"
            >
              {tag}
            </Badge>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{template.usageCount} usos</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-primary hover:text-primary"
          >
            Usar Template
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
