"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConfirmarEliminacionDialogProps {
  open: boolean;
  entidad: string;
  nombre: string;
  detalle?: string;
  accion?: string;
  loading?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function ConfirmarEliminacionDialog({
  open,
  entidad,
  nombre,
  detalle = "Dejará de aparecer en los listados y no estará disponible para nuevos permisos. Los permisos existentes no se modificarán.",
  accion = "Eliminar",
  loading = false,
  onOpenChange,
  onConfirm,
}: ConfirmarEliminacionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" withClose={!loading}>
        <DialogHeader>
          <DialogTitle>Eliminar {entidad}</DialogTitle>
          <DialogDescription>
            ¿Quieres eliminar {entidad.toLowerCase()} "{nombre}"?
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-slate-700">{detalle}</p>
        <DialogFooter className="flex-col-reverse sm:flex-row">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" className="bg-rose-700 hover:bg-rose-800" onClick={onConfirm} disabled={loading}>
            {loading ? "Eliminando..." : accion}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}