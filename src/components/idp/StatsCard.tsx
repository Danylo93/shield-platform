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
  primary: {
    icon: "bg-primary/10 text-primary",
    glow: "stat-glow-primary",
    bar: "bg-primary",
  },
  accent: {
    icon: "bg-accent/10 text-accent",
    glow: "stat-glow-accent",
    bar: "bg-accent",
  },
  success: {
    icon: "bg-success/10 text-success",
    glow: "stat-glow-success",
    bar: "bg-success",
  },
  warning: {
    icon: "bg-warning/10 text-warning",
    glow: "stat-glow-warning",
    bar: "bg-warning",
  },
};

export function StatsCard({ title, value, subtitle, icon: Icon, color, index }: StatsCardProps) {
  const c = colorMap[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -2 }}
      className={`glass-hover rounded-xl p-5 relative overflow-hidden card-shine ${c.glow}`}
    >
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${c.bar} opacity-60`} />
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        <div className={`p-2.5 rounded-xl ${c.icon}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
      <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>
    </motion.div>
  );
}
