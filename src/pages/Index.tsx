import heroBg from "@/assets/hero-bg.jpg";
import { Button } from "@/components/ui/button";
import { Package, Layers, Palette, LogIn, UserPlus, LayoutDashboard, ShoppingBag, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, isTeamRole } from "@/contexts/AuthContext";

const features = [
  {
    icon: Package,
    title: "Empaques a medida",
    desc: "Diseña cajas, bolsas y envoltorios con tus dimensiones exactas.",
  },
  {
    icon: Palette,
    title: "Impresión full color",
    desc: "Tecnología offset y digital con acabados premium.",
  },
  {
    icon: Layers,
    title: "Múltiples materiales",
    desc: "Kraft, cartulina, corrugado y más opciones sostenibles.",
  },
];

export default function Index() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Navbar ──────────────────────────────────────── */}
      <header className="gradient-hero shadow-brand">
        <div className="container mx-auto flex items-center justify-between h-16 px-6">
          <div className="flex items-center gap-2">
            <Package className="text-accent w-6 h-6" />
            <span className="text-primary-foreground font-bold text-lg tracking-tight">
              ParaPaquetes
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-primary-foreground/80 text-sm font-medium">
            <a href="#features" className="hover:text-accent transition-colors">Productos</a>
            <a href="#cta" className="hover:text-accent transition-colors">Contacto</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  asChild
                >
                  <Link to={isTeamRole(role) ? "/dashboard" : "/my-orders"}>
                    {isTeamRole(role) ? (
                      <><LayoutDashboard className="w-4 h-4 mr-1.5" />Dashboard</>
                    ) : (
                      <><ShoppingBag className="w-4 h-4 mr-1.5" />Mis pedidos</>
                    )}
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground/60 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10 text-sm"
                  asChild
                >
                  <Link to="/login">
                    <LogIn className="w-4 h-4 mr-1.5" />
                    Ingresar
                  </Link>
                </Button>
                <Button variant="cta" size="sm" className="text-sm px-5 py-2" asChild>
                  <Link to="/register">
                    <UserPlus className="w-4 h-4 mr-1.5" />
                    Registrarse
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────── */}
      <section
        className="relative flex-1 flex items-center justify-center text-center overflow-hidden"
        style={{ minHeight: "85vh" }}
      >
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        {/* Overlay */}
        <div className="absolute inset-0 gradient-hero opacity-80" />

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 flex flex-col items-center gap-6 py-20">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 bg-accent/20 border border-accent/40 text-accent text-sm font-semibold px-4 py-1.5 rounded-full backdrop-blur-sm">
            <Palette className="w-3.5 h-3.5" />
            Studio de Personalización
          </span>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-primary-foreground leading-tight max-w-4xl">
            ParaPaquetes{" "}
            <span className="text-accent">Print Studio</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl md:text-2xl text-primary-foreground/75 max-w-2xl leading-relaxed">
            Sistema de Personalización de Empaques
          </p>

          <p className="text-primary-foreground/60 max-w-xl text-base leading-relaxed">
            Crea empaques únicos que reflejan la identidad de tu marca. Diseño
            profesional, impresión de alta calidad y entrega rápida.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
            <Button variant="cta" size="lg" className="text-lg font-bold" asChild>
              <Link to={user ? (isTeamRole(role) ? "/dashboard" : "/my-orders") : "/register"}>
                Personaliza tu empaque
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              asChild
            >
              <a href="#features">Ver catálogo</a>
            </Button>
          </div>
        </div>

        {/* Bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 60L60 50C120 40 240 20 360 15C480 10 600 20 720 28C840 36 960 42 1080 40C1200 38 1320 28 1380 23L1440 18V60H0Z"
              fill="hsl(var(--background))"
            />
          </svg>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section id="features" className="bg-background py-20">
        <div className="container mx-auto px-6">
          <h2 className="text-center text-3xl font-bold text-primary mb-2">
            ¿Por qué elegirnos?
          </h2>
          <p className="text-center text-muted-foreground mb-12 text-base">
            Todo lo que necesitas para empaques perfectos
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group bg-card border border-border rounded-2xl p-8 flex flex-col items-center text-center gap-4 hover:shadow-brand hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <Icon className="w-7 h-7 text-accent" />
                </div>
                <h3 className="font-bold text-lg text-primary">{title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────── */}
      <section id="cta" className="gradient-hero py-16">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground">
              ¿Listo para crear tu empaque ideal?
            </h2>
            <p className="text-primary-foreground/70 mt-1 text-base">
              Cotización gratuita en menos de 24 horas.
            </p>
          </div>
          <Button variant="cta" size="lg" className="shrink-0 text-base font-bold" asChild>
            <Link to={user ? "/my-orders" : "/register"}>
              Personaliza tu empaque
            </Link>
          </Button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="bg-primary py-6">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-2 text-primary-foreground/60 text-sm">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-accent" />
            <span className="font-semibold text-primary-foreground">
              ParaPaquetes Print Studio
            </span>
          </div>
          <p>© {new Date().getFullYear()} Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
