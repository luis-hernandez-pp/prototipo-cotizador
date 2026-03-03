import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { Outlet, useLocation } from "react-router-dom";

export function DashboardLayout() {
  const { pathname } = useLocation();
  const isEditor = pathname === "/customize/editor";

  return (
    <SidebarProvider defaultOpen={false}>
      <div className={`${isEditor ? "h-screen" : "min-h-screen"} flex w-full bg-background`}>
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {!isEditor && <AppHeader />}
          <main className={`flex-1 ${isEditor ? "p-0 flex flex-col overflow-hidden min-h-0" : "overflow-auto p-6"}`}>
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
