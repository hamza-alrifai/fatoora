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
                    "bg-gradient-to-b from-primary to-emerald-600 text-white shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md",
                destructive:
                    "bg-gradient-to-b from-destructive to-red-600 text-white shadow-lg shadow-destructive/25 hover:shadow-xl hover:shadow-destructive/30 hover:-translate-y-0.5 active:translate-y-0",
                outline:
                    "border-2 border-border bg-card text-foreground hover:border-primary hover:bg-primary/5 active:bg-primary/10",
                secondary:
                    "bg-gradient-to-b from-secondary to-indigo-600 text-white shadow-lg shadow-secondary/25 hover:shadow-xl hover:shadow-secondary/30 hover:-translate-y-0.5 active:translate-y-0",
                ghost: 
                    "text-muted-foreground hover:text-foreground hover:bg-muted/80",
                link: 
                    "text-primary underline-offset-4 hover:underline font-medium",
                soft:
                    "bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/25",
                "soft-secondary":
                    "bg-secondary/10 text-secondary hover:bg-secondary/20 active:bg-secondary/25",
            },
            size: {
                default: "h-11 px-5 py-2.5",
                sm: "h-9 px-4 text-xs rounded-lg",
                lg: "h-12 px-6 text-base rounded-xl",
                xl: "h-14 px-8 text-base rounded-2xl",
                icon: "h-11 w-11",
                "icon-sm": "h-9 w-9 rounded-lg",
                "icon-lg": "h-12 w-12",
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
