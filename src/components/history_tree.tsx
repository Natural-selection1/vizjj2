import React from "react";
import { GraphRow } from "../lib/graph_layout";
import { cn } from "../lib/utils";

// Dimensions are now passed as props to support dynamic sizing
type HistoryTreeProps = {
    row: GraphRow;
    rowHeight: number;
    colWidth: number;
    paddingLeft: number;
};

export const HistoryTree = React.memo(
    ({ row, rowHeight, colWidth, paddingLeft }: HistoryTreeProps) => {
        // Calculate width based on max path index + current column
        const maxIndex = Math.max(...row.paths.map((p) => Math.max(p.from, p.to)), row.column);
        const width = (maxIndex + 1) * colWidth;

        // Scale stroke width with row height (e.g., base 2px for ~30px row)
        const strokeWidth = Math.max(2, rowHeight / 15);

        return (
            <svg
                className="absolute top-0 left-0 h-full pointer-events-none"
                style={{ width: Math.max(width, 100) }}>
                {/* Draw paths */}
                {row.paths.map((path, i) => {
                    const x1 = path.from * colWidth + paddingLeft;
                    const x2 = path.to * colWidth + paddingLeft;

                    let d = "";
                    if (path.type === "straight") {
                        d = `M ${x1},0 L ${x2},${rowHeight}`;
                    } else {
                        if (path.from === row.column) {
                            d = `M ${x1},${rowHeight / 2} C ${x1},${rowHeight} ${x2},${
                                rowHeight / 2
                            } ${x2},${rowHeight}`;
                        } else {
                            // Pass through / Fork / Merge curve logic
                            if (path.from === path.to) {
                                d = `M ${x1},0 L ${x2},${rowHeight}`;
                            } else {
                                // Fallback for complex curves not strictly defined in simplified logic
                                // This is a simplified cubic bezier for merge/fork
                                d = `M ${x1},0 C ${x1},${rowHeight / 2} ${x2},${
                                    rowHeight / 2
                                } ${x2},${rowHeight}`;
                            }
                        }
                    }

                    return (
                        <path
                            key={i}
                            d={d}
                            strokeWidth={strokeWidth}
                            fill="none"
                            className="stroke-muted-foreground opacity-50"
                        />
                    );
                })}

                {/* Incoming line to Node */}
                {row.hasChild && (
                    <line
                        x1={row.column * colWidth + paddingLeft}
                        y1={0}
                        x2={row.column * colWidth + paddingLeft}
                        y2={rowHeight / 2}
                        strokeWidth={strokeWidth}
                        className="stroke-muted-foreground opacity-50"
                    />
                )}

                {/* Node Symbol */}
                {(() => {
                    const cx = row.column * colWidth + paddingLeft;
                    const cy = rowHeight / 2;

                    let symbol = "○";
                    let className = "text-muted-foreground fill-current";

                    if (row.commit.is_working_copy) {
                        symbol = "@";
                        className = "text-green-500 fill-current";
                    } else if (row.commit.is_immutable) {
                        symbol = "◆";
                        className = "text-cyan-500 fill-current";
                    } else {
                        // Mutable
                        symbol = "○";
                        className = "text-foreground fill-current";
                    }

                    // Scale font size of the symbol slightly with the row height?
                    // Default was 20px (when row height was 30). Ratio 2/3.
                    // Let's make it dynamic: rowHeight * 0.66
                    const symbolSize = Math.max(12, Math.floor(rowHeight * 0.66));

                    return (
                        <text
                            x={cx}
                            y={cy}
                            dominantBaseline="central"
                            textAnchor="middle"
                            className={cn(className)}
                            style={{ fontSize: `${symbolSize}px` }}>
                            {symbol}
                        </text>
                    );
                })()}
            </svg>
        );
    }
);
