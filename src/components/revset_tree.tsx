import React from "react";
import { GraphRow } from "../lib/graph_layout";
import { cn } from "../lib/utils";

// Dimensions are now passed as props to support dynamic sizing
type RevsetGraphProps = {
    row: GraphRow;
    row_height: number;
    col_width: number;
    padding_left: number;
};

export const RevsetGraph = React.memo(RevsetGraph_);

function RevsetGraph_({ row, row_height, col_width, padding_left }: RevsetGraphProps) {
    // Calculate width based on max path index + current column
    const max_index = Math.max(...row.paths.map((p) => Math.max(p.from, p.to)), row.column);
    const width = (max_index + 1) * col_width;

    // Scale stroke width with row height (e.g., base 2px for ~30px row)
    const stroke_width = Math.max(2, row_height / 15);

    return (
        <svg
            className="absolute top-0 left-0 h-full pointer-events-none"
            style={{ width: Math.max(width, 100) }}>
            {/* Draw paths */}
            {row.paths.map((path, i) => {
                const x1 = path.from * col_width + padding_left;
                const x2 = path.to * col_width + padding_left;
                let d: string;

                if (path.type === "straight" || path.from === path.to) {
                    // Straight vertical line or passthrough
                    d = `
                        M ${x1},
                        0 L ${x2},
                        ${row_height}
                        `;
                } else if (path.from === row.column) {
                    // Start from node column: horizontal curve (e.g. merge/fork from node)
                    d = `
                        M ${x1},
                        ${row_height / 2} C ${x1},
                        ${row_height} ${x2},
                        ${row_height / 2} ${x2},
                        ${row_height}
                        `;
                } else {
                    // Fallback for more complex curves (e.g. merge/fork not starting at node col)
                    d = `
                        M ${x1},
                        0 C ${x1},
                        ${row_height / 2} ${x2},
                        ${row_height / 2} ${x2},
                        ${row_height}
                        `;
                }

                return (
                    <path
                        key={i}
                        d={d}
                        strokeWidth={stroke_width}
                        fill="none"
                        className="stroke-muted-foreground opacity-50"
                    />
                );
            })}

            {/* Incoming line to Node */}
            {row.has_child && (
                <line
                    x1={row.column * col_width + padding_left}
                    y1={0}
                    x2={row.column * col_width + padding_left}
                    y2={row_height / 2}
                    strokeWidth={stroke_width}
                    className="stroke-muted-foreground opacity-50"
                />
            )}

            {/* Node Symbol */}
            {(() => {
                const cx = row.column * col_width + padding_left;
                const cy = row_height / 2;
                let symbol: string;
                let className: string;

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
                const symbol_size = Math.max(12, Math.floor(row_height * 0.66));

                return (
                    <text
                        x={cx}
                        y={cy}
                        dominantBaseline="central"
                        textAnchor="middle"
                        className={cn(className)}
                        style={{ fontSize: `${symbol_size}px` }}>
                        {symbol}
                    </text>
                );
            })()}
        </svg>
    );
}
