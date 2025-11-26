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
import { useTheme } from "./theme_provider";
import { open } from "@tauri-apps/plugin-dialog";
import { getSettingsStore } from "../lib/store";

export default function AppMenu() {
    const { t } = useTranslation();
    const { theme, setTheme } = useTheme();

    const logAction = (action: string) => {
        info(`Menu action triggered: ${action}`);
    };

    const handleOpenRepo = async () => {
        logAction("Open Repo");
        try {
            const selected = await open({
                directory: true,
                multiple: false,
            });

            if (selected) {
                const store = await getSettingsStore();
                await store.set("repo_path", selected);
                info(`Repo path updated to: ${selected}`);
            }
        } catch (err) {
            error(`Failed to open repo dialog: ${err}`);
        }
    };

    const handleThemeToggle = () => {
        if (theme === "system") {
            const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            setTheme(isDark ? "light" : "dark");
        } else if (theme === "dark") {
            setTheme("light");
        } else {
            setTheme("dark");
        }
    };

    return (
        <div className="flex h-full items-center no-drag">
            {/* Repo Menu */}
            <Menubar className="border-none shadow-none bg-transparent h-auto p-0 space-x-1">
                <MenubarMenu>
                    <MenubarTrigger>{t("menu.repo.label")}</MenubarTrigger>
                    <MenubarContent>
                        <MenubarItem onClick={() => logAction("Clone Repo")}>
                            {t("menu.repo.clone")}
                        </MenubarItem>
                        <MenubarItem onClick={() => logAction("Init Repo")}>
                            {t("menu.repo.init")}
                        </MenubarItem>
                        <MenubarItem onClick={handleOpenRepo}>{t("menu.repo.open")}</MenubarItem>
                        <MenubarItem onClick={() => logAction("Open Repo In Editor")}>
                            {t("menu.repo.openInEditor")}
                        </MenubarItem>
                        <MenubarItem onClick={() => logAction("Open Repo In File Explorer")}>
                            {t("menu.repo.openInFileExplorer")}
                        </MenubarItem>
                        <MenubarItem onClick={() => logAction("Open Terminal In Repo Path")}>
                            {t("menu.repo.openTerminal")}
                        </MenubarItem>
                    </MenubarContent>
                </MenubarMenu>

                {/* Help Menu */}
                <MenubarMenu>
                    <MenubarTrigger>{t("menu.help.label")}</MenubarTrigger>
                    <MenubarContent>
                        <MenubarItem onClick={() => logAction("Preferences")}>
                            {t("menu.help.preferences")}
                        </MenubarItem>
                        <MenubarItem onClick={() => handleThemeToggle()}>
                            {t("menu.help.switchTheme")}
                        </MenubarItem>
                        <MenubarItem onClick={() => logAction("Check For Updates")}>
                            {t("menu.help.checkUpdates")}
                        </MenubarItem>
                        <MenubarItem onClick={() => logAction("Report Issue")}>
                            {t("menu.help.reportIssue")}
                        </MenubarItem>
                        <MenubarItem onClick={() => logAction("View Log")}>
                            {t("menu.help.viewLog")}
                        </MenubarItem>
                        <MenubarSeparator />
                        <MenubarItem onClick={() => logAction("About")}>
                            {t("menu.help.about")}
                        </MenubarItem>
                        <MenubarItem onClick={() => logAction("Documentation")}>
                            {t("menu.help.documentation")}
                        </MenubarItem>
                        <MenubarItem onClick={() => logAction("Follow Us On GitHub")}>
                            {t("menu.help.followUs")}
                        </MenubarItem>
                    </MenubarContent>
                </MenubarMenu>
            </Menubar>
        </div>
    );
}
