import { createContext, useContext, useEffect, useState } from "react";
import { getSettingsStore } from "@/lib/store";

type FontSizeProviderProps = {
    children: React.ReactNode;
    defaultFontSize?: number;
    storageKey?: string;
};

type FontSizeProviderState = {
    fontSize: number;
    rowHeight: number;
    colWidth: number;
    paddingLeft: number;
    setFontSize: (size: number) => void;
};

// Initial state with defaults based on 16px
const initialState: FontSizeProviderState = {
    fontSize: 18,
    rowHeight: 32,
    colWidth: 22,
    paddingLeft: 11,
    setFontSize: () => null,
};

const FontSizeContext = createContext<FontSizeProviderState>(initialState);

export function FontSizeProvider({
    children,
    defaultFontSize = 18,
    storageKey = "font_size",
    ...props
}: FontSizeProviderProps) {
    const [fontSize, setFontSizeState] = useState<number | null>(null);

    useEffect(() => {
        async function initFontSize() {
            try {
                const store = await getSettingsStore();
                const savedSize = await store.get<number>(storageKey);

                if (savedSize) {
                    setFontSizeState(savedSize);
                } else {
                    setFontSizeState(defaultFontSize);
                }
            } catch (error) {
                console.error("Failed to load font size from store:", error);
                setFontSizeState(defaultFontSize);
            }
        }
        initFontSize();
    }, [defaultFontSize, storageKey]);

    useEffect(() => {
        if (!fontSize) return;

        const root = window.document.documentElement;
        root.style.fontSize = `${fontSize}px`;

        // We can also potentially save to store here if it changed and wasn't just loaded
    }, [fontSize]);

    const setFontSize = async (newSize: number) => {
        setFontSizeState(newSize);
        try {
            const store = await getSettingsStore();
            await store.set(storageKey, newSize);
        } catch (error) {
            console.error("Failed to save font size to store:", error);
        }
    };

    // Calculate derived metrics
    // Using ratios based on original design (approx 30/16, 20/16)
    // Adjusting slightly to fit the requested default of 18 being standard
    // Original: 30px height for text-sm (14px). Ratio ~2.14.
    // Let's use 1.8 multiplier for height relative to font size (e.g. 18px -> 32px)
    const currentSize = fontSize || defaultFontSize;

    // We want the row height to be comfortable.
    // If fontSize is 18px, text height is ~18px (plus line-height).
    // Let's try multiplier 1.8 -> 32.4
    const rowHeight = Math.round(currentSize * 2);
    const colWidth = Math.round(currentSize * 1.2);
    const paddingLeft = Math.round(currentSize * 0.6);

    const value = {
        fontSize: currentSize,
        rowHeight,
        colWidth,
        paddingLeft,
        setFontSize,
    };

    if (fontSize === null) {
        // Optionally return null or a loading state, or just render with default
        // Returning children with default prevents flash if default is correct
        // But might cause flash if stored is different.
        // ThemeProvider returned null. Let's return null to be safe?
        // But that delays startup.
        // Since we have a default (18), maybe just render.
        // But if saved is 24, we flash 18 then 24.
        // Let's return null.
        return null;
    }

    return (
        <FontSizeContext.Provider {...props} value={value}>
            {children}
        </FontSizeContext.Provider>
    );
}

export function useFontSize() {
    const context = useContext(FontSizeContext);

    if (context === undefined)
        throw new Error("useFontSize must be used within a FontSizeProvider");

    return context;
}
