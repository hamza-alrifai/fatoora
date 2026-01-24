import * as React from "react"
import { cva } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const sheetVariants = cva(
    "fixed inset-y-0 right-0 z-50 w-full h-full bg-background/80 backdrop-blur-xl border-l shadow-2xl transition-transform duration-300 ease-in-out sm:max-w-xl",
    {
        variants: {
            state: {
                open: "translate-x-0",
                closed: "translate-x-full"
            }
        },
        defaultVariants: {
            state: "closed"
        }
    }
)

interface SheetProps extends React.HTMLAttributes<HTMLDivElement> {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
}

export function Sheet({ isOpen, onClose, className, children, ...props }: SheetProps) {
    // Handle escape key
    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        if (isOpen) document.addEventListener('keydown', handleEsc)
        return () => document.removeEventListener('keydown', handleEsc)
    }, [isOpen, onClose])

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    "fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />
            {/* Panel */}
            <div
                className={cn(sheetVariants({ state: isOpen ? 'open' : 'closed' }), className)}
                {...props}
            >
                <div className="flex flex-col h-full">
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 rounded-full p-2 opacity-70 hover:opacity-100 bg-muted/20 hover:bg-muted/40 transition-all z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    {children}
                </div>
            </div>
        </>
    )
}
