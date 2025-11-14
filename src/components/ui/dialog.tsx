import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * DICAPREV — Modal (premium)
 * - Overlay con blur y oscurecimiento suave
 * - Contenedor con esquinas 2xl, shadow-2xl y borde sutil
 * - Tamaños: sm, md, lg, xl (por defecto md)
 * - Botón de cierre (esquina superior derecha)
 *
 * Exports compatibles con shadcn/ui:
 * Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
 */

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export const DialogPortal = DialogPrimitive.Portal

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

type ContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  size?: "sm" | "md" | "lg" | "xl"
  /** Si true, muestra botón de cierre en esquina */
  withClose?: boolean
}

const sizeMap = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
} as const

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  ContentProps
>(({ className, children, size = "md", withClose = true, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 grid w-full gap-4 rounded-2xl border border-slate-200/60 bg-white p-6",
        "shadow-2xl outline-none",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
        "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
        "data-[state=open]:slide-in-from-top-10",
        "dark:border-slate-800/60 dark:bg-slate-900",
        // width container
        "mx-auto",
        sizeMap[size],
        // center on screen
        "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        className
      )}
      {...props}
    >
      {withClose && (
        <DialogPrimitive.Close
          className={cn(
            "absolute right-3 top-3 rounded-full p-1",
            "text-slate-500 hover:text-slate-700",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/70 focus-visible:ring-offset-2",
            "transition-colors"
          )}
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </DialogPrimitive.Close>
      )}
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

export const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-left", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center gap-2 justify-end", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold tracking-tight", className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-slate-500 dark:text-slate-400", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

/* Botón de acción principal verde corporativo */
export function PrimaryAction({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-white",
        "hover:bg-emerald-700",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/70 focus-visible:ring-offset-2",
        "disabled:pointer-events-none disabled:opacity-60",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
