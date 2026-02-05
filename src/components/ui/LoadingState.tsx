import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
    label?: string;
    className?: string;
    size?: 'sm' | 'default' | 'lg';
}

export function LoadingState({ 
    label = 'Loading…', 
    className,
    size = 'default'
}: LoadingStateProps) {
    const sizeClasses = {
        sm: { container: 'min-h-[140px]', icon: 'w-8 h-8', text: 'text-xs' },
        default: { container: 'min-h-[240px]', icon: 'w-10 h-10', text: 'text-sm' },
        lg: { container: 'min-h-[320px]', icon: 'w-12 h-12', text: 'text-base' },
    };
    
    const styles = sizeClasses[size];
    
    return (
        <div className={cn(
            'flex items-center justify-center animate-in',
            styles.container,
            className
        )}>
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    <div className={cn(
                        "rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center",
                        styles.icon === 'w-8 h-8' ? 'w-14 h-14' : styles.icon === 'w-10 h-10' ? 'w-16 h-16' : 'w-20 h-20'
                    )}>
                        <Loader2 className={cn(styles.icon, "animate-spin text-primary")} />
                    </div>
                </div>
                {label && (
                    <p className={cn(styles.text, "text-muted-foreground font-semibold")}>
                        {label}
                    </p>
                )}
            </div>
        </div>
    );
}
