import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PinDialog } from "@/components/dashboard/PinDialog";
import { AIChat } from "@/components/dashboard/AIChat";
import { Button } from "@/components/ui/button";
import { GripVertical, Bell, LogOut, Sun, Moon } from "lucide-react";
import { DEFAULT_SIDEBAR_ITEMS } from "@/lib/dashboard-tabs";
import { useTheme } from "@/hooks/useTheme";
import { SoumissionsTab } from "@/components/dashboard/tabs/SoumissionsTab";

// Tab imports (we'll add these as we build them)
import { OverviewTab } from "@/components/dashboard/tabs/OverviewTab";
import { ClientsTab } from "@/components/dashboard/tabs/ClientsTab";
import { SecteursTab } from "@/components/dashboard/tabs/SecteursTab";
import { EquipesTournageTab } from "@/components/dashboard/tabs/EquipesTournageTab";
import { ClientCenterTab } from "@/components/dashboard/tabs/ClientCenterTab";
import { RevenueTab } from "@/components/dashboard/tabs/RevenueTab";
import { AdvisorsTab } from "@/components/dashboard/tabs/AdvisorsTab";
import { SettingsTab } from "@/components/dashboard/tabs/SettingsTab";
import { TeamTab } from "@/components/dashboard/tabs/TeamTab";
import { KpiTab } from "@/components/dashboard/tabs/KpiTab";
import { ResultatsTab } from "@/components/dashboard/tabs/ResultatsTab";
import { useAgencySettings } from "@/hooks/usePortal";
import { useMyAccess } from "@/hooks/useTeamAccess";
import { setMoneyHidden } from "@/lib/utils";
import { EchoTintedLogo } from "@/components/EchoTintedLogo";

/** Convert #rrggbb to "H S% L%" string used by Tailwind/shadcn CSS vars */
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if      (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
  else if (max === g) h = (b - r) / d + 2;
  else                h = (r - g) / d + 4;
  h /= 6;
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}


type TabId = typeof DEFAULT_SIDEBAR_ITEMS[number]["id"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { theme, toggle: toggleTheme } = useTheme();
  const { data: agency } = useAgencySettings();
  const agencyColor = agency?.color || "#7c3aed";
  const agencyName  = agency?.name  || "Echo";
  const themeHsl    = hexToHsl(agencyColor);

  // Accès employé : onglets choisis par le propriétaire + montants masqués.
  // Réglé pendant le render pour que les onglets enfants formatent déjà masqué.
  const access = useMyAccess();
  setMoneyHidden(!access.canSeeMoney);

  // Sidebar order (persisted)
  const [sidebarOrder, setSidebarOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("sidebarOrder");
      if (!saved) return DEFAULT_SIDEBAR_ITEMS.map((i) => i.id);
      const parsed: string[] = JSON.parse(saved);
      // Merge: add any new tabs that aren't in the saved order yet
      const allIds = DEFAULT_SIDEBAR_ITEMS.map((i) => i.id);
      const merged = [...parsed, ...allIds.filter((id) => !parsed.includes(id))];
      return merged;
    } catch {
      return DEFAULT_SIDEBAR_ITEMS.map((i) => i.id);
    }
  });

  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // PIN protection
  const [unlockedSections, setUnlockedSections] = useState<Set<string>>(new Set());
  const [pinTarget, setPinTarget] = useState<TabId | null>(null);
  const [showPin, setShowPin] = useState(false);

  // Drag state
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || "");
    });
    // Ensure revenue metrics are always up to date on load
    supabase.rpc("calculate_revenue_metrics").then(() => {
      // metrics will be fetched fresh by useRevenueMetrics hook
    });
  }, []);

  const handleTabClick = (item: typeof DEFAULT_SIDEBAR_ITEMS[number]) => {
    // Employés : les onglets ouverts par le propriétaire ne demandent pas le NIP.
    if (item.protected && !access.isEmployee && !unlockedSections.has(item.id)) {
      setPinTarget(item.id as TabId);
      setShowPin(true);
    } else {
      setActiveTab(item.id as TabId);
    }
  };

  const handlePinSuccess = () => {
    if (pinTarget) {
      setUnlockedSections((prev) => new Set([...prev, pinTarget]));
      setActiveTab(pinTarget);
      setPinTarget(null);
    }
    setShowPin(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  // Drag handlers
  const handleDragStart = (id: string) => setDragging(id);
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOver(id);
  };
  const handleDrop = (targetId: string) => {
    if (!dragging || dragging === targetId) return;
    const newOrder = [...sidebarOrder];
    const fromIdx = newOrder.indexOf(dragging);
    const toIdx = newOrder.indexOf(targetId);
    newOrder.splice(fromIdx, 1);
    newOrder.splice(toIdx, 0, dragging);
    setSidebarOrder(newOrder);
    localStorage.setItem("sidebarOrder", JSON.stringify(newOrder));
    setDragging(null);
    setDragOver(null);
  };

  const orderedItems = sidebarOrder
    .map((id) => DEFAULT_SIDEBAR_ITEMS.find((i) => i.id === id))
    .filter(Boolean)
    .filter((i) => access.allowedTabs === null || access.allowedTabs.includes(i!.id)) as typeof DEFAULT_SIDEBAR_ITEMS;

  const currentTab: TabId = orderedItems.some((i) => i.id === activeTab)
    ? activeTab
    : (orderedItems[0]?.id ?? "overview");

  const renderTab = () => {
    if (orderedItems.length === 0) {
      return (
        <div className="h-full flex items-center justify-center p-8 text-center">
          <p className="text-sm text-muted-foreground max-w-sm">
            {access.member && !access.member.active
              ? "Ton accès a été désactivé. Contacte le responsable de l'agence."
              : "Aucune section ne t'a encore été ouverte. Le responsable de l'agence peut te donner accès depuis Settings."}
          </p>
        </div>
      );
    }
    switch (currentTab) {
      case "overview":  return <OverviewTab />;
      case "clients":   return <ClientsTab />;
      case "secteurs":  return <SecteursTab />;
      case "equipes_tournage": return <EquipesTournageTab />;
      case "center":    return <ClientCenterTab />;
      case "revenue":   return <RevenueTab />;
      case "advisors":  return <AdvisorsTab />;
      case "soumissions": return <SoumissionsTab />;
      case "team":      return <TeamTab />;
      case "kpi":       return <KpiTab />;
      case "resultats": return <ResultatsTab />;
      case "settings":  return <SettingsTab />;
      default:          return <OverviewTab />;
    }
  };

  if (access.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="flex h-screen bg-background overflow-hidden"
      style={{
        ["--primary" as any]: themeHsl,
        ["--ring"    as any]: themeHsl,
      }}
    >
      {/* Sidebar — cleaner, editorial */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-sidebar-border/40 bg-sidebar">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6 border-b border-sidebar-border/30">
          <EchoTintedLogo color={agencyColor} size="w-8 h-8" rounded="rounded-md" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-sidebar-foreground truncate leading-tight tracking-tight">{agencyName}</p>
            <p className="text-[10px] text-muted-foreground/70 leading-tight uppercase tracking-widest font-medium">Echo</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
          {orderedItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const isProtected = item.protected && !access.isEmployee && !unlockedSections.has(item.id);

            return (
              <div
                key={item.id}
                draggable
                onDragStart={() => handleDragStart(item.id)}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDrop={() => handleDrop(item.id)}
                onDragEnd={() => { setDragging(null); setDragOver(null); }}
                onClick={() => handleTabClick(item)}
                className={`sidebar-item ${isActive ? "active" : ""} ${
                  dragOver === item.id ? "ring-1 ring-primary/50 bg-sidebar-accent" : ""
                }`}
              >
                <Icon className="w-[15px] h-[15px] flex-shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {isProtected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                )}
                <GripVertical className="grip-icon w-3 h-3 text-muted-foreground flex-shrink-0 cursor-grab" />
              </div>
            );
          })}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-sidebar-border/30">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-md hover:bg-sidebar-accent/40 transition-colors">
            <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
              <span className="text-primary text-[10px] font-bold">
                {userEmail.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-sidebar-foreground/80 truncate">{userEmail || "User"}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted-foreground/60 hover:text-destructive transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-border/30 bg-background/80 backdrop-blur-sm flex-shrink-0">
          <h1 className="text-base font-semibold text-foreground tracking-tight">
            {orderedItems.find((i) => i.id === currentTab)?.label || "Dashboard"}
          </h1>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
              className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground">
              <Bell className="w-4 h-4" />
            </button>
            <Button size="sm" variant="outline" className="border-primary/30 text-primary hover:bg-primary/10">
              New Project
            </Button>
          </div>
        </header>

        {/* Tab content */}
        <main className="flex-1 overflow-hidden">
          {currentTab === "team" || currentTab === "suivis"
            ? <div className="h-full">{renderTab()}</div>
            : <div className="h-full overflow-y-auto">{renderTab()}</div>
          }
        </main>
      </div>

      {/* AI Chat — caché aux employés sans accès aux $ (l'IA peut lire les revenus) */}
      {access.canSeeMoney && <AIChat />}

      {/* PIN dialog */}
      <PinDialog
        open={showPin}
        onSuccess={handlePinSuccess}
        onClose={() => { setShowPin(false); setPinTarget(null); }}
      />
    </div>
  );
}
