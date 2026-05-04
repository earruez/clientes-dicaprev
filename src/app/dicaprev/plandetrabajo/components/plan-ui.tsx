"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ActividadPlan, EstadoActividad, MesShort } from "../mock-data";
import type { EstadoPlan } from "../store";

export function EstadoBadge({ estado }: { estado: EstadoActividad }) {
  const config: Record<EstadoActividad, { label: string; className: string }> = {
    realizada: { label: "Realizada", className: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
    pendiente: { label: "Pendiente", className: "bg-amber-100 text-amber-700 border border-amber-200" },
    vencida: { label: "Vencida", className: "bg-rose-100 text-rose-700 border border-rose-200" },
    no_aplica: { label: "No aplica", className: "bg-slate-100 text-slate-600 border border-slate-200" },
  };

  return <Badge className={cn("font-medium", config[estado].className)}>{config[estado].label}</Badge>;
}

export function EstadoPlanBadge({ estado }: { estado: EstadoPlan }) {
  const config: Record<EstadoPlan, { label: string; className: string }> = {
    borrador: { label: "Borrador", className: "bg-slate-100 text-slate-700 border border-slate-200" },
    en_revision: { label: "En revisión", className: "bg-amber-100 text-amber-700 border border-amber-200" },
    aprobado: { label: "Aprobado", className: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
    rechazado: { label: "Rechazado", className: "bg-rose-100 text-rose-700 border border-rose-200" },
  };

  return <Badge className={cn("font-medium", config[estado].className)}>{config[estado].label}</Badge>;
}

export function KpiCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-slate-800">{value}</p>
      {helper ? <p className="mt-1 text-xs text-slate-500">{helper}</p> : null}
    </div>
  );
}

export function QuickActions() {
  const actions = [
    { href: "/dicaprev/plandetrabajo/matriz-anual", label: "Matriz anual" },
    { href: "/dicaprev/plandetrabajo/actividades", label: "Actividades" },
    { href: "/dicaprev/plandetrabajo/evidencias", label: "Evidencias" },
    { href: "/dicaprev/plandetrabajo/indicadores", label: "Indicadores" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {actions.map((a) => (
        <Link
          key={a.href}
          href={a.href}
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-sm font-medium text-slate-700 shadow-sm transition hover:border-emerald-300 hover:text-emerald-700"
        >
          {a.label}
        </Link>
      ))}
    </div>
  );
}

export function TopActions({
  onCreate,
  onWizard,
  onExport,
  disableCreate,
  disableCreateReason,
}: {
  onCreate: () => void;
  onWizard: () => void;
  onExport: () => void;
  disableCreate?: boolean;
  disableCreateReason?: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        className="bg-emerald-600 hover:bg-emerald-700"
        onClick={onCreate}
        disabled={disableCreate}
        title={disableCreate ? disableCreateReason : undefined}
      >
        Crear actividad
      </Button>
      <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={onWizard}>
        Iniciar asistente
      </Button>
      <Button variant="outline" onClick={onExport}>Exportar PDF</Button>
    </div>
  );
}

export function MonthlyMatrix({ data, meses }: { data: ActividadPlan[]; meses: MesShort[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[1150px] w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left">Actividad</th>
            <th className="px-4 py-3 text-left">Norma</th>
            {meses.map((mes) => (
              <th key={mes} className="px-2 py-3 text-center">{mes}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-3 font-medium text-slate-800">{row.actividad}</td>
              <td className="px-4 py-3 text-slate-600">{row.normativa}</td>
              {meses.map((mes) => (
                <td key={mes} className="px-2 py-3 text-center">
                  <EstadoBadge estado={row.meses[mes]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ActivitiesTable({
  data,
  onEdit,
  onView,
  disableEdit,
  disableEditReason,
}: {
  data: ActividadPlan[];
  onEdit?: (actividad: ActividadPlan) => void;
  onView?: (actividad: ActividadPlan) => void;
  disableEdit?: boolean;
  disableEditReason?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[1200px] w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left">Actividad</th>
            <th className="px-4 py-3 text-left">Normativa</th>
            <th className="px-4 py-3 text-left">Categoría</th>
            <th className="px-4 py-3 text-left">Periodicidad</th>
            <th className="px-4 py-3 text-left">Responsable</th>
            <th className="px-4 py-3 text-left">Centro/Contratista</th>
            <th className="px-4 py-3 text-left">Estado</th>
            <th className="px-4 py-3 text-left">Evidencia</th>
            <th className="px-4 py-3 text-left">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-800">{item.actividad}</td>
              <td className="px-4 py-3 text-slate-600">{item.normativa}</td>
              <td className="px-4 py-3 text-slate-600">{item.categoria}</td>
              <td className="px-4 py-3 text-slate-600">{item.periodicidad}</td>
              <td className="px-4 py-3 text-slate-600">{item.responsable}</td>
              <td className="px-4 py-3 text-slate-600">{item.centroContratista}</td>
              <td className="px-4 py-3"><EstadoBadge estado={item.estado} /></td>
              <td className="px-4 py-3">
                <Badge variant={item.evidencia === "cargada" ? "default" : item.evidencia === "rechazada" ? "destructive" : "secondary"}>
                  {item.evidencia}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onView?.(item)}>Ver</Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit?.(item)}
                    disabled={disableEdit}
                    title={disableEdit ? disableEditReason : undefined}
                  >
                    Editar
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ActivitiesFiltersProps = {
  anio: string;
  estado: string;
  normativa: string;
  centro: string;
  responsable: string;
  search: string;
  normativas: string[];
  centros: string[];
  responsables: string[];
  onAnioChange: (value: string) => void;
  onEstadoChange: (value: string) => void;
  onNormativaChange: (value: string) => void;
  onCentroChange: (value: string) => void;
  onResponsableChange: (value: string) => void;
  onSearchChange: (value: string) => void;
};

export function ActivitiesFilters(props: ActivitiesFiltersProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Select value={props.anio} onValueChange={props.onAnioChange}>
          <SelectTrigger>
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2026">2026</SelectItem>
            <SelectItem value="2027">2027</SelectItem>
          </SelectContent>
        </Select>

        <Select value={props.estado} onValueChange={props.onEstadoChange}>
          <SelectTrigger>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="realizada">Realizada</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="vencida">Vencida</SelectItem>
            <SelectItem value="no_aplica">No aplica</SelectItem>
          </SelectContent>
        </Select>

        <Select value={props.normativa} onValueChange={props.onNormativaChange}>
          <SelectTrigger>
            <SelectValue placeholder="Normativa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            {props.normativas.map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={props.centro} onValueChange={props.onCentroChange}>
          <SelectTrigger>
            <SelectValue placeholder="Centro" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {props.centros.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={props.responsable} onValueChange={props.onResponsableChange}>
          <SelectTrigger>
            <SelectValue placeholder="Responsable" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {props.responsables.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          value={props.search}
          onChange={(e) => props.onSearchChange(e.target.value)}
          placeholder="Buscar actividad"
        />
      </div>
    </div>
  );
}

export function ProgressList({
  title,
  items,
}: {
  title: string;
  items: Array<{ nombre: string; valor: number }>;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.nombre}>
            <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
              <span>{item.nombre}</span>
              <span>{item.valor}%</span>
            </div>
            <Progress value={item.valor} className="h-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
