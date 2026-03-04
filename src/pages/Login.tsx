import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      navigate("/");
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background gradient-mesh">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="glass rounded-2xl p-8 w-full max-w-md text-center space-y-8"
      >
        <motion.div
          initial={{ y: -10 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary flex items-center justify-center glow-primary">
            <Sparkles className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">DevPortal</h1>
            <p className="text-sm text-muted-foreground mt-1">Internal Developer Platform</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-12 text-sm gap-3 relative overflow-hidden"
            size="lg"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <Sparkles className="h-5 w-5" />
              </motion.div>
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 23 23" fill="none">
                  <path d="M0 0h11v11H0z" fill="#f25022" />
                  <path d="M12 0h11v11H12z" fill="#7fba00" />
                  <path d="M0 12h11v11H0z" fill="#00a4ef" />
                  <path d="M12 12h11v11H12z" fill="#ffb900" />
                </svg>
                Entrar com Azure DevOps
                <ArrowRight className="h-4 w-4 ml-auto" />
              </>
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Faça login com sua conta corporativa do Azure DevOps
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="pt-4 border-t border-border"
        >
          <p className="text-[10px] text-muted-foreground">
            Ao entrar, você concorda com as políticas internas de uso.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
