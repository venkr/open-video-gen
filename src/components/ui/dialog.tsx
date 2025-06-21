import * as React from "react"
import { cn } from "~/lib/utils"

interface DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
}

interface DialogContentProps {
    className?: string;
    children: React.ReactNode;
}

interface DialogHeaderProps {
    className?: string;
    children: React.ReactNode;
}

interface DialogTitleProps {
    className?: string;
    children: React.ReactNode;
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80"
                onClick={() => onOpenChange(false)}
            />
            {/* Dialog content */}
            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                {children}
            </div>
        </div>
    );
};

const DialogContent = ({ className, children, ...props }: DialogContentProps) => {
    return (
        <div
            className={cn(
                "bg-white border-4 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
};

const DialogHeader = ({ className, children, ...props }: DialogHeaderProps) => {
    return (
        <div
            className={cn("flex flex-col space-y-2 mb-4", className)}
            {...props}
        >
            {children}
        </div>
    );
};

const DialogTitle = ({ className, children, ...props }: DialogTitleProps) => {
    return (
        <h2
            className={cn("text-2xl font-black text-gray-900 tracking-wider", className)}
            {...props}
        >
            {children}
        </h2>
    );
};

export { Dialog, DialogContent, DialogHeader, DialogTitle }; 