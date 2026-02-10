import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 select-none",
    {
        variants: {
            variant: {
                default:
                    "bg-indigo-500 text-white shadow-sm",
                secondary:
                    "bg-emerald-500 text-white shadow-sm",
                destructive:
                    "bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-500/20",
                success:
                    "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-500/20",
                warning:
                    "bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-500/20",
                info:
                    "bg-indigo-50 text-indigo-600 ring-1 ring-inset ring-indigo-500/20",
                outline: 
                    "bg-transparent text-foreground ring-1 ring-inset ring-border",
                muted:
                    "bg-muted text-muted-foreground",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    );
}

export { Badge, badgeVariants };
