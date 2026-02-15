import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";

interface SheetPreviewProps {
    filePath: string | null;
    label: string;
    selectedCols: number[] | null;
    onColumnSelect: (indices: number[]) => void;
    selectedRowRange?: { start: number; end: number } | null;
    onRowRangeSelect?: (range: { start: number; end: number } | null) => void;
    allowNewColumn?: boolean;
    selectionMode?: 'single' | 'range';
    sheets?: string[];  // List of all sheets in the file
    selectedSheet?: string;  // Currently selected sheet
    onSheetChange?: (sheetName: string) => void;  // Callback when sheet changes
}

export function SheetPreview({
    filePath,
    label,
    selectedCols,
    onColumnSelect,
    selectedRowRange,
    onRowRangeSelect,
    allowNewColumn = false,
    selectionMode = 'range',
    sheets = [],
    selectedSheet,
    onSheetChange
}: SheetPreviewProps) {
    const [data, setData] = useState<any[][]>([]);
    const [rowCount, setRowCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rangeStart, setRangeStart] = useState<number | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [rowRangeStart, setRowRangeStart] = useState<number | null>(null);
    const [headerRow, setHeaderRow] = useState<number | null>(null);
    const [footerStartRow, setFooterStartRow] = useState<number | null>(null);

    useEffect(() => {
        if (!filePath) {
            setData([]);
            setRowCount(0);
            return;
        }

        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await window.electron.readExcelPreview(filePath, selectedSheet);
                if (res.success && res.data) {
                    setData(res.data);
                    setRowCount(res.rowCount || res.data.length);
                    setHeaderRow(res.headerRow || null);
                    setFooterStartRow(res.footerStartRow || null);

                    if (res.suggestedColumn !== undefined && (!selectedCols || selectedCols.length === 0)) {
                        onColumnSelect([res.suggestedColumn]);
                    }

                    if (onRowRangeSelect && res.suggestedRowRange) {
                        if (!selectedRowRange || selectedRowRange.start === 0) {
                            onRowRangeSelect(res.suggestedRowRange);
                        }
                    }
                } else {
                    setError(res.error || "Failed to load preview");
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [filePath, selectedSheet, selectedCols, selectedRowRange, onColumnSelect, onRowRangeSelect]);

    const maxCols = data.length > 0 ? Math.max(...data.map(r => r.length)) : 0;
    const displayCols = allowNewColumn ? maxCols + 1 : maxCols;

    if (!filePath) return null;

    const getColLetter = (n: number) => {
        let s = "";
        while (n >= 0) {
            s = String.fromCharCode((n % 26) + 65) + s;
            n = Math.floor(n / 26) - 1;
        }
        return s;
    };

    const handleColumnClick = (colIndex: number, event: React.MouseEvent) => {
        if (selectionMode === 'single') {
            onColumnSelect([colIndex]);
            return;
        }

        if (event.shiftKey && selectedCols && selectedCols.length > 0) {
            const start = Math.min(selectedCols[0], colIndex);
            const end = Math.max(selectedCols[0], colIndex);
            const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
            onColumnSelect(range);
        } else if (event.metaKey || event.ctrlKey) {
            if (selectedCols && selectedCols.includes(colIndex)) {
                onColumnSelect(selectedCols.filter(c => c !== colIndex));
            } else {
                onColumnSelect([...(selectedCols || []), colIndex].sort((a, b) => a - b));
            }
        } else {
            onColumnSelect([colIndex]);
        }
    };

    const handleRowClick = (rowIndex: number) => {
        if (!onRowRangeSelect) return;
        const rowNumber = rowIndex + 1;

        if (rowRangeStart === null) {
            setRowRangeStart(rowNumber);
            onRowRangeSelect({ start: rowNumber, end: rowNumber });
        } else {
            const start = Math.min(rowRangeStart, rowNumber);
            const end = Math.max(rowRangeStart, rowNumber);
            onRowRangeSelect({ start, end });
            setRowRangeStart(null);
        }
    };

    const handleMouseDown = (colIndex: number) => {
        if (selectionMode === 'range') {
            setRangeStart(colIndex);
            setIsDragging(true);
        }
    };

    const handleMouseEnter = (colIndex: number) => {
        if (isDragging && rangeStart !== null && selectionMode === 'range') {
            const start = Math.min(rangeStart, colIndex);
            const end = Math.max(rangeStart, colIndex);
            const range = Array.from({ length: end - start + 1 }, (_, i) => start + i);
            onColumnSelect(range);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setRangeStart(null);
    };

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mouseup', handleMouseUp);
            return () => window.removeEventListener('mouseup', handleMouseUp);
        }
    }, [isDragging]);

    const isColumnSelected = (colIndex: number) => {
        return selectedCols && selectedCols.includes(colIndex);
    };

    const isRowInRange = (rowIndex: number) => {
        if (!selectedRowRange) return false;
        const rowNumber = rowIndex + 1;
        return rowNumber >= selectedRowRange.start && rowNumber <= selectedRowRange.end;
    };

    const getSelectedRangeText = () => {
        if (!selectedCols || selectedCols.length === 0) return null;
        if (selectedCols.length === 1) return getColLetter(selectedCols[0]);
        return `${getColLetter(selectedCols[0])}-${getColLetter(selectedCols[selectedCols.length - 1])}`;
    };

    return (
        <div className="flex flex-col h-full">
            {/* Sheet Tabs - Only show if multiple sheets */}
            {sheets && sheets.length > 1 && (
                <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/30 overflow-x-auto">
                    <span className="text-xs font-semibold text-muted-foreground mr-2 shrink-0">Sheets:</span>
                    {sheets.map(sheetName => (
                        <Button
                            key={sheetName}
                            variant={selectedSheet === sheetName ? "default" : "ghost"}
                            size="sm"
                            onClick={() => onSheetChange?.(sheetName)}
                            className={cn(
                                "h-7 text-xs shrink-0 transition-all",
                                selectedSheet === sheetName && "shadow-md"
                            )}
                        >
                            {sheetName}
                        </Button>
                    ))}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card/50">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    {selectedCols && selectedCols.length > 0 && (
                        <Badge variant="default" className="text-xs">
                            Column: {getSelectedRangeText()}
                        </Badge>
                    )}
                    {selectedRowRange && onRowRangeSelect && (
                        <Badge variant="success" className="text-xs">
                            Rows: {selectedRowRange.start}-{selectedRowRange.end}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                        {rowCount} rows
                    </span>
                    {selectedRowRange && onRowRangeSelect && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRowRangeSelect(null)}
                            className="text-xs h-6"
                        >
                            Clear Range
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Loading preview...</span>
                    </div>
                </div>
            ) : error ? (
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="flex flex-col items-center gap-3 text-center">
                        <AlertCircle className="w-10 h-10 text-destructive" />
                        <p className="text-sm text-destructive">{error}</p>
                    </div>
                </div>
            ) : (
                <ScrollArea className="flex-1">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-secondary">
                                <th className="w-12 px-2 py-2 text-center text-xs font-medium text-muted-foreground border-b border-r border-border">
                                    #
                                </th>
                                {Array.from({ length: displayCols }).map((_, i) => {
                                    const isSelected = isColumnSelected(i);
                                    return (
                                        <th
                                            key={i}
                                            onClick={(e) => handleColumnClick(i, e)}
                                            onMouseDown={() => handleMouseDown(i)}
                                            onMouseEnter={() => handleMouseEnter(i)}
                                            className={cn(
                                                "min-w-[100px] px-3 py-2 text-center text-xs font-semibold border-b border-r border-border cursor-pointer select-none transition-colors",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-muted-foreground hover:bg-accent"
                                            )}
                                        >
                                            {getColLetter(i)}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, rIndex) => {
                                const inRange = isRowInRange(rIndex);
                                const rowNumber = rIndex + 1;
                                const isHeader = rowNumber === headerRow;
                                const isFooter = footerStartRow && rowNumber >= footerStartRow;

                                return (
                                    <tr
                                        key={rIndex}
                                        className={cn(
                                            "transition-colors",
                                            inRange && "bg-success/10"
                                        )}
                                    >
                                        <td
                                            onClick={() => handleRowClick(rIndex)}
                                            className={cn(
                                                "px-2 py-1.5 text-center text-xs font-mono border-r border-b border-border transition-colors",
                                                onRowRangeSelect && "cursor-pointer hover:bg-accent",
                                                inRange && "bg-success/20 text-success font-semibold",
                                                isHeader && "bg-primary/10 text-primary",
                                                isFooter && "bg-destructive/10 text-destructive"
                                            )}
                                        >
                                            {rowNumber}
                                        </td>
                                        {Array.from({ length: displayCols }).map((_, cIndex) => {
                                            const isSelected = isColumnSelected(cIndex);
                                            const val = row[cIndex];
                                            return (
                                                <td
                                                    key={cIndex}
                                                    onClick={(e) => handleColumnClick(cIndex, e)}
                                                    onMouseDown={() => handleMouseDown(cIndex)}
                                                    onMouseEnter={() => handleMouseEnter(cIndex)}
                                                    className={cn(
                                                        "px-3 py-1.5 font-mono text-xs border-r border-b border-border cursor-pointer transition-colors",
                                                        isSelected && inRange && "bg-primary/20 text-foreground font-medium",
                                                        isSelected && !inRange && "bg-primary/10 text-foreground",
                                                        !isSelected && "hover:bg-accent/50"
                                                    )}
                                                >
                                                    <div className="max-w-[150px] truncate">
                                                        {val !== undefined && val !== null ? (
                                                            String(val)
                                                        ) : allowNewColumn && cIndex >= maxCols ? (
                                                            <span className="text-muted-foreground italic">New</span>
                                                        ) : (
                                                            ""
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                            {data.length === 0 && (
                                <tr>
                                    <td colSpan={displayCols + 1} className="py-12 text-center text-muted-foreground">
                                        No data found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </ScrollArea>
            )}
        </div>
    );
}
