"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MESES_SHORT, type EstadoActividad, type MesShort } from "../mock-data";

export type ActivityFormModel = {
  actividad: string;
  normativa: string;
  categoria: string;
  periodicidad: "Mensual" | "Trimestral" | "Semestral" | "Anual";
  mes: MesShort;
  responsable: string;
  centroContratista: string;
  estado: EstadoActividad;
  requiereEvidencia: boolean;
};

export function ActivityFormFields({
  value,
  onChange,
}: {
  value: ActivityFormModel;
  onChange: <K extends keyof ActivityFormModel>(key: K, next: ActivityFormModel[K]) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label>Nombre actividad</Label>
          <Input value={value.actividad} onChange={(e) => onChange("actividad", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Normativa</Label>
          <Input value={value.normativa} onChange={(e) => onChange("normativa", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Categoria</Label>
          <Input value={value.categoria} onChange={(e) => onChange("categoria", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Periodicidad</Label>
          <Select
            value={value.periodicidad}
            onValueChange={(next) => onChange("periodicidad", next as ActivityFormModel["periodicidad"])}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Mensual">Mensual</SelectItem>
              <SelectItem value="Trimestral">Trimestral</SelectItem>
              <SelectItem value="Semestral">Semestral</SelectItem>
              <SelectItem value="Anual">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Mes</Label>
          <Select value={value.mes} onValueChange={(next) => onChange("mes", next as MesShort)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MESES_SHORT.map((mes) => (
                <SelectItem key={mes} value={mes}>{mes}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Responsable</Label>
          <Input value={value.responsable} onChange={(e) => onChange("responsable", e.target.value)} />
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label>Centro / Contratista</Label>
          <Input value={value.centroContratista} onChange={(e) => onChange("centroContratista", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Estado</Label>
          <Select value={value.estado} onValueChange={(next) => onChange("estado", next as EstadoActividad)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="realizada">realizada</SelectItem>
              <SelectItem value="pendiente">pendiente</SelectItem>
              <SelectItem value="vencida">vencida</SelectItem>
              <SelectItem value="no_aplica">no_aplica</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <Checkbox
          id="form-requiere-evidencia"
          checked={value.requiereEvidencia}
          onCheckedChange={(checked) => onChange("requiereEvidencia", Boolean(checked))}
        />
        <Label htmlFor="form-requiere-evidencia" className="text-sm">Requiere evidencia</Label>
      </div>
    </>
  );
}
