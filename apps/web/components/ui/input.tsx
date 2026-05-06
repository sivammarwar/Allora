"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const autoId = React.useId();
    const inputId = id ?? autoId;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-brand-text"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full h-10 px-3 rounded-sm bg-brand-surface border border-brand-border text-brand-text placeholder:text-brand-textMuted/60",
            "focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-colors",
            error && "border-brand-error focus:border-brand-error focus:ring-brand-error/20",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-brand-error">{error}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
