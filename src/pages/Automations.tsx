import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  Terminal,
  Server,
  Loader2,
  CheckCircle2,
  Clock,
  Plus,
  X,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface PlaybookRun {
  id: string;
  playbook_name: string;
  target_hosts: string[];
  status: string;
  logs: string;
  created_at: string;
  finished_at: string | null;
}

export default function Automations() {
  const { session } = useAuth();
  const [runs, setRuns] = useState<PlaybookRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<PlaybookRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);

  // VM management
  const [vms, setVms] = useState<string[]>([
    "10.0.1.10",
    "10.0.1.11",
    "10.0.1.12",
    "10.0.2.20",
    "10.0.2.21",
  ]);
  const [selectedVms, setSelectedVms] = useState<string[]>([]);
  const [newVmIp, setNewVmIp] = useState("");

  const fetchRuns = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("playbook_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setRuns(data as unknown as PlaybookRun[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchRuns();

    const channel = supabase
      .channel("playbook-runs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "playbook_runs" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as unknown as PlaybookRun;
            setRuns((prev) =>
              prev.map((r) => (r.id === updated.id ? updated : r))
            );
            setSelectedRun((prev) =>
              prev?.id === updated.id ? updated : prev
            );
          } else if (payload.eventType === "INSERT") {
            setRuns((prev) => [payload.new as unknown as PlaybookRun, ...prev]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const toggleVm = (ip: string) => {
    setSelectedVms((prev) =>
      prev.includes(ip) ? prev.filter((v) => v !== ip) : [...prev, ip]
    );
  };

  const addVm = () => {
    const ip = newVmIp.trim();
    if (!ip) return;
    if (vms.includes(ip)) {
      toast.error("IP já existe na lista");
      return;
    }
    setVms((prev) => [...prev, ip]);
    setNewVmIp("");
  };

  const removeVm = (ip: string) => {
    setVms((prev) => prev.filter((v) => v !== ip));
    setSelectedVms((prev) => prev.filter((v) => v !== ip));
  };

  const runPlaybook = async () => {
    if (selectedVms.length === 0) {
      toast.error("Selecione pelo menos uma VM");
      return;
    }
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("run-playbook", {
        body: {
          playbook_name: "hello_world.yml",
          target_hosts: selectedVms,
        },
      });
      if (error) throw error;
      toast.success("Playbook iniciado!");
      if (data?.id) {
        const newRun = runs.find((r) => r.id === data.id);
        if (newRun) setSelectedRun(newRun);
      }
    } catch (err: any) {
      toast.error("Erro ao executar playbook: " + err.message);
    } finally {
      setRunning(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10">
            <CheckCircle2 className="h-3 w-3 mr-1" /> Concluído
          </Badge>
        );
      case "running":
        return (
          <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Executando
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" /> Pendente
          </Badge>
        );
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <Terminal className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-display tracking-wide">
              Automações Ansible
            </h1>
            <p className="text-sm text-muted-foreground">
              Execute playbooks nas VMs selecionadas e acompanhe os logs em tempo real
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: VM selection + Run */}
        <div className="space-y-4">
          <Card className="border-border/50 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                VMs Disponíveis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: 10.0.1.50"
                  value={newVmIp}
                  onChange={(e) => setNewVmIp(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addVm()}
                  className="h-8 text-xs"
                />
                <Button size="sm" variant="outline" onClick={addVm} className="h-8 px-2">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Separator />
              <ScrollArea className="h-[240px]">
                <div className="space-y-1.5">
                  {vms.map((ip) => (
                    <div
                      key={ip}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent/50 transition-colors group"
                    >
                      <Checkbox
                        checked={selectedVms.includes(ip)}
                        onCheckedChange={() => toggleVm(ip)}
                        id={ip}
                      />
                      <label
                        htmlFor={ip}
                        className="flex-1 text-xs font-mono text-foreground cursor-pointer"
                      >
                        {ip}
                      </label>
                      <button
                        onClick={() => removeVm(ip)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Separator />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{selectedVms.length} selecionada(s)</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-xs px-2"
                  onClick={() =>
                    setSelectedVms(
                      selectedVms.length === vms.length ? [] : [...vms]
                    )
                  }
                >
                  {selectedVms.length === vms.length
                    ? "Desmarcar todas"
                    : "Selecionar todas"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Play className="h-4 w-4 text-primary" />
                Playbook
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                <p className="text-xs font-semibold text-foreground mb-1">hello_world.yml</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Executa um "Hello World" e exibe o IP da máquina em cada host
                  selecionado.
                </p>
              </div>
              <Button
                className="w-full gap-2"
                onClick={runPlaybook}
                disabled={running || selectedVms.length === 0}
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {running ? "Executando..." : "Executar Playbook"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right: Execution history + Logs */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/50 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Histórico de Execuções
                </CardTitle>
                <Button size="sm" variant="ghost" onClick={fetchRuns} className="h-7 px-2">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {runs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Nenhuma execução ainda. Execute um playbook para começar.
                </p>
              ) : (
                <ScrollArea className="h-[180px]">
                  <div className="space-y-1.5">
                    {runs.map((run) => (
                      <button
                        key={run.id}
                        onClick={() => setSelectedRun(run)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                          selectedRun?.id === run.id
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-accent/50"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">
                            {run.playbook_name}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {run.target_hosts.length} host(s) •{" "}
                            {new Date(run.created_at).toLocaleString("pt-BR")}
                          </p>
                        </div>
                        {statusBadge(run.status)}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/80 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Terminal className="h-4 w-4 text-primary" />
                Logs
                {selectedRun && (
                  <span className="text-[10px] text-muted-foreground font-normal ml-2">
                    {selectedRun.playbook_name}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedRun ? (
                <ScrollArea className="h-[340px]">
                  <pre className="text-[11px] font-mono leading-relaxed text-green-400 bg-black/80 rounded-lg p-4 whitespace-pre-wrap break-all">
                    {selectedRun.logs || "Aguardando logs..."}
                  </pre>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Terminal className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-xs">Selecione uma execução para ver os logs</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
