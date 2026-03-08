import { useEffect, useState } from "react";

const THEME_KEY = "cssbattle-targets.theme";

export const THEME_OPTIONS = {
  system: "system",
  light: "light",
  dark: "dark"
};

function resolveTheme(mode) {
  if (mode === THEME_OPTIONS.dark) {
    return "dark";
  }

  if (mode === THEME_OPTIONS.light) {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function parseStoredTheme(value) {
  if (value === THEME_OPTIONS.dark || value === THEME_OPTIONS.light || value === THEME_OPTIONS.system) {
    return value;
  }

  return THEME_OPTIONS.system;
}

export function useTheme() {
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window === "undefined") {
      return THEME_OPTIONS.system;
    }

    return parseStoredTheme(window.localStorage.getItem(THEME_KEY));
  });

  useEffect(() => {
    const applyTheme = () => {
      document.documentElement.setAttribute("data-theme", resolveTheme(themeMode));
    };

    applyTheme();
    window.localStorage.setItem(THEME_KEY, themeMode);

    if (themeMode !== THEME_OPTIONS.system) {
      return undefined;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", applyTheme);
      return () => {
        mediaQuery.removeEventListener("change", applyTheme);
      };
    }

    mediaQuery.addListener(applyTheme);
    return () => {
      mediaQuery.removeListener(applyTheme);
    };
  }, [themeMode]);

  return [themeMode, setThemeMode];
}