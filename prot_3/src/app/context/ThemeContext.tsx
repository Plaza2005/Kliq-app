import { createContext, useContext, useEffect, useState } from "react";

type ThemeMode = "dark" | "light" | "system";

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  effective: "dark" | "light";
}

const ThemeContext = createContext<ThemeContextType>({
  mode: "dark",
  setMode: () => {},
  effective: "dark",
});

function getEffective(m: ThemeMode): "dark" | "light" {
  if (m === "system") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return m;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem("kliq_theme") as ThemeMode) ?? "dark";
  });
  const [effective, setEffective] = useState<"dark" | "light">(() => getEffective(
    (localStorage.getItem("kliq_theme") as ThemeMode) ?? "dark"
  ));

  const applyTheme = (eff: "dark" | "light") => {
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(eff);
    setEffective(eff);
  };

  const setMode = (m: ThemeMode) => {
    localStorage.setItem("kliq_theme", m);
    setModeState(m);
    applyTheme(getEffective(m));
  };

  useEffect(() => {
    applyTheme(getEffective(mode));
  }, []);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => applyTheme(mq.matches ? "light" : "dark");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [mode]);

  return (
    <ThemeContext.Provider value={{ mode, setMode, effective }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
