import {
  LayoutDashboard,
  Layers,
  GitFork,
  Settings,
  Search,
  LogOut,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
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
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path: string) => location.pathname === path;
  const { profile, roles, isDevOps, signOut } = useAuth();

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : profile?.email?.slice(0, 2).toUpperCase() || "??";

  const roleBadge = isDevOps ? "DevOps" : "Dev";

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  // Dev items - no Aprovações (only devops sees that)
  const devItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Meus Componentes", url: "/catalog", icon: Layers },
    { title: "Templates", url: "/templates", icon: GitFork },
  ];

  // DevOps gets Aprovações
  const devopsItems = [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Catálogo", url: "/catalog", icon: Layers },
    { title: "Templates", url: "/templates", icon: GitFork },
    { title: "Aprovações", url: "/approvals", icon: ShieldCheck },
  ];

  const mainItems = isDevOps ? devopsItems : devItems;

  const adminItems = isDevOps
    ? [{ title: "Configurações", url: "/settings", icon: Settings }]
    : [];

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="font-bold text-sm text-sidebar-accent-foreground truncate">DevPortal</h1>
              <p className="text-[10px] text-sidebar-foreground truncate">Internal Developer Platform</p>
            </div>
          )}
        </motion.div>
      </SidebarHeader>

      {!collapsed && (
        <div className="px-3 mb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-sidebar-foreground" />
            <Input
              placeholder="Buscar..."
              className="h-8 pl-8 text-xs bg-sidebar-accent border-sidebar-border text-sidebar-accent-foreground placeholder:text-sidebar-foreground/50"
            />
          </div>
        </div>
      )}

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {adminItems.length > 0 && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-wider">
                Admin
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <NavLink
                          to={item.url}
                          end
                          className="hover:bg-sidebar-accent"
                          activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarSeparator className="mb-3" />
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-medium text-sidebar-accent-foreground truncate">
                {profile?.full_name || profile?.email || "Usuário"}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-sidebar-foreground truncate">{roleBadge}</span>
                {profile?.squad && (
                  <span className="text-[10px] text-sidebar-foreground/60 truncate">• {profile.squad}</span>
                )}
              </div>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleSignOut}
              className="text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
