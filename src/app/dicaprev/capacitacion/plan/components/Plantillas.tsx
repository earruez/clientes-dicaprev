
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TemplatePlan } from "./utils";

type Props = {
  templates: TemplatePlan[];
  onOpenApplyTemplate: (tpl: TemplatePlan) => void;
};

export default function Plantillas({ templates, onOpenApplyTemplate }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((tpl) => (
        <Card
          key={tpl.id}
          className="border-slate-200 shadow-sm rounded-2xl flex flex-col justify-between"
        >
          <div className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">{tpl.nombre}</p>
              <span className="text-[11px] uppercase tracking-wide text-slate-400">
                {tpl.tipo}
              </span>
            </div>
            <p className="text-xs text-slate-500">{tpl.descripcion}</p>
            {tpl.norma && (
              <p className="text-[11px] text-slate-400">
                Normativa base: {tpl.norma}
              </p>
            )}
          </div>
          <div className="px-4 pb-4">
            <Button
              className="w-full rounded-xl text-xs"
              variant="outline"
              onClick={() => onOpenApplyTemplate(tpl)}
            >
              Aplicar a mi plan…
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
