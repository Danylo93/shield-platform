import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  color: "primary" | "accent" | "success" | "warning";
  index: number;
}

const colorMap = {
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent/10 text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

export function StatsCard({ title, value, subtitle, icon: Icon, color, index }: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="glass rounded-xl p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </motion.div>
  );
}
