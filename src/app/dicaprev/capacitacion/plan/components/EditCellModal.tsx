
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
import { Role, Course, Requirement, TrainingStatus } from "./utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCell: Requirement | null;
  roles: Role[];
  courses: Course[];
  onSave: (req: Requirement) => void;
};

export default function EditCellModal({
  open,
  onOpenChange,
  selectedCell,
  roles,
  courses,
  onSave,
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
        </div>
        <DialogFooter className="mt-4">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="rounded-xl"
            onClick={() => {
              onSave(local);
              onOpenChange(false);
            }}
          >
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
