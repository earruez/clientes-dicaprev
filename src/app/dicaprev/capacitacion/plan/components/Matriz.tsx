
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import {
  Role,
  Course,
  Requirement,
  TrainingStatus,
  statusConfig,
} from "./utils";

type MatrizProps = {
  roles: Role[];
  courses: Course[];
  cursosFiltrados: Course[];
  requirements: Requirement[];
  filtroCritico: boolean;
  onChangeFiltroCritico: (value: boolean) => void;
  search: string;
  onChangeSearch: (value: string) => void;
  getRequirementFor: (roleId: string, courseId: string) => Requirement | undefined;
  onCellClick: (roleId: string, courseId: string) => void;
  onCellDoubleClick: (roleId: string, courseId: string) => void;
};

export default function Matriz({
  roles,
  cursosFiltrados,
  requirements: _requirements,
  filtroCritico,
  onChangeFiltroCritico,
  search,
  onChangeSearch,
  getRequirementFor,
  onCellClick,
  onCellDoubleClick,
}: MatrizProps) {
  void _requirements;

  return (
    <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <p className="text-sm font-medium text-slate-700">
              Matriz por rol vs curso
            </p>
            <p className="text-xs text-slate-500 max-w-xl">
              Clic para editar la exigencia. Doble clic para rotar estado
              (vigente → por vencer → vencido → pendiente).
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Checkbox
              id="critico"
              checked={filtroCritico}
              onCheckedChange={(v: boolean) => onChangeFiltroCritico(Boolean(v))}
            />
            <label htmlFor="critico" className="cursor-pointer">
              Ver solo riesgos críticos / obligatorios
            </label>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <Input
            placeholder="Buscar curso (ej. Trabajo en altura)…"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChangeSearch(e.target.value)}
            className="bg-white shadow-sm text-sm md:w-80"
          />
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-xl border-slate-200 text-xs md:text-sm">
              Plantilla DS44
            </Button>
            <Button className="rounded-xl text-xs md:text-sm">
              Agregar curso al plan
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 pt-3">
        <div className="w-full overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-1 text-xs">
            <thead>
              <tr>
                <th className="text-left text-[11px] font-medium text-slate-500 w-52 px-2">
                  Rol / Cargo
                </th>
                {cursosFiltrados.map((c) => (
                  <th
                    key={c.id}
                    className="text-left text-[11px] font-medium text-slate-500 px-2 min-w-[160px]"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span>{c.nombre}</span>
                      <span className="text-[10px] text-slate-400">
                        {c.categoria} ·{" "}
                        {c.vigenciaMeses
                          ? `Vigencia ${c.vigenciaMeses} meses`
                          : "Sin vigencia definida"}
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td className="align-top px-2 py-1.5">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-slate-800">
                        {role.nombre}
                      </span>
                      {role.critico && (
                        <span className="text-[10px] text-rose-500 font-medium">
                          Rol crítico
                        </span>
                      )}
                    </div>
                  </td>
                  {cursosFiltrados.map((course) => {
                    const req = getRequirementFor(role.id, course.id);
                    const status: TrainingStatus = req?.status || "pendiente";
                    const cfg = statusConfig[status];

                    return (
                      <td
                        key={`${role.id}-${course.id}`}
                        className="px-2 py-1.5 align-top"
                      >
                        <button
                          type="button"
                          onClick={() => onCellClick(role.id, course.id)}
                          onDoubleClick={() => onCellDoubleClick(role.id, course.id)}
                          className={`w-full text-left rounded-xl px-2 py-1.5 text-[11px] transition-colors ${cfg.className}`}
                          title="Doble clic: rotar estado rápido"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="font-medium">{cfg.label}</span>
                            {course.obligatorio && (
                              <span className="text-[9px] uppercase tracking-wide">
                                Obligatorio
                              </span>
                            )}
                          </div>
                          {req?.proximaFecha && (
                            <p className="text-[10px] mt-0.5 text-slate-500">
                              Próx. capacitación: {req.proximaFecha}
                            </p>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          * Esta matriz se integrará con el módulo de vencimientos y
          participación para controlar alertas y asistencia real.
        </p>
      </div>
    </Card>
  );
}
