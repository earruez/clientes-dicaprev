"use client";

type ToastVariant = "default" | "destructive";

export type ToastOptions = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
};

export function useToast() {
  function toast(options: ToastOptions) {
    // Aquí más adelante puedes conectar con un sistema real de toasts
    console.log("[toast]", options.variant ?? "default", options.title, options.description);
  }

  return { toast };
}
