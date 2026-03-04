import { useState } from "react";
import { motion } from "framer-motion";
import { templates, Language, DotnetVersion, dotnetVersions, languageLabels, Template } from "@/data/templates";
import { TemplateCard } from "@/components/idp/TemplateCard";
import { CreateComponentDialog } from "@/components/idp/CreateComponentDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function TemplatesPage() {
  const [selectedLang, setSelectedLang] = useState<Language | "all">("all");
  const [selectedDotnet, setSelectedDotnet] = useState<DotnetVersion | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = templates.filter((t) => {
    if (selectedLang !== "all" && t.language !== selectedLang) return false;
    if (selectedLang === "dotnet" && selectedDotnet !== "all" && t.dotnetVersion !== selectedDotnet) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const handleUse = (template: Template) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  const langs: { key: Language | "all"; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "java", label: "Java" },
    { key: "python", label: "Python" },
    { key: "dotnet", label: ".NET" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground mb-1">Templates</h1>
        <p className="text-muted-foreground text-sm">Escolha um template para criar seu componente</p>
      </motion.div>

      {/* Filters */}
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
              onClick={() => { setSelectedLang(l.key); setSelectedDotnet("all"); }}
              className="text-xs"
            >
              {l.label}
            </Button>
          ))}
        </div>
        {selectedLang === "dotnet" && (
          <div className="flex gap-1.5">
            <Badge
              variant={selectedDotnet === "all" ? "default" : "outline"}
              className="cursor-pointer text-[10px]"
              onClick={() => setSelectedDotnet("all")}
            >
              Todas versões
            </Badge>
            {dotnetVersions.map((v) => (
              <Badge
                key={v}
                variant={selectedDotnet === v ? "default" : "outline"}
                className="cursor-pointer text-[10px]"
                onClick={() => setSelectedDotnet(v)}
              >
                .NET {v}
              </Badge>
            ))}
          </div>
        )}
      </motion.div>

      {/* Grid */}
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

      <CreateComponentDialog open={dialogOpen} onOpenChange={setDialogOpen} template={selectedTemplate} />
    </div>
  );
}
