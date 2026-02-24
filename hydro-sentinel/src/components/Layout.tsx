import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { useHealth } from "@/hooks/useApi";
import { Badge } from "@/components/ui/badge";

export function Layout() {
  const { data: result } = useHealth();
  const fromApi = result?.fromApi ?? false;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-12 flex items-center border-b px-4 bg-card shrink-0">
            <SidebarTrigger />
            <span className="ml-3 text-sm font-medium text-foreground">Hydro-Météo Sebou</span>
            <span className="ml-2 text-xs text-muted-foreground">
              Connecté à l'API
            </span>
          </header>
          <div className="flex-1 overflow-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
