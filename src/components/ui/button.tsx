import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2.5 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none",
    {
        variants: {
            variant: {
                default:
                    "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
                destructive:
                    "bg-gradient-to-b from-rose-500 to-rose-600 text-white shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30 hover:-translate-y-0.5 active:translate-y-0",
                outline:
                    "border-2 border-border bg-card text-foreground hover:border-indigo-400 hover:bg-indigo-50 active:bg-indigo-100",
                secondary:
                    "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0",
                ghost: 
                    "text-muted-foreground hover:text-foreground hover:bg-muted/80",
                link: 
                    "text-indigo-600 underline-offset-4 hover:underline font-medium",
                soft:
                    "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:bg-indigo-150",
                "soft-secondary":
                    "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:bg-emerald-150",
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 px-3 text-xs rounded-lg",
                lg: "h-10 px-5 text-sm rounded-xl",
                xl: "h-11 px-6 text-sm rounded-2xl",
                icon: "h-9 w-9",
                "icon-sm": "h-8 w-8 rounded-lg",
                "icon-lg": "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
