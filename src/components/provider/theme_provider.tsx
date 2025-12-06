import { createContext, useContext, useEffect, useRef, useState } from "react";
import { get_settings_store } from "@/lib/store";

type Theme = "dark" | "light" | "system";
type ThemeProviderState = {
    theme: Theme;
    apply_theme: (theme: Theme) => void;
};

const DARK_THEME = "dark";
const LIGHT_THEME = "light";
const SYSTEM_THEME = "system";
const SETTINGS_KEY = "theme";
const ThemeProviderContext = createContext<ThemeProviderState | null>(null);

export function use_theme_context(): ThemeProviderState {
    const context = useContext(ThemeProviderContext);
    if (!context) throw new Error("use_theme_context must be used within a ThemeProvider");
    return context;
}

export function ThemeProvider({ children, ...props }: { children: React.ReactNode }) {
    const [theme, set_theme] = useState<Theme | null>(null);
    const is_first_render = useRef(true);

    useEffect(() => {
        init_theme();
    }, []);

    useEffect(() => {
        if (!theme) return;
        const root = window.document.documentElement;

        if (is_first_render.current) {
            is_first_render.current = false;
        } else {
            root.classList.add("theme-transition");
        }

        root.classList.remove("light", "dark");

        if (theme === SYSTEM_THEME) {
            const system_theme = window.matchMedia("(prefers-color-scheme: dark)").matches
                ? DARK_THEME
                : LIGHT_THEME;
            root.classList.add(system_theme);
        } else {
            root.classList.add(theme);
        }

        const timeout = setTimeout(() => {
            root.classList.remove("theme-transition");
        }, 500);

        return () => clearTimeout(timeout);
    }, [theme]);

    // prevent theme flashing
    if (!theme) return;

    return (
        <ThemeProviderContext.Provider {...props} value={{ theme, apply_theme }}>
            {children}
        </ThemeProviderContext.Provider>
    );

    async function apply_theme(new_theme: Theme) {
        set_theme(new_theme);
        const store = await get_settings_store();
        await store.set(SETTINGS_KEY, new_theme);
    }

    async function init_theme(): Promise<void> {
        const store = await get_settings_store();
        const saved_theme = await store.get<Theme>(SETTINGS_KEY);
        if (!saved_theme) throw new Error("Theme not found in store");
        set_theme(saved_theme);
    }
}
