import { useState } from "react";
import {
  CloudRain, Waves, Database as DbIcon, ArrowDownUp,
  Map, Settings, Upload, Plug, ChevronDown, ChevronRight, Droplets, ScanSearch,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface NavItem {
  title: string;
  url: string;
  icon: React.ElementType;
  children?: { title: string; url: string }[];
}

const navItems: NavItem[] = [
  { title: "Carte & Synthèse", url: "/", icon: Map },
  {
    title: "Précipitations", url: "/precipitations", icon: CloudRain,
    children: [
      { title: "Par station", url: "/precipitations/station" },
      { title: "Par bassin", url: "/precipitations/bassin" },
    ],
  },
  {
    title: "Débits", url: "/debits", icon: Waves,
    children: [
      { title: "Par station", url: "/debits/station" },
    ],
  },
  {
    title: "Apports", url: "/apports", icon: DbIcon,
    children: [
      { title: "Par barrage", url: "/apports/barrage" },
    ],
  },
  {
    title: "Volume", url: "/volume", icon: DbIcon,
    children: [
      { title: "Par barrage", url: "/volume/barrage" },
    ],
  },
  {
    title: "Récapitulatif", url: "/recap-barrage", icon: DbIcon,
  },
];

const adminItems = [
  { title: "Import", url: "/import", icon: Upload },
  { title: "Gestion Données", url: "/data-management", icon: DbIcon },
  { title: "Scan de données", url: "/data-scan", icon: ScanSearch },
  { title: "Paramètres", url: "/settings", icon: Settings },
  { title: "Environnement", url: "/environment", icon: Plug },
];

function CollapsibleNavItem({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(true);

  if (!item.children) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end={item.url === "/"}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-sidebar-accent"
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
          >
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="flex items-center gap-2 px-3 py-2 rounded-md text-sm w-full transition-colors hover:bg-sidebar-accent text-sidebar-foreground">
            <item.icon className="h-4 w-4" />
            <span className="flex-1 text-left">{item.title}</span>
            {open ? <ChevronDown className="h-3 w-3 opacity-50" /> : <ChevronRight className="h-3 w-3 opacity-50" />}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-6 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
            {item.children.map((child) => (
              <SidebarMenuButton key={child.url} asChild>
                <NavLink
                  to={child.url}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors hover:bg-sidebar-accent"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                >
                  <span>{child.title}</span>
                </NavLink>
              </SidebarMenuButton>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Droplets className="h-7 w-7 text-sidebar-primary" />
          <div>
            <h1 className="font-bold text-base text-sidebar-foreground">Hydro-Météo Sebou</h1>
            <p className="text-[10px] text-sidebar-foreground/60 leading-tight">Système d'aide à la décision</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Données</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <CollapsibleNavItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Administration</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
