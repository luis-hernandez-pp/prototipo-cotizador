import { Link } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Settings,
  ChevronRight,
  Printer,
  Layers,
  DollarSign,
  Paintbrush,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";

const teamNavItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Pedidos", url: "/dashboard/orders", icon: ShoppingBag },
  { title: "Catálogo", url: "/dashboard/products", icon: Layers },
  { title: "Editor", url: "/customize", icon: Paintbrush },
  { title: "Clientes", url: "/dashboard/customers", icon: Users },
  { title: "Impresión", url: "/dashboard/print-queue", icon: Printer },
];

const adminItems = [
  { title: "Precios", url: "/dashboard/pricing", icon: DollarSign },
  { title: "Configuración", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const { state, setOpen } = useSidebar();
  const collapsed = state === "collapsed";
  const { role } = useAuth();

  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className="h-full"
    >
      <Sidebar collapsible="icon" className="border-r-0">
        <SidebarHeader className="gradient-hero px-4 py-4 flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Package className="w-6 h-6 text-accent shrink-0" />
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-primary-foreground font-bold text-sm leading-tight truncate">
                  ParaPaquetes
                </p>
                <p className="text-primary-foreground/60 text-xs truncate">
                  Print Studio
                </p>
              </div>
            )}
          </div>
        </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider px-3 py-2">
              Operaciones
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {teamNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {role === "admin" && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs uppercase tracking-wider px-3 py-2">
                Admin
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                        activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                      >
                        <item.icon className="w-4 h-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="bg-sidebar border-t border-sidebar-border p-2">
        {!collapsed && (
          <Link
            to="/"
            className="flex items-center gap-2 px-3 py-2 text-sidebar-foreground/50 hover:text-sidebar-foreground text-xs transition-colors rounded-lg hover:bg-sidebar-accent"
          >
            <ChevronRight className="w-3 h-3" />
            Ver sitio público
          </Link>
        )}
      </SidebarFooter>
    </Sidebar>
    </div>
  );
}
