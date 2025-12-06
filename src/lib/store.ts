import { Store, getStore } from "@tauri-apps/plugin-store";

const STORE_PATH = "vizjj-settings.json";

export async function get_settings_store(): Promise<Store> {
    // !SAFETY: we have already load it in lib.rs
    const store = await getStore(STORE_PATH);
    if (!store) throw new Error("Settings store not found");
    return store;
}
