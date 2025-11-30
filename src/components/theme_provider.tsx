import { createContext, useContext, useEffect, useRef, useState } from "react";
import { getSettingsStore } from "@/lib/store";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
};

type ThemeProviderState = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
};

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "theme",
    ...props
}: ThemeProviderProps) {
    // 使用 null 表示初始加载状态
    const [theme, setThemeState] = useState<Theme | null>(null);

    // 使用 ref 跟踪是否为首次渲染
    const isFirstRender = useRef(true);

    // 初始化加载
    useEffect(() => {
        async function initTheme() {
            try {
                const store = await getSettingsStore();
                const savedTheme = await store.get<Theme>(storageKey);

                if (savedTheme) {
                    setThemeState(savedTheme);
                } else {
                    setThemeState(defaultTheme);
                }
            } catch (error) {
                console.error("Failed to load theme from store:", error);
                setThemeState(defaultTheme);
            }
        }
        initTheme();
    }, [defaultTheme, storageKey]);

    useEffect(() => {
        if (!theme) return; // 还在加载中，不执行副作用

        const root = window.document.documentElement;

        // 如果是首次渲染，不添加过渡动画类，避免加载时的动画
        if (isFirstRender.current) {
            isFirstRender.current = false;
        } else {
            root.classList.add("theme-transition");
        }

        root.classList.remove("light", "dark");

        if (theme === "system") {
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";

            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }

        const timeout = setTimeout(() => {
            root.classList.remove("theme-transition");
        }, 500);

        return () => clearTimeout(timeout);
    }, [theme]);

    const setTheme = async (newTheme: Theme) => {
        setThemeState(newTheme);

        try {
            const store = await getSettingsStore();
            await store.set(storageKey, newTheme);
        } catch (error) {
            console.error("Failed to save theme to store:", error);
        }
    };

    const value = {
        theme: theme || defaultTheme,
        setTheme,
    };

    // 阻止闪烁：如果 theme 还是 null，说明还没读取完配置，暂不渲染
    if (theme === null) {
        return null;
    }

    return (
        <ThemeProviderContext.Provider {...props} value={value}>
            {children}
        </ThemeProviderContext.Provider>
    );
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined) throw new Error("useTheme must be used within a ThemeProvider");

    return context;
};
