"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export interface SSTIndicatorValues {
  id: string;
  value: string;
  trend: "up" | "down" | "stable";
  trendValue: string;
}

export interface SSTIndicatorMeta {
  id: string;
  title: string;
  unit?: string;
}

export const SST_INDICATOR_META: SSTIndicatorMeta[] = [
  { id: "accidentabilidad", title: "Tasa de Accidentabilidad", unit: "%" },
  { id: "siniestralidad", title: "Tasa de Siniestralidad", unit: "%" },
  { id: "cotizacion", title: "Cotización Adicional" },
  { id: "frecuencia", title: "Índice de Frecuencia", unit: "acc./100trab" },
  { id: "gravedad", title: "Índice de Gravedad", unit: "días/acc." },
  { id: "dias-perdidos", title: "Días Perdidos", unit: "días" },
  { id: "accidentes-tp", title: "Accidentes con TP", unit: "accidentes" },
  { id: "accidentes-stp", title: "Accidentes sin TP", unit: "accidentes" },
];

export const DEFAULT_SST_VALUES: SSTIndicatorValues[] = [
  { id: "accidentabilidad", value: "0.82", trend: "down", trendValue: "-0.15%" },
  { id: "siniestralidad", value: "1.55", trend: "stable", trendValue: "0.00%" },
  { id: "cotizacion", value: "Sí", trend: "stable", trendValue: "" },
  { id: "frecuencia", value: "2.4", trend: "down", trendValue: "-0.3" },
  { id: "gravedad", value: "45.2", trend: "up", trendValue: "+2.1" },
  { id: "dias-perdidos", value: "124", trend: "down", trendValue: "-18" },
  { id: "accidentes-tp", value: "8", trend: "stable", trendValue: "0" },
  { id: "accidentes-stp", value: "12", trend: "up", trendValue: "+3" },
];

const TREND_LABELS: Record<"up" | "down" | "stable", string> = {
  up: "↑ Sube",
  down: "↓ Baja",
  stable: "— Estable",
};

interface EditSSTIndicatorsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (values: SSTIndicatorValues[]) => void;
  initialValues: SSTIndicatorValues[];
}

export function EditSSTIndicatorsModal({
  open,
  onClose,
  onSave,
  initialValues,
}: EditSSTIndicatorsModalProps) {
  const [form, setForm] = useState<SSTIndicatorValues[]>(initialValues);

  useEffect(() => {
    setForm(initialValues);
  }, [initialValues, open]);

  const updateField = (
    id: string,
    field: keyof SSTIndicatorValues,
    value: string
  ) => {
    setForm((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-emerald-600" />
            Configurar Indicadores SST
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Actualiza los valores actuales de cada indicador de seguridad y salud en el trabajo.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Indicador
                  </th>
                  <th className="pb-3 pl-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Valor actual
                  </th>
                  <th className="pb-3 pl-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Tendencia
                  </th>
                  <th className="pb-3 pl-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Variación
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {form.map((indicator) => {
                  const meta = SST_INDICATOR_META.find((m) => m.id === indicator.id);
                  return (
                    <tr key={indicator.id} className="align-middle">
                      <td className="py-3 pr-4">
                        <p className="font-semibold text-slate-900">{meta?.title}</p>
                        {meta?.unit && (
                          <p className="text-xs text-slate-500">{meta.unit}</p>
                        )}
                      </td>
                      <td className="py-3 pl-4">
                        <Input
                          value={indicator.value}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            updateField(indicator.id, "value", e.target.value)
                          }
                          className="h-8 w-28 text-sm"
                        />
                      </td>
                      <td className="py-3 pl-4">
                        <Select
                          value={indicator.trend}
                          onValueChange={(v) =>
                            updateField(indicator.id, "trend", v)
                          }
                        >
                          <SelectTrigger className="h-8 w-32 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              Object.entries(TREND_LABELS) as [
                                "up" | "down" | "stable",
                                string
                              ][]
                            ).map(([val, label]) => (
                              <SelectItem key={val} value={val}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 pl-4">
                        <Input
                          value={indicator.trendValue}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            updateField(indicator.id, "trendValue", e.target.value)
                          }
                          placeholder="ej. -0.15%"
                          className="h-8 w-24 text-sm"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="mt-6 flex items-center justify-end gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="rounded-xl border-slate-200 bg-white px-6 py-2 text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-xl bg-emerald-600 px-6 py-2 text-white hover:bg-emerald-700"
          >
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
