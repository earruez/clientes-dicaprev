#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
UI_DIR="src/components/ui"

echo "→ Creando carpeta ${UI_DIR}…"
mkdir -p "${UI_DIR}"

# Utilidad cn()
cat > "${UI_DIR}/utils.ts" <<'TS'
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
TS

# card.tsx
cat > "${UI_DIR}/card.tsx" <<'TS'
"use client";
import * as React from "react";
import { cn } from "./_utils";

export function Card({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border bg-background text-foreground shadow", className)} {...props} />;
}
export function CardHeader({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 border-b bg-muted/30 rounded-t-xl", className)} {...props} />;
}
export function CardContent({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}
TS

# button.tsx
cat > "${UI_DIR}/button.tsx" <<'TS'
"use client";
import * as React from "react";
import { cn } from "./_utils";

type Variant = "default" | "outline" | "ghost" | "secondary";
type Size = "sm" | "md";
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}
export function Button({ className = "", variant = "default", size = "md", ...props }: ButtonProps) {
  const v = {
    default: "bg-primary text-primary-foreground hover:opacity-90",
    outline: "border bg-background hover:bg-accent",
    ghost: "hover:bg-accent",
    secondary: "bg-secondary text-secondary-foreground hover:opacity-90",
  }[variant];
  const s = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm" }[size];
  return <button className={cn("inline-flex items-center justify-center rounded-md transition", v, s, className)} {...props} />;
}
TS

# tabs.tsx
cat > "${UI_DIR}/tabs.tsx" <<'TS'
"use client";
import * as React from "react";
import { cn } from "./_utils";

type TabValue = string;
type TabsContextType = { value: TabValue; onValueChange?: (v: TabValue) => void };
const TabsCtx = React.createContext<TabsContextType | null>(null);

export function Tabs({ value, onValueChange, className = "", children }:
  React.PropsWithChildren<{ value: TabValue; onValueChange?: (v: TabValue) => void; className?: string }>) {
  return <div className={className}><TabsCtx.Provider value={{ value, onValueChange }}>{children}</TabsCtx.Provider></div>;
}
export function TabsList({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid w-full grid-cols-3 rounded-xl border bg-gray-50 p-1", className)} {...props} />;
}
export function TabsTrigger({ value, children, ...rest }:
  React.PropsWithChildren<{ value: TabValue } & React.ButtonHTMLAttributes<HTMLButtonElement>>) {
  const ctx = React.useContext(TabsCtx)!;
  const active = ctx.value === value;
  return (
    <button
      data-state={active ? "active" : "inactive"}
      onClick={() => ctx.onValueChange?.(value)}
      className={cn(
        "rounded-lg px-3 py-2 text-sm font-medium transition",
        active ? "bg-white shadow-sm border" : "text-gray-600 hover:text-gray-900"
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
export function TabsContent({ value, className = "", children }:
  React.PropsWithChildren<{ value: TabValue; className?: string }>) {
  const ctx = React.useContext(TabsCtx)!;
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}
TS

# progress.tsx
cat > "${UI_DIR}/progress.tsx" <<'TS'
"use client";
import * as React from "react";
import { cn } from "./_utils";
export function Progress({ value = 0, className = "" }: { value?: number; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded bg-muted", className)}>
      <div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
TS

# input.tsx
cat > "${UI_DIR}/input.tsx" <<'TS'
"use client";
import * as React from "react";
import { cn } from "./_utils";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => (
    <input ref={ref} className={cn("h-10 w-full rounded-md border bg-background px-3 text-sm outline-none", className)} {...props} />
  )
);
Input.displayName = "Input";
TS

# checkbox.tsx
cat > "${UI_DIR}/checkbox.tsx" <<'TS'
"use client";
import * as React from "react";
export function Checkbox({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" className={"h-4 w-4 rounded border"} {...props} />;
}
TS

# label.tsx
cat > "${UI_DIR}/label.tsx" <<'TS'
"use client";
import * as React from "react";
import { cn } from "./_utils";
export function Label({ className = "", ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-sm font-medium", className)} {...props} />;
}
TS

# badge.tsx
cat > "${UI_DIR}/badge.tsx" <<'TS'
"use client";
import * as React from "react";
import { cn } from "./_utils";
export function Badge({ className = "", ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs", className)} {...props} />;
}
TS

# dialog.tsx
cat > "${UI_DIR}/dialog.tsx" <<'TS'
"use client";
import * as React from "react";
import { cn } from "./_utils";

export function Dialog({ open, onOpenChange, children }:
  React.PropsWithChildren<{ open?: boolean; onOpenChange?: (open: boolean) => void }>) {
  return open ? <div onClick={() => onOpenChange?.(false)} className="fixed inset-0 z-50 grid place-items-center bg-black/40">{children}</div> : null;
}

export function DialogContent({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div onClick={(e) => e.stopPropagation()} className={cn("w-full max-w-lg rounded-xl bg-background p-4 shadow-lg", className)} {...props} />;
}
export function DialogHeader({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-2", className)} {...props} />;
}
export function DialogTitle({ className = "", ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("text-lg font-semibold", className)} {...props} />;
}
export function DialogFooter({ className = "", ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mt-4 flex justify-end gap-2", className)} {...props} />;
}
TS

echo "✓ Archivos creados en ${UI_DIR}"
echo "Recuerda tener Tailwind configurado y el alias '@/*' apuntando a './src/*' en tsconfig.json."
