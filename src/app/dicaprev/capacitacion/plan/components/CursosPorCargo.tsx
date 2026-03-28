
import React from "react";
import { Card } from "@/components/ui/card";
import { Role, Course, Requirement, TrainingStatus, statusConfig } from "./utils";

type Props = {
  roles: Role[];
  courses: Course[];
  requirements: Requirement[];
};

export default function CursosPorCargo({ roles, courses, requirements }: Props) {
  const getStatusFor = (roleId: string, courseId: string): TrainingStatus | null => {
    const r = requirements.find(
      (req) => req.roleId === roleId && req.courseId === courseId
    );
    return r?.status || null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {roles.map((role) => (
        <Card
          key={role.id}
          className="border-slate-200 shadow-sm rounded-2xl overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-800">{role.nombre}</p>
              {role.critico && (
                <p className="text-[11px] text-rose-500 font-medium">
                  Rol crítico · Prioridad alta
                </p>
              )}
            </div>
          </div>
          <div className="p-4 space-y-2">
            {courses.map((course) => {
              const status = getStatusFor(role.id, course.id);
              const cfg = status ? statusConfig[status] : null;
              return (
                <div
                  key={course.id}
                  className="flex items-start justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="font-medium text-slate-800">{course.nombre}</p>
                    <p className="text-[11px] text-slate-500">
                      {course.categoria} ·{" "}
                      {course.vigenciaMeses
                        ? `Vigencia ${course.vigenciaMeses} meses`
                        : "Sin vigencia definida"}
                    </p>
                  </div>
                  {cfg && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] ${cfg.className}`}
                    >
                      {cfg.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
