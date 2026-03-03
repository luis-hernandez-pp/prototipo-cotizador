import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import MyOrders from "./pages/MyOrders";
import Customize from "./pages/Customize";
import CustomizeEditor from "./pages/CustomizeEditor";
import Checkout from "./pages/Checkout";
import Products from "./pages/dashboard/Products";
import ProductMockupEditor from "./pages/ProductMockupEditor";
import Orders from "./pages/dashboard/Orders";
import Pricing from "./pages/dashboard/Pricing";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const TEAM_ROLES = ["admin", "sales", "print_operator", "designer"] as const;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/customize"
              element={
                <ProtectedRoute allowedRoles={[...TEAM_ROLES]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Customize />} />
              <Route path="editor" element={<CustomizeEditor />} />
            </Route>
            <Route path="/checkout/:designId" element={<Checkout />} />

            {/* Customer protected */}
            <Route
              path="/my-orders"
              element={
                <ProtectedRoute allowedRoles={["customer"]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<MyOrders />} />
            </Route>

            {/* Team protected — all team roles */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={[...TEAM_ROLES]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="products/:productId/mockup" element={<ProductMockupEditor />} />
              <Route path="orders" element={<Orders />} />
              <Route path="pricing" element={<Pricing />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
