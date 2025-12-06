import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarSeparator,
    MenubarTrigger,
} from "@/components/ui/menubar";
import { useTranslation } from "react-i18next";
import { info, error } from "@tauri-apps/plugin-log";
import { use_theme_context } from "./provider/theme_provider";
import { open } from "@tauri-apps/plugin-dialog";
import { get_settings_store } from "../lib/store";

export default function AppMenu() {
    const { t } = useTranslation();
    const { theme, apply_theme } = use_theme_context();

    return (
        <div className="flex h-full items-center no-drag">
            <Menubar className="border-none shadow-none bg-transparent h-auto p-0 space-x-1">
                {/* Repo Menu */}
                <MenubarMenu>
                    <MenubarTrigger>{t("menu.repo.label")}</MenubarTrigger>
                    <MenubarContent>
                        <MenubarItem onClick={() => log_action("Clone Repo")}>
                            {t("menu.repo.clone")}
                        </MenubarItem>
                        <MenubarItem onClick={() => log_action("Init Repo")}>
                            {t("menu.repo.init")}
                        </MenubarItem>
                        <MenubarItem onClick={open_repo}>{t("menu.repo.open")}</MenubarItem>
                        <MenubarItem onClick={() => log_action("Open Repo In Editor")}>
                            {t("menu.repo.openInEditor")}
                        </MenubarItem>
                        <MenubarItem onClick={() => log_action("Open Repo In File Explorer")}>
                            {t("menu.repo.openInFileExplorer")}
                        </MenubarItem>
                        <MenubarItem onClick={() => log_action("Open Terminal In Repo Path")}>
                            {t("menu.repo.openTerminal")}
                        </MenubarItem>
                    </MenubarContent>
                </MenubarMenu>

                {/* Help Menu */}
                <MenubarMenu>
                    <MenubarTrigger>{t("menu.help.label")}</MenubarTrigger>
                    <MenubarContent>
                        <MenubarItem onClick={() => log_action("Preferences")}>
                            {t("menu.help.preferences")}
                        </MenubarItem>
                        <MenubarItem onClick={() => toggle_theme()}>
                            {t("menu.help.switchTheme")}
                        </MenubarItem>
                        <MenubarItem onClick={() => log_action("Check For Updates")}>
                            {t("menu.help.checkUpdates")}
                        </MenubarItem>
                        <MenubarItem onClick={() => log_action("Report Issue")}>
                            {t("menu.help.reportIssue")}
                        </MenubarItem>
                        <MenubarItem onClick={() => log_action("View Log")}>
                            {t("menu.help.viewLog")}
                        </MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem onClick={() => log_action("About")}>
                            {t("menu.help.about")}
                        </MenubarItem>
                        <MenubarItem onClick={() => log_action("Documentation")}>
                            {t("menu.help.documentation")}
                        </MenubarItem>
                        <MenubarItem onClick={() => log_action("Follow Us On GitHub")}>
                            {t("menu.help.followUs")}
                        </MenubarItem>
                    </MenubarContent>
                </MenubarMenu>
            </Menubar>
        </div>
    );

    function toggle_theme() {
        if (theme === "system") {
            const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            apply_theme(isDark ? "light" : "dark");
        } else if (theme === "dark") {
            apply_theme("light");
        } else {
            apply_theme("dark");
        }
    }

    async function open_repo() {
        log_action("Open Repo");
        try {
            const selected = await open({
                directory: true,
                multiple: false,
            });

            if (selected) {
                const store = await get_settings_store();
                await store.set("repo_path", selected);
                info(`Repo path updated to: ${selected}`);
            }
        } catch (err) {
            error(`Failed to open repo dialog: ${err}`);
        }
    }

    function log_action(action: string) {
        info(`Menu action triggered: ${action}`);
    }
}
