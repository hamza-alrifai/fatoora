import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface GlassDialogProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    description?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    size?: 'sm' | 'default' | 'lg' | 'xl';
}

export function GlassDialog({
    isOpen,
    onClose,
    title,
    description,
    children,
    className,
    size = 'default'
}: GlassDialogProps) {
    const dialogRef = useRef<HTMLDivElement>(null);

    const sizeClasses = {
        sm: 'max-w-md',
        default: 'max-w-xl',
        lg: 'max-w-3xl',
        xl: 'max-w-5xl',
    };

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
            dialogRef.current?.focus();
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-foreground/40 backdrop-blur-md animate-fade"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Content */}
            <div
                ref={dialogRef}
                tabIndex={-1}
                className={cn(
                    "relative w-full overflow-hidden rounded-2xl bg-card shadow-2xl animate-scale-in max-h-[90vh] flex flex-col",
                    sizeClasses[size],
                    className
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
                    <div className="space-y-1">
                        <h2 id="dialog-title" className="text-lg font-bold text-foreground tracking-tight">
                            {title}
                        </h2>
                        {description && (
                            <p className="text-sm text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center justify-center flex-shrink-0"
                        aria-label="Close dialog"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-5 pb-5 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
