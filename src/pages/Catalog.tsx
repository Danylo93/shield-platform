import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, GitBranch, Clock, CheckCircle2 } from "lucide-react";

const components = [
  { name: "payment-api", language: "Java", owner: "squad-payments", lifecycle: "production", lastDeploy: "2h atrás", repo: "payment-api" },
  { name: "user-service", language: ".NET 8", owner: "squad-identity", lifecycle: "production", lastDeploy: "5h atrás", repo: "user-service" },
  { name: "notification-worker", language: "Python", owner: "squad-platform", lifecycle: "production", lastDeploy: "1d atrás", repo: "notification-worker" },
  { name: "catalog-api", language: ".NET 9", owner: "squad-catalog", lifecycle: "development", lastDeploy: "3h atrás", repo: "catalog-api" },
  { name: "analytics-pipeline", language: "Python", owner: "squad-data", lifecycle: "experimental", lastDeploy: "6h atrás", repo: "analytics-pipeline" },
  { name: "order-service", language: "Java", owner: "squad-orders", lifecycle: "production", lastDeploy: "30min atrás", repo: "order-service" },
];

const lifecycleColor: Record<string, string> = {
  production: "bg-success/15 text-success border-success/30",
  development: "bg-primary/15 text-primary border-primary/30",
  experimental: "bg-warning/15 text-warning border-warning/30",
  deprecated: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function Catalog() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground mb-1">Catálogo de Componentes</h1>
        <p className="text-muted-foreground text-sm">Todos os serviços e componentes registrados</p>
      </motion.div>

      <div className="space-y-3">
        {components.map((comp, i) => (
          <motion.div
            key={comp.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-xl p-4 flex items-center justify-between gap-4 hover:glow-primary transition-shadow cursor-pointer group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <GitBranch className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                  {comp.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {comp.owner} • {comp.language}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Badge variant="outline" className={`text-[10px] ${lifecycleColor[comp.lifecycle]}`}>
                <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                {comp.lifecycle}
              </Badge>
              <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {comp.lastDeploy}
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
