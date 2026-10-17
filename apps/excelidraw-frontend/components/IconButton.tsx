import { ReactNode } from "react";

export function IconButton({
    icon,
    onClick,
    activated = false,
    title,
    disabled = false
}: {
    icon: ReactNode;
    onClick: () => void;
    activated?: boolean;
    title?: string;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            title={title}
            disabled={disabled}
            className={`p-2 rounded-lg transition-all cursor-pointer flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${
                activated 
                    ? "bg-primary/20 text-primary border border-primary/50 shadow-sm" 
                    : "text-zinc-300 hover:bg-zinc-800 hover:text-white border border-transparent"
            }`}
            onClick={onClick}
        >
            {icon}
        </button>
    );
}