import { Link, useNavigate } from "react-router-dom";
import { Package, LogOut, User, ChevronDown, ShoppingBag, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, isTeamRole } from "@/contexts/AuthContext";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  sales: "Ventas",
  print_operator: "Operador de Impresión",
  designer: "Diseñador",
  customer: "Cliente",
  guest: "Invitado",
};

export function AppHeader() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 text-muted-foreground text-sm">
          <span>/</span>
          <span className="text-foreground font-medium capitalize">
            {roleLabels[role] ?? role}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2">
                <div className="w-7 h-7 rounded-full gradient-hero flex items-center justify-center shrink-0">
                  <User className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
                <span className="hidden sm:block text-sm max-w-[160px] truncate">
                  {user.email}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <p className="text-xs text-muted-foreground font-normal truncate">{user.email}</p>
                <p className="text-xs font-semibold text-accent">{roleLabels[role]}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isTeamRole(role) ? (
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="cursor-pointer">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem asChild>
                  <Link to="/my-orders" className="cursor-pointer">
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Mis pedidos
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive cursor-pointer">
                <LogOut className="w-4 h-4 mr-2" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Ingresar</Link>
            </Button>
            <Button variant="cta" size="sm" asChild>
              <Link to="/register">Registrarse</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
