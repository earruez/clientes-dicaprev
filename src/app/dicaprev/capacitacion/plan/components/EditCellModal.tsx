
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Role, Course, Requirement, TrainingStatus } from "./utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCell: Requirement | null;
  roles: Role[];
  courses: Course[];
  onSave: (req: Requirement) => void;
  saving?: boolean;
};

export default function EditCellModal({
  open,
  onOpenChange,
  selectedCell,
  roles,
  courses,
  onSave,
  saving,
}: Props) {
  const [local, setLocal] = React.useState<Requirement | null>(selectedCell);

  React.useEffect(() => {
    setLocal(selectedCell);
  }, [selectedCell]);

  if (!selectedCell || !local) return null;

  const role = roles.find((r) => r.id === selectedCell.roleId);
  const course = courses.find((c) => c.id === selectedCell.courseId);

  const handleChangeStatus = (value: TrainingStatus) => {
    setLocal((prev) => (prev ? { ...prev, status: value } : prev));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">
            Editar exigencia de capacitación
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-xs text-slate-500">Rol / cargo</p>
            <p className="text-sm font-medium text-slate-800">
              {role?.nombre || selectedCell.roleId}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Curso</p>
            <p className="text-sm font-medium text-slate-800">
              {course?.nombre || selectedCell.courseId}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Estado</Label>
              <Select
                value={local.status}
                onValueChange={(v) => handleChangeStatus(v as TrainingStatus)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="vigente">Vigente</SelectItem>
                  <SelectItem value="porVencer">Por vencer</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Periodicidad</Label>
              <Select
                value={local.periodicidad ?? "anual"}
                onValueChange={(v) => setLocal((prev) => prev ? { ...prev, periodicidad: v } : prev)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="anual">Anual</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="puntual">Puntual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mes programado (1–12)</Label>
              <Input
                type="number"
                min={1}
                max={12}
                placeholder="ej. 3"
                value={local.mesProgramado ?? ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const v = e.target.value === "" ? null : Number(e.target.value);
                  setLocal((prev) => prev ? { ...prev, mesProgramado: v } : prev);
                }}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Obligatorio</Label>
              <Select
                value={local.obligatorio !== false ? "si" : "no"}
                onValueChange={(v) =>
                  setLocal((prev) => prev ? { ...prev, obligatorio: v === "si" } : prev)
                }
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="si">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Última capacitación</Label>
              <Input
                placeholder="dd-mm-aaaa"
                value={local.ultimaFecha || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLocal((prev) => (prev ? { ...prev, ultimaFecha: e.target.value } : prev))
                }
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Próxima capacitación</Label>
              <Input
                placeholder="dd-mm-aaaa"
                value={local.proximaFecha || ""}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLocal((prev) => (prev ? { ...prev, proximaFecha: e.target.value } : prev))
                }
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Observaciones</Label>
            <Textarea
              placeholder="Notas u observaciones del ítem…"
              value={local.observaciones ?? ""}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setLocal((prev) => prev ? { ...prev, observaciones: e.target.value } : prev)
              }
              className="text-xs resize-none"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            className="rounded-xl"
            disabled={saving}
            onClick={() => {
              onSave(local);
              onOpenChange(false);
            }}
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
