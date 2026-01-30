import { GlassDialog } from './glass-dialog';
import { Button } from './button';
import { AlertTriangle } from 'lucide-react';

interface GlassAlertDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info';
}

export function GlassAlertDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = 'danger'
}: GlassAlertDialogProps) {

    return (
        <GlassDialog
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            className="max-w-sm"
        >
            <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3 bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-sm">
                    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    <p className="text-red-200/90">{description}</p>
                </div>

                <div className="flex gap-3 pt-2">
                    <Button variant="ghost" className="flex-1" onClick={onClose}>
                        {cancelText}
                    </Button>
                    <Button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        variant={variant === 'danger' ? 'destructive' : 'default'}
                        className="flex-1"
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </GlassDialog>
    );
}
