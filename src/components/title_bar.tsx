import { Window } from "@tauri-apps/api/window";
import { Maximize, Minimize, X } from "lucide-react";
import "./title_bar.css";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useTranslation } from "react-i18next";
import AppMenu from "./app_menu";

export default function TitleBar() {
    const appWindow = new Window("main");
    const { t } = useTranslation();

    return (
        <div data-tauri-drag-region className="titlebar">
            {/* Left: Application Menu */}
            <div className="titlebar-menu">
                <AppMenu />
            </div>
            {/* Right: Window Controls */}
            <div className="titlebar-buttons">
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            className="titlebar-button"
                            onClick={() => {
                                appWindow.minimize();
                            }}>
                            <Minimize />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{t("window.minimize")}</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            className="titlebar-button"
                            onClick={() => {
                                appWindow.toggleMaximize();
                            }}>
                            <Maximize />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{t("window.maximize")}</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            className="titlebar-button"
                            id="close"
                            onClick={() => {
                                appWindow.close();
                            }}>
                            <X />
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{t("window.close")}</p>
                    </TooltipContent>
                </Tooltip>
            </div>
        </div>
    );
}
