import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Trash2, Database, Eye, Sparkles } from 'lucide-react';
import type { FileAnalysis, Customer } from '../../../types.d';
import { CustomSelect } from '../ui/custom-native-select';

interface FileConfig extends FileAnalysis {
    matchLabel?: string;
    overrideIdColumn?: number;
    overrideResultColumn?: number;
}

interface FileConfigurationCardProps {
    config: FileConfig;
    index?: number;
    isMaster?: boolean;
    customers?: Customer[];
    onSheetChange: (val: string) => void;
    onIdColumnChange: (val: number | undefined) => void;
    onResultColumnChange?: (val: number | undefined) => void;
    onMatchCustomerChange?: (val: string | undefined) => void;
    onRemove?: () => void;
    onPreview: () => void;
    guessCustomer?: (fileName: string, customers: Customer[]) => string | undefined;
}

export const FileConfigurationCard = ({
    config,
    index = 0,
    isMaster = false,
    customers = [],
    onSheetChange,
    onIdColumnChange,
    onResultColumnChange,
    onMatchCustomerChange,
    onRemove,
    onPreview,
    guessCustomer
}: FileConfigurationCardProps) => {
    return (
        <Card className="overflow-hidden border-border/60 shadow-sm transition-all hover:shadow-md">
            <div className="p-4 flex flex-col md:flex-row gap-4 md:items-start">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={cn(
                            "w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-sm border",
                            isMaster
                                ? "bg-indigo-50 text-indigo-600 border-indigo-100"
                                : "bg-muted text-muted-foreground border-border"
                        )}>
                            {isMaster ? <Database className="w-4 h-4" /> : (index + 1)}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-sm truncate pr-4">{config.fileName}</h3>
                        </div>
                    </div>

                    {/* Sheet Selection */}
                    {config.sheets && config.sheets.length > 1 && (
                        <div className="mb-4">
                            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-between">
                                <span>Sheet</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onPreview}
                                    className="h-5 px-1.5 text-[10px] flex items-center gap-1 hover:bg-indigo-50 hover:text-indigo-600"
                                >
                                    <Eye className="w-3 h-3" />
                                    Preview
                                </Button>
                            </label>
                            <CustomSelect
                                value={config.selectedSheet}
                                onChange={onSheetChange}
                                options={config.sheets.map(s => ({ value: s, label: s }))}
                                className="h-8 text-xs"
                            />
                        </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="h-5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                Ticket Reference Column
                                {config.idColumn?.index !== undefined && config.overrideIdColumn === config.idColumn.index && (
                                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold border border-indigo-200 flex items-center gap-1 uppercase tracking-wider">
                                        <Sparkles className="w-2.5 h-2.5" />
                                        Auto
                                    </span>
                                )}
                            </label>
                            <CustomSelect
                                value={config.overrideIdColumn}
                                onChange={(val) => {
                                    const intVal = parseInt(val);
                                    onIdColumnChange(isNaN(intVal) ? undefined : intVal);
                                }}
                                options={config.headers?.map(h => ({ value: h.index, label: h.name })) || []}
                                placeholder="Select unique ID column..."
                                autoDetected={config.idColumn?.index !== undefined && config.overrideIdColumn === config.idColumn.index}
                                className="h-8 text-xs"
                            />
                        </div>

                        {isMaster ? (
                            <div className="space-y-1.5">
                                <label className="h-5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                    Result Column (Output)
                                </label>
                                <CustomSelect
                                    value={config.overrideResultColumn}
                                    onChange={(val) => {
                                        const intVal = parseInt(val);
                                        if (onResultColumnChange) onResultColumnChange(isNaN(intVal) ? undefined : intVal);
                                    }}
                                    options={[
                                        { value: -1, label: `✨ Create New Column` },
                                        ...(config.headers?.map(h => ({ value: h.index, label: h.name })) || [])
                                    ]}
                                    placeholder="Select output..."
                                    className="h-8 text-xs border-indigo-200 focus:border-indigo-500"
                                />
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="h-5 text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                    Matched Customer
                                </label>
                                <CustomSelect
                                    value={config.matchLabel}
                                    onChange={(val) => onMatchCustomerChange && onMatchCustomerChange(val || undefined)}
                                    options={customers.map(c => ({ value: c.name, label: c.name }))}
                                    placeholder="Select customer..."
                                    className="h-8 text-xs"
                                    autoDetected={!!(guessCustomer && config.matchLabel && guessCustomer(config.fileName || '', customers) === config.matchLabel)}
                                />
                            </div>
                        )}
                    </div>

                    {!isMaster && onRemove && (
                        <div className="mt-4 md:mt-0 absolute top-4 right-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                onClick={onRemove}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};
