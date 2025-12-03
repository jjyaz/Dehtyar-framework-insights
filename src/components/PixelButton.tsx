import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PixelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
}

export const PixelButton = ({
  variant = "primary",
  children,
  className,
  ...props
}: PixelButtonProps) => {
  const variants = {
    primary:
      "bg-primary text-primary-foreground hover:bg-primary/90 pixel-border",
    secondary:
      "bg-card text-card-foreground hover:bg-secondary pixel-border",
    ghost:
      "bg-transparent text-foreground hover:bg-card/50 border-2 border-border",
  };

  return (
    <button
      className={cn(
        "font-pixel text-xs md:text-sm px-6 py-3 transition-all duration-200",
        "hover:scale-105 active:scale-95",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
