import { useAuth } from "@/contexts/AuthContext";
import {
  ShoppingBag,
  Users,
  Printer,
  TrendingUp,
  Clock,
  CheckCircle,
  Package,
  AlertCircle,
} from "lucide-react";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  sales: "Ventas",
  print_operator: "Operador de Impresión",
  designer: "Diseñador",
};

export default function Dashboard() {
  const { user, role } = useAuth();

  const statCards = [
    { label: "Pedidos hoy", value: "—", icon: ShoppingBag, color: "text-accent" },
    { label: "En cola de impresión", value: "—", icon: Printer, color: "text-yellow-500" },
    { label: "Clientes activos", value: "—", icon: Users, color: "text-blue-500" },
    { label: "Entregas esta semana", value: "—", icon: TrendingUp, color: "text-green-500" },
  ];

  const pipeline = [
    { status: "Pendiente pago", count: "—", icon: Clock, color: "bg-yellow-500/10 text-yellow-600" },
    { status: "En cola", count: "—", icon: AlertCircle, color: "bg-blue-500/10 text-blue-600" },
    { status: "Imprimiendo", count: "—", icon: Printer, color: "bg-accent/10 text-accent" },
    { status: "Entregados", count: "—", icon: CheckCircle, color: "bg-green-500/10 text-green-600" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Bienvenido, {roleLabels[role] ?? role}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-card border border-border rounded-xl p-5 flex flex-col gap-3"
          >
            <Icon className={`w-5 h-5 ${color}`} />
            <p className="text-3xl font-bold text-foreground">{value}</p>
            <p className="text-muted-foreground text-xs">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-accent" />
            Pipeline de pedidos
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {pipeline.map(({ status, count, icon: Icon, color }) => (
              <div
                key={status}
                className={`rounded-lg p-4 flex items-center gap-3 ${color}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs opacity-80">{status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick info */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold text-foreground mb-4">Tu rol</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/10">
              <div className="w-8 h-8 rounded-full gradient-hero flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground text-sm">
                  {roleLabels[role] ?? role}
                </p>
                <p className="text-muted-foreground text-xs">{user?.email}</p>
              </div>
            </div>
            <p className="text-muted-foreground text-xs text-center pt-2">
              El dashboard se irá completando con datos reales conforme se construyan las funcionalidades.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
