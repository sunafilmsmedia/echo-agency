import { Button } from "@/components/ui/button";

interface NavigationProps {
  onLoginClick: () => void;
}

export function Navigation({ onLoginClick }: NavigationProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-border/30 bg-background/80 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/40 flex items-center justify-center">
          <span className="text-primary font-bold text-sm">E</span>
        </div>
        <span className="font-bold text-lg text-foreground">Echo</span>
      </div>

      <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
        <a href="#benefits" className="hover:text-foreground transition-colors">Solutions</a>
        <a href="#benefits" className="hover:text-foreground transition-colors">Prix</a>
        <a href="#benefits" className="hover:text-foreground transition-colors">À propos</a>
      </div>

      <Button onClick={onLoginClick} size="sm" className="shadow-glow">
        Se connecter
      </Button>
    </nav>
  );
}
