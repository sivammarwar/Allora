"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[96vw] h-[92vh]",
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
  size = "md",
}: DialogProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const overlay = (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-[rgba(46,26,26,0.55)] backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative w-full bg-white border border-brand-border rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[88vh]",
          "animate-fade-slide-up",
          sizeMap[size],
          className
        )}
      >
        {(title || description) && (
          <div className="px-6 pt-5 pb-4 border-b border-brand-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                {title && (
                  <h2 className="font-heading text-xl text-brand-text">{title}</h2>
                )}
                {description && (
                  <p className="mt-1 text-sm text-brand-textMuted">{description}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-brand-textMuted hover:text-brand-text p-1 rounded-sm hover:bg-[rgba(192,98,106,0.08)]"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
      </div>
    </div>
  );

  if (typeof document === "undefined") return overlay;
  return createPortal(overlay, document.body);
}
