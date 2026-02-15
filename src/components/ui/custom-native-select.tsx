import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface CustomSelectProps {
    value: string | number | undefined;
    onChange: (val: string) => void;
    options: { value: string | number; label: string }[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    autoDetected?: boolean;
}

export const CustomSelect = ({
    value,
    onChange,
    options,
    placeholder = "Select...",
    className,
    disabled = false,
    autoDetected = false
}: CustomSelectProps) => (
    <div className="relative group">
        <div className="relative">
            <select
                className={cn(
                    "w-full h-10 rounded-xl border bg-background px-3 pr-10 text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
                    !value || value === -1 || value === "" ? "text-muted-foreground" : "text-foreground",
                    autoDetected && "border-indigo-500 ring-1 ring-indigo-500/20 bg-indigo-50/10",
                    className
                )}
                value={value ?? ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
            >
                <option value="" disabled>{placeholder}</option>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
    </div>
);
