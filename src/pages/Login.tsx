import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Package, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError("No se pudo conectar. Intenta de nuevo.");
    }, 10000);

    try {
      // Call supabase directly so we get the session back immediately
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      clearTimeout(timeoutId);
      setLoading(false);
      if (error) {
        setError(error.message || "Credenciales incorrectas. Verifica tu email y contraseña.");
      } else if (data?.session) {
        // Don't wait for onAuthStateChange — navigate immediately
        navigate(from, { replace: true });
      }
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      setLoading(false);
      setError(err instanceof Error ? err.message : "Error inesperado. Intenta de nuevo.");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero flex-col items-center justify-center p-12 text-primary-foreground">
        <div className="flex items-center gap-3 mb-8">
          <Package className="w-10 h-10 text-accent" />
          <span className="text-2xl font-bold tracking-tight">ParaPaquetes</span>
        </div>
        <h1 className="text-4xl font-extrabold text-center leading-tight mb-4">
          Print Studio
        </h1>
        <p className="text-primary-foreground/70 text-center text-lg max-w-sm">
          Sistema de Personalización de Empaques de alta calidad para tu marca.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Package className="w-6 h-6 text-accent" />
            <span className="font-bold text-primary text-lg">ParaPaquetes Print Studio</span>
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-1">Iniciar sesión</h2>
          <p className="text-muted-foreground text-sm mb-8">
            Bienvenido de vuelta. Ingresa tus credenciales.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-destructive text-sm bg-destructive/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Ingresando...</>
              ) : "Ingresar"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="text-accent font-medium hover:underline">
              Regístrate gratis
            </Link>
          </p>

          <div className="mt-4 text-center">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
