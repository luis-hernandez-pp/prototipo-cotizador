import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, UserRole, isTeamRole } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Which roles are allowed. If omitted, any authenticated user passes. */
  allowedRoles?: UserRole[];
  /** Where to redirect if access is denied */
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo,
}: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const [forceRender, setForceRender] = useState(false);

  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setForceRender(true), 3000);
    return () => clearTimeout(t);
  }, [loading]);

  if (loading && !forceRender) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate to={redirectTo ?? "/login"} state={{ from: location }} replace />
    );
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Team member trying to access customer route → go to dashboard
    // Customer trying to access team route → go to my-orders
    const fallback = isTeamRole(role) ? "/dashboard" : "/my-orders";
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
