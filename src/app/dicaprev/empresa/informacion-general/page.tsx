"use client";

import React from "react";
import { Building2, MapPin, Users, FileText } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";

const EMPRESA = {
  razonSocial: "MVP CHILE SPA",
  rut: "76.653.076-1",
  giroComercial: "Fabricación e instalación de ventanas de PVC y aluminio",
  tipo: "Sociedad por Acciones (SpA)",
  tamano: "Pequeña (1–50 trabajadores)",
  codigoCIIU: "2330 – Fabricación de ventanas y puertas de materiales sintéticos",
  inicioActividades: "3 de agosto de 2019",
  direccion: "Avenida Irarrázabal 5185, oficina 503",
  ciudad: "Ñuñoa, Santiago",
  region: "Región Metropolitana",
  telefono: "+56 2 2987 6543",
  correo: "administracion@mvpchile.cl",
  web: "www.mvpchile.cl",
  representanteLegal: "Jorge Mena Contreras",
  rutRepresentante: "11.234.567-8",
  mutualidad: "ACHS",
  cotizacionAdicional: "1,70%",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-3 border-b border-slate-100 last:border-0">
      <span className="text-xs font-bold uppercase tracking-widest text-slate-400 sm:w-56 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-sm text-slate-800">{value}</span>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/60">
        <span className="text-slate-500">{icon}</span>
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-600">{title}</h2>
      </div>
      <div className="px-6 divide-y divide-slate-100">{children}</div>
    </div>
  );
}

export default function InformacionGeneralPage() {
  return (
    <div className="space-y-6 p-6">
      <StandardPageHeader
        moduleLabel="Módulo Empresa"
        title="Información general"
        description="Datos legales, tributarios y de contacto de la empresa."
        icon={<Building2 className="h-6 w-6" />}
      />

      <div className="space-y-4">
        <SectionCard
          title="Identificación tributaria"
          icon={<FileText className="h-5 w-5" />}
        >
          <Field label="Razón social" value={EMPRESA.razonSocial} />
          <Field label="RUT" value={EMPRESA.rut} />
          <Field label="Giro comercial" value={EMPRESA.giroComercial} />
          <Field label="Tipo de empresa" value={EMPRESA.tipo} />
          <Field label="Tamaño" value={EMPRESA.tamano} />
          <Field label="Código CIIU" value={EMPRESA.codigoCIIU} />
          <Field label="Inicio de actividades" value={EMPRESA.inicioActividades} />
        </SectionCard>

        <SectionCard
          title="Ubicación y contacto"
          icon={<MapPin className="h-5 w-5" />}
        >
          <Field label="Dirección" value={EMPRESA.direccion} />
          <Field label="Ciudad" value={EMPRESA.ciudad} />
          <Field label="Región" value={EMPRESA.region} />
          <Field label="Teléfono" value={EMPRESA.telefono} />
          <Field label="Correo" value={EMPRESA.correo} />
          <Field label="Sitio web" value={EMPRESA.web} />
        </SectionCard>

        <SectionCard
          title="Datos operacionales"
          icon={<Users className="h-5 w-5" />}
        >
          <Field label="Representante legal" value={EMPRESA.representanteLegal} />
          <Field label="RUT representante" value={EMPRESA.rutRepresentante} />
          <Field label="Mutualidad" value={EMPRESA.mutualidad} />
          <Field label="Cotización adicional" value={EMPRESA.cotizacionAdicional} />
        </SectionCard>
      </div>
    </div>
  );
}
