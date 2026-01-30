import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface GlassDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
}

export function GlassDialog({
    isOpen,
    onClose,
    title,
    description,
    children,
    className
}: GlassDialogProps) {

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-background/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Content */}
            <div
                className={cn(
                    "relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/20 bg-background/70 backdrop-blur-xl shadow-2xl animate-in zoom-in-95 duration-200 p-6 ring-1 ring-white/10 dark:ring-white/5",
                    className
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold tracking-tight">{title}</h3>
                    <button
                        onClick={onClose}
                        className="rounded-full p-1 text-muted-foreground hover:bg-secondary/80 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {description && (
                    <div className="text-sm text-muted-foreground mb-6">
                        {description}
                    </div>
                )}

                <div>
                    {children}
                </div>
            </div>
        </div>
    );
}
