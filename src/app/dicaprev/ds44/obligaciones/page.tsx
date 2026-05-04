"use client";

import React, { useState } from "react";
import { FileCheck2, Link2, Eye, Download, X } from "lucide-react";
import StandardPageHeader from "@/components/layout/StandardPageHeader";

type CompanySize = "micro" | "pequena" | "mediana" | "grande";

type ObligacionDS44 = {
  obligacion: string;
  tipo: string;
  micro: boolean;
  pequena: boolean;
  mediana: boolean;
  grande: boolean;
  responsable: string;
  frecuencia: string;
};

type LinkedDoc = {
  nombre: string;
  fecha: string;
  responsable: string;
  origen: string;
};

// ===== Matriz DS44 por tamaño de empresa (mock) =====
const OBLIGACIONES_DS44: ObligacionDS44[] = [
  {
    obligacion: "FUF Obra / Puesta en Marcha",
    tipo: "Documento sanitario / autorización de funcionamiento",
    micro: false,
    pequena: true,
    mediana: true,
    grande: true,
    responsable: "Prevencionista / Representante legal",
    frecuencia: "Por obra o inicio de faena",
  },
  {
    obligacion: "Plan de emergencia y evacuación actualizado",
    tipo: "Plan / Procedimiento",
    micro: true,
    pequena: true,
    mediana: true,
    grande: true,
    responsable: "Encargado de Emergencias / Prevención",
    frecuencia: "Al menos anual o cuando cambie la condición",
  },
  {
    obligacion: "Reglamento Interno de Higiene y Seguridad",
    tipo: "Reglamento interno",
    micro: false,
    pequena: true,
    mediana: true,
    grande: true,
    responsable: "RRHH / Representante legal",
    frecuencia: "Según cambios normativos u organizacionales",
  },
  {
    obligacion:
      "Matriz de Identificación de Peligros y Evaluación de Riesgos (IPER)",
    tipo: "Matriz de riesgos",
    micro: true,
    pequena: true,
    mediana: true,
    grande: true,
    responsable: "Prevencionista",
    frecuencia: "Inicial y al menos anual",
  },
  {
    obligacion: "Programa anual de trabajo en prevención",
    tipo: "Programa de gestión",
    micro: true,
    pequena: true,
    mediana: true,
    grande: true,
    responsable: "Prevención / Gerencia",
    frecuencia: "Anual",
  },
  {
    obligacion: "Registros de accidentes del trabajo y de trayecto",
    tipo: "Registro obligatorio",
    micro: true,
    pequena: true,
    mediana: true,
    grande: true,
    responsable: "Prevención / RRHH",
    frecuencia: "Cada evento",
  },
  {
    obligacion: "Investigación de accidentes y casi accidentes",
    tipo: "Investigación / Registro",
    micro: true,
    pequena: true,
    mediana: true,
    grande: true,
    responsable: "Prevención / Jefaturas",
    frecuencia: "Cada evento con lesión o incidente grave",
  },
  {
    obligacion: "Conformación y funcionamiento del Comité Paritario",
    tipo: "Estructura / Comité",
    micro: false,
    pequena: false,
    mediana: true,
    grande: true,
    responsable: "Empresa y trabajadores",
    frecuencia: "Sesiones mensuales con actas",
  },
  {
    obligacion:
      "Constitución y registros de Comité de Seguridad en faenas especiales",
    tipo: "Comité específico",
    micro: false,
    pequena: false,
    mediana: true,
    grande: true,
    responsable: "Mandante / Contratistas",
    frecuencia: "Según tipo de faena y nº de trabajadores",
  },
  {
    obligacion: "Procedimientos de trabajo seguro para tareas críticas",
    tipo: "Procedimientos escritos",
    micro: true,
    pequena: true,
    mediana: true,
    grande: true,
    responsable: "Prevención / Áreas técnicas",
    frecuencia: "Previo a ejecución y revisión periódica",
  },
  {
    obligacion:
      "Programa de capacitación en SST (inducción, riesgos críticos, EPP)",
    tipo: "Capacitación / Formación",
    micro: true,
    pequena: true,
    mediana: true,
    grande: true,
    responsable: "Prevención / RRHH",
    frecuencia: "Al ingreso y según programa anual",
  },
  {
    obligacion:
      "Registro de entrega y uso de Elementos de Protección Personal (EPP)",
    tipo: "Registro / Evidencia",
    micro: true,
    pequena: true,
    mediana: true,
    grande: true,
    responsable: "Jefatura / Bodega / Prevención",
    frecuencia: "Continuo, según reposición y cambios",
  },
  {
    obligacion:
      "Inspecciones periódicas de orden, aseo y condiciones generales de seguridad",
    tipo: "Inspecciones planeadas",
    micro: true,
    pequena: true,
    mediana: true,
    grande: true,
    responsable: "Prevención / Supervisores",
    frecuencia: "Mensual o según criticidad",
  },
  {
    obligacion:
      "Revisión y mantención de equipos de emergencia (extintores, alarmas, iluminación)",
    tipo: "Mantención preventiva",
    micro: true,
    pequena: true,
    mediana: true,
    grande: true,
    responsable: "Mantención / Proveedor autorizado",
    frecuencia: "Según plan y norma técnica",
  },
  {
    obligacion:
      "Control de señalización de seguridad y vías de evacuación despejadas",
    tipo: "Condición física del lugar de trabajo",
    micro: true,
    pequena: true,
    mediana: true,
    grande: true,
    responsable: "Prevención / Supervisores",
    frecuencia: "Revisión mensual o en cada cambio de layout",
  },
  {
    obligacion:
      "Evaluación de condiciones ambientales (iluminación, ruido, ventilación)",
    tipo: "Evaluación técnica",
    micro: false,
    pequena: true,
    mediana: true,
    grande: true,
    responsable: "Prevención / Servicios externos",
    frecuencia: "Según riesgo, al menos bianual",
  },
  {
    obligacion:
      "Coordinación con empresas contratistas (obligaciones compartidas)",
    tipo: "Gestión de contratistas",
    micro: false,
    pequena: true,
    mediana: true,
    grande: true,
    responsable: "Mandante / Prevención",
    frecuencia: "Antes de inicio de servicios y revisión periódica",
  },
  {
    obligacion:
      "Plan de manejo de emergencias específicas (incendio, derrame, sismo)",
    tipo: "Plan específico",
    micro: true,
    pequena: true,
    mediana: true,
    grande: true,
    responsable: "Prevención / Comité de Emergencias",
    frecuencia: "Revisión anual y después de simulacros o eventos reales",
  },
];

const sizeLabelMap: Record<CompanySize, string> = {
  micro: "Microempresa (1–9)",
  pequena: "Pequeña (10–49)",
  mediana: "Mediana (50–199)",
  grande: "Grande (200+)",
};

const DS44ObligacionesPage: React.FC = () => {
  const [companySize, setCompanySize] = useState<CompanySize>("mediana");

  const [expandedObligation, setExpandedObligation] = useState<string | null>(
    null
  );
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [selectedObligation, setSelectedObligation] =
    useState<string | null>(null);

  // documentos ya vinculados (mock)
  const [linkedDocs, setLinkedDocs] = useState<Record<string, LinkedDoc[]>>({
    "FUF Obra / Puesta en Marcha": [
      {
        nombre: "FUF Obra Atenas 2025.pdf",
        fecha: "10-10-2025",
        responsable: "Constanza Pérez",
        origen: "Documentos por Obra",
      },
    ],
    "Plan de emergencia y evacuación actualizado": [
      {
        nombre: "Plan Emergencia Casa Matriz v3.pdf",
        fecha: "01-09-2025",
        responsable: "Carlos Rojas",
        origen: "Documentos Generales",
      },
    ],
  });

  // catálogo mock de documentos disponibles en el módulo de Documentación
  const docsCatalog: LinkedDoc[] = [
    {
      nombre: "Política SST 2025.pdf",
      fecha: "01-03-2025",
      responsable: "Prevención",
      origen: "Documentos Generales",
    },
    {
      nombre: "Reglamento Interno v2.pdf",
      fecha: "15-04-2025",
      responsable: "RRHH",
      origen: "Documentos Generales",
    },
    {
      nombre: "Plan Emergencia Casa Matriz v3.pdf",
      fecha: "01-09-2025",
      responsable: "Prevención",
      origen: "Documentos Generales",
    },
    {
      nombre: "FUF Obra Atenas 2025.pdf",
      fecha: "10-10-2025",
      responsable: "Prevención",
      origen: "Documentos por Obra",
    },
    {
      nombre: "Matriz IPER Global.xlsx",
      fecha: "20-08-2025",
      responsable: "Prevención",
      origen: "Documentos Generales",
    },
  ];

  const [selectedDocsForLink, setSelectedDocsForLink] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = OBLIGACIONES_DS44.filter((o) => o[companySize]);

  const getLinkedFor = (obligacion: string) => linkedDocs[obligacion] ?? [];

  const handleOpenLinkModal = (obligacion: string) => {
    setSelectedObligation(obligacion);
    const alreadyLinked = linkedDocs[obligacion]?.map((d) => d.nombre) ?? [];
    setSelectedDocsForLink(alreadyLinked);
    setSearchTerm("");
    setLinkModalOpen(true);
  };

  const handleConfirmLink = () => {
    if (selectedObligation) {
      const docsToAdd = docsCatalog.filter((d) =>
        selectedDocsForLink.includes(d.nombre)
      );

      setLinkedDocs((prev) => {
        const existing = prev[selectedObligation] ?? [];
        const merged = [
          ...existing,
          ...docsToAdd.filter(
            (d) => !existing.some((e) => e.nombre === d.nombre)
          ),
        ];

        return {
          ...prev,
          [selectedObligation]: merged,
        };
      });
    }
    setLinkModalOpen(false);
  };

  const handleUnlinkDoc = (obligacion: string, docNombre: string) => {
    const confirmed = window.confirm(
      `¿Seguro que quieres desvincular el documento:\n\n${docNombre}\n\nde la obligación:\n${obligacion}?`
    );
    if (!confirmed) return;

    setLinkedDocs((prev) => {
      const existing = prev[obligacion] ?? [];
      const updated = existing.filter((d) => d.nombre !== docNombre);

      const next = { ...prev };
      if (updated.length > 0) {
        next[obligacion] = updated;
      } else {
        delete next[obligacion];
      }
      return next;
    });
  };

  // Exportador genérico a CSV con extensión según formato elegido
  const exportMatrix = (format: "xlsx" | "pdf" | "csv") => {
    const header = [
      "Obligación",
      "Tipo",
      "Responsable sugerido",
      "Frecuencia",
    ];
    const rows = filtered.map((o) => [
      o.obligacion,
      o.tipo,
      o.responsable,
      o.frecuencia,
    ]);

    const csvContent = [header, ...rows]
      .map((cols) =>
        cols
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(";")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `DS44_Matriz_${companySize}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const [showFormats, setShowFormats] = useState(false);

  const filteredDocsCatalog = docsCatalog.filter((d) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      d.nombre.toLowerCase().includes(term) ||
      d.origen.toLowerCase().includes(term) ||
      d.responsable.toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-6 md:px-8">
      <div className="mb-6">
        <StandardPageHeader
          moduleLabel="DS44"
          title="Centro DS44 - Obligaciones"
          description="Matriz de obligaciones mínimas según tamaño de empresa, vinculadas a la documentación existente."
          icon={FileCheck2}
          actions={
            <div className="flex flex-col items-end gap-2 text-xs md:text-sm">
              <span className="text-slate-500">Perfil de empresa actual:</span>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                {sizeLabelMap[companySize]}
              </span>
            </div>
          }
        />
      </div>

      {/* Filtros superiores y exportación */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs md:text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Ver obligaciones para:</span>
          <select
            className="border border-gray-300 rounded-lg px-2 py-1 bg-white text-gray-700 text-xs md:text-sm"
            value={companySize}
            onChange={(e) =>
              setCompanySize(e.target.value as CompanySize)
            }
          >
            <option value="micro">Microempresa</option>
            <option value="pequena">Pequeña</option>
            <option value="mediana">Mediana</option>
            <option value="grande">Grande</option>
          </select>
        </div>

        <div className="relative">
          <button
            className="px-3 py-1.5 rounded-lg text-xs md:text-sm border border-gray-300 hover:bg-gray-100 bg-white"
            onClick={() => setShowFormats((prev) => !prev)}
          >
            Exportar matriz
          </button>
          {showFormats && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-20 text-xs">
              <button
                className="w-full text-left px-3 py-2 hover:bg-gray-50"
                onClick={() => {
                  setShowFormats(false);
                  exportMatrix("xlsx");
                }}
              >
                Excel (.xlsx)
              </button>
              <button
                className="w-full text-left px-3 py-2 hover:bg-gray-50"
                onClick={() => {
                  setShowFormats(false);
                  exportMatrix("pdf");
                }}
              >
                PDF (.pdf)
              </button>
              <button
                className="w-full text-left px-3 py-2 hover:bg-gray-50"
                onClick={() => {
                  setShowFormats(false);
                  exportMatrix("csv");
                }}
              >
                CSV (.csv)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabla principal */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-sm">
        <table className="w-full text-xs md:text-sm">
          <thead className="text-gray-500 border-b">
            <tr>
              <th className="py-2 text-left">Obligación</th>
              <th className="py-2 text-left">Tipo</th>
              <th className="py-2 text-left">Responsable sugerido</th>
              <th className="py-2 text-left">Frecuencia</th>
              <th className="py-2 text-left">Documentos vinculados</th>
            </tr>
          </thead>
          <tbody className="text-gray-700">
            {filtered.map((o, idx) => {
              const docs = getLinkedFor(o.obligacion);
              const isExpanded = expandedObligation === o.obligacion;

              return (
                <React.Fragment key={idx}>
                  <tr className="border-b last:border-0 align-top">
                    <td className="py-1.5 pr-2 align-top max-w-xs md:max-w-md">
                      {o.obligacion}
                    </td>
                    <td className="py-1.5 pr-2 align-top text-gray-500">
                      {o.tipo}
                    </td>
                    <td className="py-1.5 pr-2 align-top">
                      {o.responsable}
                    </td>
                    <td className="py-1.5 pr-2 align-top text-gray-500">
                      {o.frecuencia}
                    </td>
                    <td className="py-1.5 pr-2 align-top">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] font-medium ${
                            docs.length
                              ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                              : "border-gray-200 text-gray-400 bg-gray-50 cursor-default"
                          }`}
                          onClick={() =>
                            docs.length &&
                            setExpandedObligation((curr) =>
                              curr === o.obligacion ? null : o.obligacion
                            )
                          }
                        >
                          <FileCheck2 className="w-3 h-3" />
                          {docs.length
                            ? `Documentos (${docs.length})`
                            : "Sin documentos"}
                        </button>
                        <button
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-emerald-200 text-[11px] font-medium text-emerald-700 bg-white hover:bg-emerald-50"
                          onClick={() => handleOpenLinkModal(o.obligacion)}
                        >
                          <Link2 className="w-3 h-3" />
                          Vincular
                        </button>
                      </div>
                    </td>
                  </tr>

                  {isExpanded && docs.length > 0 && (
                    <tr className="bg-gray-50">
                      <td colSpan={5} className="py-2 px-2">
                        <div className="mt-1 border-t border-gray-200 pt-2">
                          <p className="text-[11px] text-gray-500 mb-2">
                            Documentos vinculados desde el módulo de
                            Documentación:
                          </p>
                          <table className="w-full text-[11px]">
                            <thead className="text-gray-500">
                              <tr>
                                <th className="py-1 text-left">Documento</th>
                                <th className="py-1 text-left">Origen</th>
                                <th className="py-1 text-left">Fecha subida</th>
                                <th className="py-1 text-left">Responsable</th>
                                <th className="py-1 text-left">Acciones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {docs.map((d, i) => (
                                <tr
                                  key={i}
                                  className="border-t border-dashed"
                                >
                                  <td className="py-1 pr-2 align-top">
                                    {d.nombre}
                                  </td>
                                  <td className="py-1 pr-2 align-top text-gray-500">
                                    {d.origen}
                                  </td>
                                  <td className="py-1 pr-2 align-top text-gray-500">
                                    {d.fecha}
                                  </td>
                                  <td className="py-1 pr-2 align-top">
                                    {d.responsable}
                                  </td>
                                  <td className="py-1 pr-2 align-top">
                                    <div className="flex gap-1">
                                      <button className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-gray-300 bg-white hover:bg-gray-100">
                                        <Eye className="w-3 h-3 text-gray-600" />
                                      </button>
                                      <button className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-gray-300 bg-white hover:bg-gray-100">
                                        <Download className="w-3 h-3 text-gray-600" />
                                      </button>
                                      <button
                                        className="inline-flex items-center justify-center w-6 h-6 rounded-full border border-rose-200 bg-white hover:bg-rose-50"
                                        onClick={() =>
                                          handleUnlinkDoc(
                                            o.obligacion,
                                            d.nombre
                                          )
                                        }
                                        title="Desvincular"
                                      >
                                        <X className="w-3 h-3 text-rose-500" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal mock “Vincular documentos” */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Vincular documentos
                </h3>
                <p className="text-sm text-gray-500">
                  Selecciona documentos existentes del módulo de Documentación
                  para respaldar la obligación:
                  <span className="font-medium text-gray-800">
                    {" "}
                    {selectedObligation}
                  </span>
                </p>
              </div>
              <button
                className="p-1.5 rounded-full hover:bg-gray-100"
                onClick={() => setLinkModalOpen(false)}
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Buscador */}
            <div className="mb-3 flex items-center gap-2 text-xs">
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-xs"
                placeholder="Buscar por nombre, origen o responsable..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="mb-3 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                Documentos Generales
              </span>
              <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                Por Obra
              </span>
              <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                Contratistas
              </span>
            </div>

            <div className="border border-gray-200 rounded-lg max-h-64 overflow-auto mb-4">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="py-2 px-3 text-left">Vincular</th>
                    <th className="py-2 px-3 text-left">Documento</th>
                    <th className="py-2 px-3 text-left">Origen</th>
                    <th className="py-2 px-3 text-left">Fecha</th>
                    <th className="py-2 px-3 text-left">Responsable</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {filteredDocsCatalog.map((d, i) => (
                    <tr key={i} className="border-t">
                      <td className="py-1.5 px-3">
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={selectedDocsForLink.includes(d.nombre)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDocsForLink((prev) =>
                                prev.includes(d.nombre)
                                  ? prev
                                  : [...prev, d.nombre]
                              );
                            } else {
                              setSelectedDocsForLink((prev) =>
                                prev.filter((name) => name !== d.nombre)
                              );
                            }
                          }}
                        />
                      </td>
                      <td className="py-1.5 px-3">{d.nombre}</td>
                      <td className="py-1.5 px-3 text-gray-500">
                        {d.origen}
                      </td>
                      <td className="py-1.5 px-3 text-gray-500">
                        {d.fecha}
                      </td>
                      <td className="py-1.5 px-3">{d.responsable}</td>
                    </tr>
                  ))}
                  {filteredDocsCatalog.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-3 px-3 text-center text-gray-400 text-xs"
                      >
                        No se encontraron documentos para el criterio de
                        búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100"
                onClick={() => setLinkModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={handleConfirmLink}
              >
                Vincular selección
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DS44ObligacionesPage;
