import type { Commit } from "../ts_rs_bindings/Commit";

export interface GraphRow {
    commit: Commit;
    column: number;
    hasChild: boolean; // True if a line connects from above (child)
    paths: { from: number; to: number; color: string; type: "straight" | "merge" | "fork" }[];
    laneColors: string[];
}

const COLORS = [
    "#ef4444", // Red-500
    "#22c55e", // Green-500
    "#3b82f6", // Blue-500
    "#f97316", // Orange-500
    "#a855f7", // Purple-500
    "#ec4899", // Pink-500
    "#06b6d4", // Cyan-500
    "#eab308", // Yellow-500
];

export function computeGraphLayout(commits: Commit[]): GraphRow[] {
    const rows: GraphRow[] = [];
    const lanes: (string | null)[] = []; // lanes[col] stores the commit_id of the parent expected in this column

    for (const commit of commits) {
        // 1. Assign Column to the current commit
        const existingCol = lanes.indexOf(commit.commit_id);
        const hasChild = existingCol !== -1;

        let column = existingCol;

        if (column === -1) {
            // New head (no child processed yet expects this parent)
            column = lanes.indexOf(null);
            if (column === -1) {
                column = lanes.length;
                lanes.push(null);
            }
        }

        // 2. Clear current lane occupancy as we are now processing the commit that fills it
        lanes[column] = null;

        const paths: {
            from: number;
            to: number;
            color: string;
            type: "straight" | "merge" | "fork";
        }[] = [];

        // 3. Draw vertical lines for other active lanes (pass-throughs)
        for (let i = 0; i < lanes.length; i++) {
            if (lanes[i] !== null) {
                paths.push({
                    from: i,
                    to: i,
                    color: COLORS[i % COLORS.length],
                    type: "straight",
                });
            }
        }

        // 4. Process Parents
        // Iterate parents to assign them to lanes for future rows
        commit.parents.forEach((parentId, index) => {
            // Check if parent is already tracked in a lane (e.g. merge parent already seen via another child?)
            let parentCol = lanes.indexOf(parentId);

            if (parentCol !== -1) {
                // Parent already has a column allocated. Connect to it.
                paths.push({
                    from: column,
                    to: parentCol,
                    color: COLORS[parentCol % COLORS.length],
                    type: "merge",
                });
            } else {
                // Parent not yet tracked. Assign a column.
                // Priority: First parent gets the current column (straight line)
                if (index === 0 && lanes[column] === null) {
                    parentCol = column;
                } else {
                    // Find first empty slot
                    parentCol = lanes.indexOf(null);
                    if (parentCol === -1) {
                        parentCol = lanes.length;
                        lanes.push(null);
                    }
                }

                lanes[parentCol] = parentId;

                // Add path
                if (parentCol === column) {
                    paths.push({
                        from: column,
                        to: parentCol,
                        color: COLORS[parentCol % COLORS.length],
                        type: "straight",
                    });
                } else {
                    paths.push({
                        from: column,
                        to: parentCol,
                        color: COLORS[parentCol % COLORS.length],
                        type: "fork",
                    });
                }
            }
        });

        rows.push({
            commit,
            column,
            hasChild,
            paths,
            laneColors: [],
        });
    }

    return rows;
}
