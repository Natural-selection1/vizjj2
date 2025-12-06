import { invoke } from "@tauri-apps/api/core";
import type { Commit } from "../bindings/Commit";

export async function get_commits(cwd: string): Promise<Commit[]> {
    return invoke("get_commits", { cwd });
}
