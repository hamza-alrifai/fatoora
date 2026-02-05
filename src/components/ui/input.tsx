import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-12 w-full rounded-xl border-2 bg-card px-4 py-3 text-sm font-medium transition-all duration-200",
                    "border-border/60 hover:border-border",
                    "placeholder:text-muted-foreground/60 placeholder:font-normal",
                    "focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10",
                    "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted/50",
                    "file:border-0 file:bg-primary/10 file:text-primary file:text-sm file:font-semibold file:px-4 file:py-2 file:rounded-lg file:mr-4",
                    error && "border-destructive focus:ring-destructive/10",
                    className
                )}
                ref={ref}
                aria-invalid={error ? "true" : undefined}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";

export { Input };
