import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PinDialog } from "@/components/dashboard/PinDialog";
import { AIChat } from "@/components/dashboard/AIChat";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, Calendar, Calculator, UserCircle,
  CheckSquare, TrendingUp, Brain, Settings, GripVertical,
  Bell, LogOut, ChevronRight, MessagesSquare, Trophy,
} from "lucide-react";

// Tab imports (we'll add these as we build them)
import { OverviewTab } from "@/components/dashboard/tabs/OverviewTab";
import { ClientsTab } from "@/components/dashboard/tabs/ClientsTab";
import { CalendarTab } from "@/components/dashboard/tabs/CalendarTab";
import { ROITab } from "@/components/dashboard/tabs/ROITab";
import { ClientCenterTab } from "@/components/dashboard/tabs/ClientCenterTab";
import { DailyTasksTab } from "@/components/dashboard/tabs/DailyTasksTab";
import { RevenueTab } from "@/components/dashboard/tabs/RevenueTab";
import { AdvisorsTab } from "@/components/dashboard/tabs/AdvisorsTab";
import { SettingsTab } from "@/components/dashboard/tabs/SettingsTab";
import { TeamTab } from "@/components/dashboard/tabs/TeamTab";
import { KpiTab } from "@/components/dashboard/tabs/KpiTab";

const DEFAULT_SIDEBAR_ITEMS = [
  { id: "overview",  label: "Dashboard",          icon: LayoutDashboard, protected: false },
  { id: "clients",   label: "Client Management",  icon: Users,           protected: true  },
  { id: "calendar",  label: "Calendar",           icon: Calendar,        protected: false },
  { id: "roi",       label: "ROI Calculator",     icon: Calculator,      protected: false },
  { id: "center",    label: "Client Center",      icon: UserCircle,      protected: false },
  { id: "tasks",     label: "Tâches du Jour",     icon: CheckSquare,     protected: false },
  { id: "revenue",   label: "Revenue & Growth",   icon: TrendingUp,      protected: true  },
  { id: "advisors",  label: "Marketing Advisors", icon: Brain,           protected: false },
  { id: "team",      label: "Équipe & Canaux",    icon: MessagesSquare,  protected: false },
  { id: "kpi",       label: "KPI Équipe",         icon: Trophy,          protected: true  },
  { id: "settings",  label: "Settings",           icon: Settings,        protected: false },
];

type TabId = typeof DEFAULT_SIDEBAR_ITEMS[number]["id"];

export default function Dashboard() {
  const navigate = useNavigate();

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
    if (item.protected && !unlockedSections.has(item.id)) {
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
    .filter(Boolean) as typeof DEFAULT_SIDEBAR_ITEMS;

  const renderTab = () => {
    switch (activeTab) {
      case "overview":  return <OverviewTab />;
      case "clients":   return <ClientsTab />;
      case "calendar":  return <CalendarTab />;
      case "roi":       return <ROITab />;
      case "center":    return <ClientCenterTab />;
      case "tasks":     return <DailyTasksTab />;
      case "revenue":   return <RevenueTab />;
      case "advisors":  return <AdvisorsTab />;
      case "team":      return <TeamTab />;
      case "kpi":       return <KpiTab />;
      case "settings":  return <SettingsTab />;
      default:          return <OverviewTab />;
    }
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-sidebar-border bg-sidebar">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
          <img src="/echo-avatar.png" alt="Echo" className="w-8 h-8 rounded-lg object-cover" />
          <span className="font-bold text-sidebar-foreground">Echo</span>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {orderedItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isProtected = item.protected && !unlockedSections.has(item.id);

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
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 flex-shrink-0 cursor-grab" />
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {isProtected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-sidebar-accent/50">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-primary text-xs font-bold">
                {userEmail.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-sidebar-foreground truncate">{userEmail || "User"}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-background/80 backdrop-blur-sm flex-shrink-0">
          <h1 className="text-lg font-semibold text-foreground capitalize">
            {orderedItems.find((i) => i.id === activeTab)?.label || "Dashboard"}
          </h1>
          <div className="flex items-center gap-2">
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
          {activeTab === "team"
            ? <div className="h-full">{renderTab()}</div>
            : <div className="h-full overflow-y-auto">{renderTab()}</div>
          }
        </main>
      </div>

      {/* AI Chat */}
      <AIChat />

      {/* PIN dialog */}
      <PinDialog
        open={showPin}
        onSuccess={handlePinSuccess}
        onClose={() => { setShowPin(false); setPinTarget(null); }}
      />
    </div>
  );
}
