import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ArrowRight, Mail, Lock, User, Eye, EyeOff, Loader2, Users } from "lucide-react";
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
        toast({ title: "Conta criada!", description: "Agente registrado com sucesso." });
      } else {
        await signIn(email, password);
      }
      navigate("/");
    } catch (err: any) {
      toast({
        title: "Acesso negado",
        description: err.message || "Credenciais inválidas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background gradient-mesh tactical-grid relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-accent/3 blur-3xl" />
      <div className="absolute inset-0 scanline" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="glass rounded-2xl p-10 w-full max-w-[420px] text-center space-y-8 relative z-10 shadow-2xl shadow-primary/10 shield-border"
      >
        {/* S.H.I.E.L.D. Logo */}
        <motion.div initial={{ y: -10 }} animate={{ y: 0 }} transition={{ delay: 0.2 }} className="space-y-3">
          <motion.div
            className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center glow-primary border-2 border-primary/30"
            whileHover={{ scale: 1.05, rotate: 10 }}
            transition={{ type: "spring", stiffness: 400 }}
          >
            <Shield className="h-10 w-10 text-primary" />
          </motion.div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-[0.2em] font-display">S.H.I.E.L.D</h1>
            <p className="text-[10px] text-muted-foreground mt-1 tracking-widest uppercase">
              Strategic Homeland Intervention,<br/>Engineering & Logistics Division
            </p>
            <div className="divider-glow mt-3" />
            <p className="text-[11px] text-primary mt-2 font-medium tracking-wider uppercase">Internal Developer Platform</p>
          </div>
        </motion.div>

        {/* Toggle */}
        <div className="flex bg-muted rounded-xl p-1 gap-1">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-300 ${
              !isSignUp ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Acessar
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all duration-300 ${
              isSignUp ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Registrar Agente
          </button>
        </div>

        {/* Form */}
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
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block tracking-wider uppercase">Nome do Agente</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nome completo"
                      className="pl-10 h-11 bg-muted/50 border-border/50 rounded-xl"
                      required={isSignUp}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block tracking-wider uppercase">Divisão</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10 pointer-events-none" />
                    <Select value={squad} onValueChange={setSquad}>
                      <SelectTrigger className="pl-10 h-11 bg-muted/50 border-border/50 rounded-xl">
                        <SelectValue placeholder="Selecione sua divisão" />
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
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block tracking-wider uppercase">Identificação</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agente@shield.gov"
                className="pl-10 h-11 bg-muted/50 border-border/50 rounded-xl"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block tracking-wider uppercase">Código de Acesso</label>
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

          <Button type="submit" disabled={loading} className="w-full h-12 text-sm gap-2 rounded-xl font-semibold tracking-wider" size="lg">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>{isSignUp ? "Registrar Agente" : "Autorizar Acesso"}<ArrowRight className="h-4 w-4" /></>}
          </Button>
        </form>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="pt-4 border-t border-border/50">
          <p className="text-[10px] text-muted-foreground tracking-wide">
            {isSignUp ? "Registro sujeito a aprovação de nível de acesso." : "Acesso restrito. Credenciais classificadas."}
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
