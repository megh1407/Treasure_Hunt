import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function HoloPanel({
  title,
  subtitle,
  children,
  footer,
  className,
  onClose,
}: {
  title: string;
  subtitle?: string | undefined;
  children: ReactNode;
  footer?: ReactNode | undefined;
  className?: string | undefined;
  onClose?: (() => void) | undefined;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
      <div
        className={cn(
          "holo-panel relative w-full max-w-lg overflow-hidden rounded-xl p-6",
          className,
        )}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-primary/50" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-lg text-primary text-glow">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
            >
              ESC
            </button>
          )}
        </div>
        <div className="mt-5">{children}</div>
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
