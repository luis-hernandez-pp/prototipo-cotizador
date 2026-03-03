import { useAuth } from "@/contexts/AuthContext";
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  Truck,
  Package,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function MyOrders() {
  const { user } = useAuth();

  const statCards = [
    { label: "Total pedidos", value: "0", icon: ShoppingBag, color: "text-accent" },
    { label: "En producción", value: "0", icon: Clock, color: "text-yellow-500" },
    { label: "Entregados", value: "0", icon: CheckCircle, color: "text-green-500" },
    { label: "En camino", value: "0", icon: Truck, color: "text-blue-500" },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mis Pedidos</h1>
          <p className="text-muted-foreground text-sm mt-1">{user?.email}</p>
        </div>
        <Button variant="cta" size="sm" asChild>
          <Link to="/">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo pedido
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2"
          >
            <Icon className={`w-5 h-5 ${color}`} />
            <p className="text-2xl font-bold text-foreground">{value}</p>
            <p className="text-muted-foreground text-xs">{label}</p>
          </div>
        ))}
      </div>

      {/* Empty state */}
      <div className="bg-card border border-border rounded-2xl p-12 text-center">
        <Package className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
        <h3 className="font-semibold text-foreground mb-2">Aún no tienes pedidos</h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
          Personaliza tu primer empaque y aparecerá aquí con su estado en tiempo real.
        </p>
        <Button variant="cta" asChild>
          <Link to="/">Personaliza tu primer empaque →</Link>
        </Button>
      </div>
    </div>
  );
}
