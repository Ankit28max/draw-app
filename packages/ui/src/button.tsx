"use client";

import React, { ReactNode } from "react";

export interface ButtonProps {
  variant?: "primary" | "outline" | "secondary";
  className?: string;
  onClick?: () => void;
  size?: "lg" | "sm";
  type?: "button" | "submit" | "reset";
  children: ReactNode;
}

export const Button = ({ size = "sm", variant = "primary", className = "", type = "button", onClick, children }: ButtonProps) => {
  return (
    <button
      type={type}
      className={`${className}
        ${variant === "primary" ? "bg-primary text-primary-foreground" : variant === "secondary" ? "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80" : "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground"}
        ${size === "lg" ? "px-4 py-2" : "px-2 py-1"}
        rounded transition-colors`}
      onClick={onClick}
    >
      {children}
    </button>
  );
};