import { useEffect, useState, useMemo } from "react";
import { useReactTable, getCoreRowModel, ColumnDef, flexRender, Row } from "@tanstack/react-table";
import { Virtuoso } from "react-virtuoso";
import {
    DndContext,
    DragOverlay,
    useDraggable,
    useDroppable,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
} from "@dnd-kit/core";
import { get_commits } from "../lib/ipc_commands";
import type { Commit } from "../bindings/Commit";
import { compute_graph_layout, GraphRow } from "../lib/graph_layout";
import { get_settings_store } from "../lib/store";
import { cn } from "../lib/utils";
import { RevsetGraph } from "./revset_tree";
import { debug } from "@tauri-apps/plugin-log";
import { use_font_size_context } from "./provider/font_size_provider";

export default function RevsetTable() {
    const { font_size, row_height, col_width, padding_left } = use_font_size_context();
    const scale = font_size / 16;
    const [repoPath, setRepoPath] = useState<string>("");
    const [commits, setCommits] = useState<Commit[]>([]);
    const [rowSelection, setRowSelection] = useState({});
    const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    // 1. Data Loading
    useEffect(() => {
        let unlisten: (() => void) | undefined;
        const initStore = async () => {
            try {
                const store = await get_settings_store();
                const storedPath = await store.get<string>("repo_path");
                if (storedPath) setRepoPath(storedPath);
                else setRepoPath(".");
                unlisten = await store.onKeyChange("repo_path", (value) => {
                    if (value) setRepoPath(value as string);
                });
            } catch (err) {
                console.error("Failed to init store", err);
                setRepoPath(".");
            }
        };
        initStore();
        return () => {
            if (unlisten) unlisten();
        };
    }, []);

    const fetchCommits = async () => {
        if (!repoPath) return;
        try {
            const data = await get_commits(repoPath);
            setCommits(data);
        } catch (e: any) {
            setCommits([]);
        }
    };

    useEffect(() => {
        fetchCommits();
    }, [repoPath]);

    // 2. Compute Layout
    const data = useMemo(() => compute_graph_layout(commits), [commits]);

    // 3. Define Columns
    const columns = useMemo<ColumnDef<GraphRow>[]>(
        () => [
            {
                id: "graph",
                header: "Graph",
                size: 200,
                minSize: 100,
                cell: ({ row }) => (
                    <div className="relative h-full w-full overflow-hidden">
                        <RevsetGraph
                            row={row.original}
                            row_height={row_height}
                            col_width={col_width}
                            padding_left={padding_left}
                        />
                    </div>
                ),
            },
            {
                accessorKey: "commit.description",
                id: "description",
                header: "Description",
                size: Math.round(400 * scale),
                cell: ({ row }) => {
                    const c = row.original.commit;
                    return (
                        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                            <span className="font-mono text-xs text-muted-foreground opacity-70">
                                {c.change_id.substring(0, 8)}
                            </span>
                            {c.bookmarks &&
                                c.bookmarks
                                    .split(" ")
                                    .map((b, i) =>
                                        b ? (
                                            <Badge
                                                key={`bm-${i}`}
                                                text={b}
                                                color="text-purple-500 border-purple-500 bg-purple-500"
                                            />
                                        ) : null
                                    )}
                            {c.tags &&
                                c.tags
                                    .split(" ")
                                    .map((t, i) =>
                                        t ? (
                                            <Badge
                                                key={`tag-${i}`}
                                                text={t}
                                                color="text-yellow-500 border-yellow-500 bg-yellow-500"
                                            />
                                        ) : null
                                    )}
                            <span title={c.description} className="truncate">
                                {c.description || (
                                    <span className="italic text-muted-foreground">
                                        No description
                                    </span>
                                )}
                            </span>
                        </div>
                    );
                },
            },
            {
                accessorKey: "commit.author_email",
                id: "author",
                header: "Author",
                size: Math.round(150 * scale),
                cell: ({ getValue }) => (
                    <span
                        className="text-xs text-muted-foreground truncate block"
                        title={getValue() as string}>
                        {getValue() as string}
                    </span>
                ),
            },
            {
                accessorKey: "commit.timestamp",
                id: "date",
                header: "Date",
                size: Math.round(150 * scale),
                cell: ({ getValue }) => (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(getValue() as string).toLocaleString()}
                    </span>
                ),
            },
        ],
        [row_height, col_width, padding_left, scale]
    );

    // 4. Initialize Table
    const table = useReactTable({
        data,
        columns,
        state: { rowSelection },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        columnResizeMode: "onChange",
    });

    const { rows } = table.getRowModel();

    // 5. Interaction Logic
    const handleRowClick = (index: number, e: React.MouseEvent) => {
        const isCtrl = e.metaKey || e.ctrlKey;
        const isShift = e.shiftKey;

        const currentSelection = rowSelection as Record<string, boolean>;
        const isSelected = !!currentSelection[index];
        const selectedCount = Object.keys(currentSelection).length;

        let newSelection = { ...currentSelection };

        if (isShift) {
            const anchor = lastSelectedIndex ?? index;
            const start = Math.min(anchor, index);
            const end = Math.max(anchor, index);

            newSelection = {};
            for (let i = start; i <= end; i++) {
                newSelection[i] = true;
            }
            if (lastSelectedIndex === null) {
                setLastSelectedIndex(index);
            }
        } else if (isCtrl) {
            if (isSelected) {
                delete newSelection[index];
            } else {
                newSelection[index] = true;
            }
            setLastSelectedIndex(index);
        } else {
            if (selectedCount === 1 && isSelected) {
                newSelection = {};
            } else {
                newSelection = { [index]: true };
            }
            setLastSelectedIndex(index);
        }
        setRowSelection(newSelection);
    };

    // 6. DnD Logic
    const sensors = useSensors(
        useSensor(MouseSensor, {
            activationConstraint: {
                distance: 10,
            },
        }),
        useSensor(TouchSensor)
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        setActiveDragId(active.id as string);

        const index = active.data.current?.index as number;
        const currentSelection = rowSelection as Record<string, boolean>;

        if (index !== undefined && !currentSelection[index]) {
            setRowSelection({ [index]: true });
            setLastSelectedIndex(index);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);

        if (over && active.id !== over.id) {
            const currentSelection = rowSelection as Record<string, boolean>;
            const selectedIndices = Object.keys(currentSelection).map(Number);
            const sourceChangeIds = selectedIndices
                .map((i) => rows[i]?.original.commit.change_id)
                .filter(Boolean);

            const targetChangeId = over.id as string;

            if (!sourceChangeIds.includes(targetChangeId)) {
                debug(`Dropped: ${sourceChangeIds} onto: ${targetChangeId}`);
            }
        }
    };

    const totalWidth = table.getTotalSize();

    const activeRow = useMemo(() => {
        if (!activeDragId) return null;
        return rows.find((r) => r.original.commit.change_id === activeDragId);
    }, [activeDragId, rows]);

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex flex-col h-full w-full bg-background text-foreground select-none">
                {/* Header */}
                <div
                    className="flex items-center border-b border-border bg-muted/40 font-medium text-xs text-muted-foreground"
                    style={{ width: totalWidth, minWidth: "100%" }}>
                    {table.getFlatHeaders().map((header) => (
                        <div
                            key={header.id}
                            className="relative flex items-center px-2 py-1 border-r border-border/10 last:border-0"
                            style={{ width: header.getSize() }}>
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <div
                                onMouseDown={header.getResizeHandler()}
                                onTouchStart={header.getResizeHandler()}
                                className={cn(
                                    "absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none hover:bg-primary/50",
                                    header.column.getIsResizing() ? "bg-primary" : "bg-transparent"
                                )}
                            />
                        </div>
                    ))}
                </div>

                {/* Body */}
                <div className="flex-1 w-full min-h-0 overflow-auto">
                    <Virtuoso
                        totalCount={rows.length}
                        data={rows}
                        fixedItemHeight={row_height}
                        itemContent={(index, row) => (
                            <HistoryRow
                                row={row}
                                index={index}
                                totalWidth={totalWidth}
                                isSelected={row.getIsSelected()}
                                height={row_height}
                                onClick={(e) => handleRowClick(index, e)}
                            />
                        )}
                    />
                </div>

                <DragOverlay>
                    {activeRow ? (
                        <RowContent
                            row={activeRow}
                            isSelected={true}
                            isDropTarget={false}
                            isDragging={false}
                            totalWidth={totalWidth}
                            height={row_height}
                        />
                    ) : null}
                </DragOverlay>
            </div>
        </DndContext>
    );
}

// --- Badge Component ---
const Badge = ({ text, color }: { text: string; color: string }) => (
    <span
        className={`px-1.5 py-0.5 rounded text-xs font-semibold border ${color} bg-opacity-10 mr-1 whitespace-nowrap inline-block`}>
        {text}
    </span>
);

// --- Row Content Component (Pure visual) ---
const RowContent = ({
    row,
    isSelected,
    isDropTarget,
    isDragging,
    totalWidth,
    height,
    onClick,
}: {
    row: Row<GraphRow>;
    isSelected: boolean;
    isDropTarget: boolean;
    isDragging: boolean;
    totalWidth: number;
    height: number;
    onClick?: (e: React.MouseEvent) => void;
}) => {
    return (
        <div
            className={cn(
                "flex items-center border-b border-border/10 hover:bg-muted/50 text-sm bg-background",
                row.original.commit.is_working_copy ? "font-medium" : "",
                isSelected ? "bg-accent text-accent-foreground" : "",
                isDropTarget ? "bg-accent/50" : "",
                isDragging ? "opacity-40" : ""
            )}
            style={{ width: totalWidth, minWidth: "100%", height }}
            onClick={onClick}>
            {row.getVisibleCells().map((cell) => (
                <div
                    key={cell.id}
                    className="h-full flex items-center px-2 overflow-hidden"
                    style={{ width: cell.column.getSize() }}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </div>
            ))}
        </div>
    );
};

// --- Draggable Row Component ---
const HistoryRow = ({
    row,
    index,
    totalWidth,
    isSelected,
    height,
    onClick,
}: {
    row: Row<GraphRow>;
    index: number;
    totalWidth: number;
    isSelected: boolean;
    height: number;
    onClick: (e: React.MouseEvent) => void;
}) => {
    const changeId = row.original.commit.change_id;

    const {
        attributes,
        listeners,
        setNodeRef: setDragRef,
        isDragging,
    } = useDraggable({
        id: changeId,
        data: { index, changeId },
    });

    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: changeId,
        data: { index, changeId },
    });

    const setNodeRef = (node: HTMLElement | null) => {
        setDragRef(node);
        setDropRef(node);
    };

    const isDropTarget = isOver && !isSelected;

    return (
        <div ref={setNodeRef} {...attributes} {...listeners} className="outline-none">
            <RowContent
                row={row}
                isSelected={isSelected}
                isDropTarget={isDropTarget}
                isDragging={isDragging}
                totalWidth={totalWidth}
                height={height}
                onClick={onClick}
            />
        </div>
    );
};
