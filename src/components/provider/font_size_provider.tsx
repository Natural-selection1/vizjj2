import { createContext, useContext, useEffect, useState } from "react";
import { get_settings_store } from "@/lib/store";

type FontSizeProviderState = {
    font_size: number;
    row_height: number;
    col_width: number;
    padding_left: number;
    apply_font_size: (size: number) => void;
};

const SETTINGS_KEY = "font_size";
const FontSizeContext = createContext<FontSizeProviderState | null>(null);

export function use_font_size_context() {
    const context = useContext(FontSizeContext);
    if (!context) throw new Error("use_font_size_context must be used within a FontSizeProvider");
    return context;
}

export function FontSizeProvider({ children, ...props }: { children: React.ReactNode }) {
    const [font_size, set_font_size] = useState<number | null>(null);

    useEffect(() => {
        init_font_size();
    }, []);

    useEffect(() => {
        if (!font_size) return;
        const root = window.document.documentElement;
        root.style.fontSize = `${font_size}px`;
    }, [font_size]);

    // prevent font size flashing
    if (!font_size) return;

    const row_height = Math.round(font_size * 2);
    const col_width = Math.round(font_size * 1.2);
    const padding_left = Math.round(font_size * 0.6);

    return (
        <FontSizeContext.Provider
            {...props}
            value={{ font_size, row_height, col_width, padding_left, apply_font_size }}>
            {children}
        </FontSizeContext.Provider>
    );

    async function apply_font_size(new_size: number) {
        set_font_size(new_size);
        const store = await get_settings_store();
        await store.set(SETTINGS_KEY, new_size);
    }

    async function init_font_size() {
        const store = await get_settings_store();
        const saved_font_size = await store.get<number>(SETTINGS_KEY);
        if (!saved_font_size) throw new Error("Font size not found in store");
        set_font_size(saved_font_size);
    }
}
