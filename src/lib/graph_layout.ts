import type { Commit } from "../bindings/Commit";

export interface GraphRow {
    commit: Commit;
    column: number;
    has_child: boolean; // 如果有连线从上方（子节点）连接，则为 true
    paths: { from: number; to: number; type: "straight" | "merge" | "fork" }[];
}

export function compute_graph_layout(commits: Commit[]): GraphRow[] {
    const rows: GraphRow[] = [];
    const lanes: (string | null)[] = []; // lanes[col] 存储此列预期的父 commit_id

    for (const commit of commits) {
        // 1. 为当前 commit 分配列
        const existing_col = lanes.indexOf(commit.commit_id);
        const has_child = existing_col !== -1;

        let column = existing_col;

        if (column === -1) {
            // 新的分支头（还没有子节点处理期望此父节点）
            column = lanes.indexOf(null);
            if (column === -1) {
                column = lanes.length;
                lanes.push(null);
            }
        }

        // 2. 清除当前列的占用，因为我们正在处理填充该列的 commit
        lanes[column] = null;

        const paths: {
            from: number;
            to: number;
            type: "straight" | "merge" | "fork";
        }[] = [];

        // 3. 为其他活跃的通道绘制竖直线（贯穿）
        for (let i = 0; i < lanes.length; i++) {
            if (lanes[i] !== null) {
                paths.push({
                    from: i,
                    to: i,
                    type: "straight",
                });
            }
        }

        // 4. 处理父节点
        // 遍历父节点，将它们分配到未来行的通道
        commit.parents.forEach((parentId, index) => {
            // 检查父节点是否已经在一个通道中被追踪（比如 merge 的父节点已经通过其他子节点遇到过）
            let parent_col = lanes.indexOf(parentId);

            if (parent_col !== -1) {
                // 父节点已经分配到某一列，连接到该列
                paths.push({
                    from: column,
                    to: parent_col,
                    type: "merge",
                });
            } else {
                // 父节点尚未被追踪，分配一个列
                // 优先顺序：第一个父节点获得当前列（竖直线）
                if (index === 0 && lanes[column] === null) {
                    parent_col = column;
                } else {
                    // 查找第一个空槽
                    parent_col = lanes.indexOf(null);
                    if (parent_col === -1) {
                        parent_col = lanes.length;
                        lanes.push(null);
                    }
                }

                lanes[parent_col] = parentId;

                // 添加路径
                if (parent_col === column) {
                    paths.push({
                        from: column,
                        to: parent_col,
                        type: "straight",
                    });
                } else {
                    paths.push({
                        from: column,
                        to: parent_col,
                        type: "fork",
                    });
                }
            }
        });

        rows.push({
            commit,
            column,
            has_child,
            paths,
        });
    }

    return rows;
}
