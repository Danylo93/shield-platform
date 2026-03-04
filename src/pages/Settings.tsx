import { motion } from "framer-motion";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  User,
  Shield,
  Bell,
  Palette,
  Save,
  Loader2,
  CheckCircle2,
  KeyRound,
  GitBranch,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

export default function Settings() {
  const { profile, roles, user } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);

  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : profile?.email?.slice(0, 2).toUpperCase() || "??";

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (error) throw error;
      toast({ title: "Perfil atualizado!", description: "Suas informações foram salvas." });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    {
      id: "profile",
      title: "Perfil",
      description: "Gerencie suas informações pessoais",
      icon: User,
      content: (
        <div className="space-y-6">
          <div className="flex items-center gap-5">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/15 text-primary text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">{profile?.email}</p>
              <div className="flex gap-1.5">
                {roles.map((r) => (
                  <Badge
                    key={r}
                    variant="outline"
                    className={`text-[10px] ${
                      r === "devops"
                        ? "bg-accent/10 text-accent border-accent/20"
                        : "bg-primary/10 text-primary border-primary/20"
                    }`}
                  >
                    {r === "devops" ? "DevOps" : "Developer"}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="grid gap-4 max-w-md">
            <div>
              <Label htmlFor="fullName">Nome completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5"
                placeholder="Seu nome"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={profile?.email || ""} disabled className="mt-1.5 opacity-60" />
              <p className="text-[10px] text-muted-foreground mt-1">O email não pode ser alterado.</p>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving} className="w-fit gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Salvar Alterações
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: "security",
      title: "Segurança",
      description: "Configurações de acesso e permissões",
      icon: Shield,
      content: (
        <div className="space-y-4 max-w-md">
          <div className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Alterar senha</p>
                <p className="text-xs text-muted-foreground">Recomendamos alterar periodicamente</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              supabase.auth.resetPasswordForEmail(profile?.email || "", {
                redirectTo: `${window.location.origin}/reset-password`,
              });
              toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada." });
            }}>
              Enviar link de redefinição
            </Button>
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Suas permissões</p>
                <p className="text-xs text-muted-foreground">
                  {roles.includes("devops")
                    ? "Acesso total: aprovar componentes e gerenciar a plataforma"
                    : "Acesso de desenvolvedor: criar e visualizar seus componentes"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "notifications",
      title: "Notificações",
      description: "Controle como você recebe alertas",
      icon: Bell,
      content: (
        <div className="space-y-4 max-w-md">
          <div className="flex items-center justify-between glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Notificações no app</p>
                <p className="text-xs text-muted-foreground">Receba alertas sobre aprovações</p>
              </div>
            </div>
            <Switch checked={notifications} onCheckedChange={setNotifications} />
          </div>
          <div className="flex items-center justify-between glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Notificações por email</p>
                <p className="text-xs text-muted-foreground">Receba um email quando seu componente for aprovado</p>
              </div>
            </div>
            <Switch checked={emailNotif} onCheckedChange={setEmailNotif} />
          </div>
        </div>
      ),
    },
    {
      id: "platform",
      title: "Plataforma",
      description: "Preferências gerais do DevPortal",
      icon: Palette,
      content: (
        <div className="space-y-4 max-w-md">
          <div className="flex items-center justify-between glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Palette className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Modo escuro</p>
                <p className="text-xs text-muted-foreground">Altere a aparência da interface</p>
              </div>
            </div>
            <Switch checked={darkMode} onCheckedChange={setDarkMode} />
          </div>
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-3">
              <GitBranch className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">Padrão de branches</p>
                <p className="text-xs text-muted-foreground">
                  main, develop (default), feature/teste, release/v1.0
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const [activeSection, setActiveSection] = useState("profile");

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie seu perfil e preferências</p>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar nav */}
        <nav className="lg:w-56 shrink-0 space-y-1">
          {sections.map((s) => {
            const Icon = s.icon;
            const active = activeSection === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {s.title}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {sections
            .filter((s) => s.id === activeSection)
            .map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                <div>
                  <h2 className="text-lg font-semibold text-foreground">{s.title}</h2>
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                </div>
                <Separator />
                {s.content}
              </motion.div>
            ))}
        </div>
      </div>
    </div>
  );
}
