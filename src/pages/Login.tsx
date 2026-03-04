import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Mail, Lock, User, Eye, EyeOff, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const SQUADS = [
  "squad-platform",
  "squad-backend",
  "squad-frontend",
  "squad-data",
  "squad-mobile",
  "squad-devops",
  "squad-infra",
  "squad-qa",
];

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [squad, setSquad] = useState("");
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && !squad) {
      toast({ title: "Selecione sua squad", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, fullName, squad);
        toast({ title: "Conta criada!", description: "Você foi registrado como desenvolvedor." });
      } else {
        await signIn(email, password);
      }
      navigate("/");
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Algo deu errado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background gradient-mesh relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-accent/5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="glass rounded-3xl p-10 w-full max-w-[420px] text-center space-y-8 relative z-10 shadow-2xl shadow-primary/5"
      >
        <motion.div initial={{ y: -10 }} animate={{ y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
          <motion.div
            className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center glow-primary"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">DevPortal</h1>
            <p className="text-xs text-muted-foreground mt-1">Internal Developer Platform</p>
          </div>
        </motion.div>

        <div className="flex bg-muted rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-300 ${
              !isSignUp ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-300 ${
              isSignUp ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Criar Conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <AnimatePresence mode="wait">
            {isSignUp && (
              <motion.div
                key="signup-fields"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome completo</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Seu nome"
                      className="pl-10 h-11 bg-muted/50 border-border/50 rounded-xl"
                      required={isSignUp}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Squad</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                    <Select value={squad} onValueChange={setSquad}>
                      <SelectTrigger className="pl-10 h-11 bg-muted/50 border-border/50 rounded-xl">
                        <SelectValue placeholder="Selecione sua squad" />
                      </SelectTrigger>
                      <SelectContent>
                        {SQUADS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="pl-10 h-11 bg-muted/50 border-border/50 rounded-xl"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-10 pr-10 h-11 bg-muted/50 border-border/50 rounded-xl"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 text-sm gap-2 rounded-xl font-semibold" size="lg">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{isSignUp ? "Criar Conta" : "Entrar"}<ArrowRight className="h-4 w-4" /></>}
          </Button>
        </form>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="pt-4 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground">
            {isSignUp ? "Você será registrado como desenvolvedor na squad selecionada." : "Acesse com suas credenciais corporativas."}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
