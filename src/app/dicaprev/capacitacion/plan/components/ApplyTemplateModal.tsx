
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TemplatePlan } from "./utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: TemplatePlan | null;
  onApply: (mode: "merge" | "replace") => void;
};

export default function ApplyTemplateModal({
  open,
  onOpenChange,
  template,
  onApply,
}: Props) {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            Aplicar plantilla al plan
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">Plantilla seleccionada</p>
            <p className="text-sm font-semibold text-slate-900">
              {template.nombre}
            </p>
            <p className="text-xs text-slate-500 mt-1">{template.descripcion}</p>
          </div>
          <p className="text-xs text-slate-500">
            Puedes fusionar esta plantilla con tu plan actual (se agregan roles,
            cursos y requisitos nuevos) o reemplazar completamente el plan
            existente.
          </p>
        </div>
        <DialogFooter className="mt-4 flex flex-col md:flex-row gap-2">
          <Button
            variant="outline"
            className="rounded-xl w-full"
            onClick={() => onApply("merge")}
          >
            Fusionar con mi plan
          </Button>
          <Button
            className="rounded-xl w-full"
            onClick={() => onApply("replace")}
          >
            Reemplazar plan actual
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
