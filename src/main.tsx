import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./components/provider/theme_provider";
import { FontSizeProvider } from "./components/provider/font_size_provider";
import "./i18n";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <ThemeProvider>
            <FontSizeProvider>
                <App />
            </FontSizeProvider>
        </ThemeProvider>
    </React.StrictMode>
);
