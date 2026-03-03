import { useParams, useNavigate } from "react-router-dom";
import { Package, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Checkout() {
  const { designId } = useParams<{ designId: string }>();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-8">
      <div className="w-16 h-16 rounded-full gradient-hero flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-accent" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground mb-2">¡Diseño finalizado!</h1>
        <p className="text-muted-foreground max-w-md">
          Tu diseño ha sido guardado con el ID <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{designId}</span>.
          El flujo de checkout estará disponible próximamente.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate("/customize")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Nuevo diseño
        </Button>
        <Button variant="cta" onClick={() => navigate("/my-orders")}>
          <Package className="w-4 h-4 mr-2" /> Mis pedidos
        </Button>
      </div>
    </div>
  );
}
