import {
  LayoutDashboard, Users, UserCircle, TrendingUp, Brain, Settings,
  MessagesSquare, Trophy, Presentation, BarChart3, MapPin, Clapperboard,
} from "lucide-react";

// Onglets du dashboard — partagé entre la sidebar et le choix des accès employés.
export const DEFAULT_SIDEBAR_ITEMS = [
  { id: "overview",  label: "Dashboard",          icon: LayoutDashboard, protected: false },
  { id: "clients",   label: "Client Management",  icon: Users,           protected: true  },
  { id: "secteurs",  label: "Secteurs",           icon: MapPin,          protected: false },
  { id: "equipes_tournage", label: "Équipes de tournage", icon: Clapperboard, protected: false },
  { id: "center",    label: "Client Center",      icon: UserCircle,      protected: false },
  { id: "revenue",   label: "Revenue & Growth",   icon: TrendingUp,      protected: true  },
  { id: "advisors",  label: "Marketing Advisors", icon: Brain,           protected: false },
  { id: "soumissions", label: "Soumissions",      icon: Presentation,    protected: false },
  { id: "team",      label: "Équipe & Canaux",    icon: MessagesSquare,  protected: false },
  { id: "kpi",       label: "KPI Équipe",         icon: Trophy,          protected: true  },
  { id: "resultats", label: "Résultats",          icon: BarChart3,       protected: false },
  { id: "settings",  label: "Settings",           icon: Settings,        protected: false },
];

// Onglets qu'on peut ouvrir à un employé (Settings reste réservé au propriétaire).
export const EMPLOYEE_TAB_OPTIONS = DEFAULT_SIDEBAR_ITEMS.filter((t) => t.id !== "settings");
