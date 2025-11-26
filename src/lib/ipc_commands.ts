import { invoke } from "@tauri-apps/api/core";
import type { Commit } from "../ts_rs_bindings/Commit";

export async function getCommits(cwd: string): Promise<Commit[]> {
    return invoke("get_commits", { cwd });
}
