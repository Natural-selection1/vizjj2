import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./components/provider/theme_provider";
import { FontSizeProvider } from "./components/provider/font_size_provider";
import "./i18n";

createRoot(document.getElementById("root") as HTMLElement).render(
    <StrictMode>
        <ThemeProvider>
            <FontSizeProvider>
                <App />
            </FontSizeProvider>
        </ThemeProvider>
    </StrictMode>
);
