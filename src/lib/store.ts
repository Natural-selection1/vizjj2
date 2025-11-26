import { Store } from "@tauri-apps/plugin-store";

const STORE_PATH = "vizjj-settings.json";

let store: Store | null = null;

/**
 * 获取设置 Store 的实例
 * 如果尚未加载，则进行加载
 */
export async function getSettingsStore(): Promise<Store> {
    if (store) {
        return store;
    }

    store = await Store.load(STORE_PATH);
    return store;
}
