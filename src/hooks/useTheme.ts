import { useEffect, useState } from "react";

const THEME_KEY = "echo_theme";
export type Theme = "dark" | "light";

/** Apply the theme class to <html> (root) so all descendants inherit CSS vars. */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "light") root.classList.add("light");
  else root.classList.remove("light");
}

function readInitial(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return "dark"; // default remains dark
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readInitial);

  useEffect(() => { applyTheme(theme); }, [theme]);

  const setTheme = (t: Theme) => {
    localStorage.setItem(THEME_KEY, t);
    setThemeState(t);
  };
  const toggle = () => setTheme(theme === "dark" ? "light" : "dark");

  return { theme, setTheme, toggle };
}

/** Called once at app bootstrap (in main.tsx) to apply theme before React mounts. */
export function initTheme() {
  applyTheme(readInitial());
}
