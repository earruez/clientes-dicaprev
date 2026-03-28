"use client";

import React, { useState } from "react";

type ModalType =
  | "matrizDs44"
  | "crearObra"
  | "editarObra"
  | "filtroAvanzado"
  | "crearTrabajador"
  | "verDocumentos"
  | "regularizacion"
  | null;

type Trabajador = {
  id: number;
  nombre: string;
  cargo: string;
  obraId: number | null; // null = sin centro asignado
  vigente: boolean;
};

const OBRAS_MOCK = Array.from({ length: 10 }).map((_, i) => ({
  id: i + 1,
  nombre: `Obra ${i + 1} · Condominio Los Álamos`,
  direccion: "Av. Lorem Ipsum 1234, Santiago",
  documentosActuales: 32 + ((i * 3) % 5),
  documentosTotales: 45,
  trabajadores: 12 + i,
  cumplimiento: 0.6 + (i % 3) * 0.08,
  ultimaActualizacion: "12-11-2025",
  activa: i % 4 !== 0, // algunas activas, otras inactivas (demo)
}));

const TRABAJADORES_INICIALES: Trabajador[] = [
  { id: 1, nombre: "Juan Pérez", cargo: "Maestro", obraId: 1, vigente: true },
  {
    id: 2,
    nombre: "María González",
    cargo: "Prevencionista",
    obraId: 1,
    vigente: true,
  },
  { id: 3, nombre: "Pedro Soto", cargo: "Supervisor", obraId: 2, vigente: true },
  { id: 4, nombre: "Ana Rojas", cargo: "Maestro", obraId: 3, vigente: true },
  {
    id: 5,
    nombre: "Luis Díaz",
    cargo: "Maestro",
    obraId: null, // sin obra asignada
    vigente: false,
  },
];

export default function CentroTrabajoSubmenuMock() {
  const [obraPage, setObraPage] = useState(0);
  const [showWorkerPanel, setShowWorkerPanel] = useState(true);
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [workerPanelTab, setWorkerPanelTab] = useState("perfil");

  const [selectedObraId, setSelectedObraId] = useState<number | null>(null);
  const [workers] = useState<Trabajador[]>(TRABAJADORES_INICIALES);
  const [showOnlySelectedObraWorkers, setShowOnlySelectedObraWorkers] =
    useState(false);

  // OBRAS visibles (carrusel)
  const pageSize = 3;
  const totalPages = Math.ceil(OBRAS_MOCK.length / pageSize);
  const visibleObras = OBRAS_MOCK.slice(
    obraPage * pageSize,
    obraPage * pageSize + pageSize
  );

  // Obra usada como referencia para filtros de trabajadores (por ahora sólo mock)
  const currentFilterObraId =
    selectedObraId ?? visibleObras[0]?.id ?? null;

  const workersToDisplay =
    showOnlySelectedObraWorkers && currentFilterObraId
      ? workers.filter((w) => w.obraId === currentFilterObraId)
      : workers;

  // handlers del carrusel
  const handlePrevPage = () => {
    setObraPage((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNextPage = () => {
    setObraPage((prev) => (prev < totalPages - 1 ? prev + 1 : prev));
  };

  // Abrir modal premium de detalle de obra
  const handleVerDetalleObra = (obraId: number) => {
    setSelectedObraId(obraId);
    setOpenModal("editarObra");
  };

  const renderModal = () => {
    if (!openModal) return null;

    // 🔹 Modal especial: Ver matriz DS44
    if (openModal === "matrizDs44") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl p-6 space-y-5">
            {/* HEADER */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Matriz DS44 · Resumen por Centro de Trabajo
                </h2>
                <p className="text-xs text-slate-500 max-w-2xl">
                  Vista consolidada de obligaciones DS44: plan de trabajo, comité
                  paritario, reglamento interno, investigaciones de accidentes y
                  registros clave. En la versión conectada, este panel se alimenta
                  directo de tu matriz real.
                </p>
              </div>
              <button
                onClick={() => setOpenModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            {/* RESUMEN DE INDICADORES DS44 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wide text-emerald-700">
                  Obligaciones totales
                </span>
                <span className="text-xl font-semibold text-emerald-700">32</span>
                <span className="text-[11px] text-emerald-700/80">
                  DS44 · todas las obras
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wide text-slate-500">
                  Cumplidas
                </span>
                <span className="text-xl font-semibold text-emerald-600">24</span>
                <span className="text-[11px] text-slate-500">75% de avance</span>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wide text-amber-700">
                  Por vencer
                </span>
                <span className="text-xl font-semibold text-amber-600">5</span>
                <span className="text-[11px] text-amber-700/80">
                  Próx. 30 días
                </span>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-wide text-rose-700">
                  Vencidas
                </span>
                <span className="text-xl font-semibold text-rose-600">3</span>
                <span className="text-[11px] text-rose-700/80">
                  Requiere acción inmediata
                </span>
              </div>
            </div>

            {/* TABLA MOCK DE OBLIGACIONES DS44 */}
            <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                <span>Obligaciones DS44 por centro de trabajo</span>
                <span className="text-slate-400">
                  Vista demo · la versión real permite exportar a Excel / PDF
                </span>
              </div>
              <div className="max-h-72 overflow-auto text-xs">
                <table className="min-w-full text-left">
                  <thead className="bg-slate-50 text-[11px] text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Centro de trabajo</th>
                      <th className="px-4 py-2 font-medium">Obligación</th>
                      <th className="px-4 py-2 font-medium">Responsable</th>
                      <th className="px-4 py-2 font-medium">Estado</th>
                      <th className="px-4 py-2 font-medium">Plazo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-2">
                        Obra 1 · Condominio Los Álamos
                      </td>
                      <td className="px-4 py-2">Plan de trabajo DS44</td>
                      <td className="px-4 py-2">Prevencionista</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 rounded-full text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Cumplida
                        </span>
                      </td>
                      <td className="px-4 py-2">30-09-2025</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">
                        Obra 2 · Condominio Los Álamos
                      </td>
                      <td className="px-4 py-2">
                        Constitución Comité Paritario
                      </td>
                      <td className="px-4 py-2">RRHH / Mandante</td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 rounded-full text-[11px] bg-amber-50 text-amber-700 border border-amber-100">
                          Por vencer
                        </span>
                      </td>
                      <td className="px-4 py-2">15-12-2025</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">
                        Obra 3 · Condominio Los Álamos
                      </td>
                      <td className="px-4 py-2">Investigación de accidente</td>
                      <td className="px-4 py-2">
                        Prevencionista / Jefe de Obra
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-1 rounded-full text-[11px] bg-rose-50 text-rose-700 border border-rose-100">
                          Vencida
                        </span>
                      </td>
                      <td className="px-4 py-2">05-11-2025</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* FOOTER */}
            <div className="flex items-center justify-between gap-3 pt-1 text-xs">
              <p className="text-[11px] text-slate-500 max-w-md">
                En la versión conectada podrás hacer clic en cada obligación para
                abrir el detalle, adjuntar respaldos, asignar responsables y
                registrar comentarios de seguimiento.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpenModal(null)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cerrar
                </button>
                <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow">
                  Exportar (mock)
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 🔹 Modal especial: Filtro avanzado de trabajadores
    if (openModal === "filtroAvanzado") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 space-y-5">
            {/* HEADER */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Filtro avanzado de trabajadores
                </h2>
                <p className="text-xs text-slate-500 max-w-2xl">
                  Combina filtros por obra, categoría documental, riesgos
                  asociados, cargo y estado de cumplimiento para focalizar las
                  brechas críticas antes de una fiscalización.
                </p>
              </div>
              <button
                onClick={() => setOpenModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            {/* FORMULARIO FILTROS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-700">
                  Obra / Centro de trabajo
                </label>
                <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option>Todas las obras</option>
                  {OBRAS_MOCK.slice(0, 5).map((obra) => (
                    <option key={obra.id}>{obra.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-700">
                  Categoría documental
                </label>
                <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option>Todas las categorías</option>
                  <option>Legales</option>
                  <option>Exámenes</option>
                  <option>Capacitaciones</option>
                  <option>EPP</option>
                  <option>Permisos especiales</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-700">
                  Riesgos asociados
                </label>
                <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option>Todos los riesgos</option>
                  <option>Trabajo en altura</option>
                  <option>Espacios confinados</option>
                  <option>Maquinaria pesada</option>
                  <option>Electricidad</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-700">
                  Estado de cumplimiento
                </label>
                <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option>Todos los estados</option>
                  <option>Solo vigentes</option>
                  <option>Solo por vencer</option>
                  <option>Solo vencidos</option>
                  <option>Sin documentación</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-700">
                  Rango de vencimiento
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                  <input
                    type="date"
                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                </div>
              </div>
            </div>

            {/* CHIP RESUMEN / NOTA */}
            <div className="border border-dashed border-emerald-200 rounded-2xl bg-emerald-50/40 px-4 py-3 text-[11px] text-emerald-800 flex items-start gap-2">
              <span className="mt-0.5">⚙️</span>
              <p>
                En la versión funcional, este filtro actuará sobre la grilla de
                trabajadores a la izquierda, mostrando solo quienes cumplan con
                los criterios seleccionados y permitiendo exportar el resultado.
              </p>
            </div>

            {/* FOOTER BOTONES */}
            <div className="flex items-center justify-between gap-3 pt-1 text-xs">
              <button className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">
                Limpiar filtros
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpenModal(null)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cerrar
                </button>
                <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow">
                  Aplicar filtros (mock)
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 🔹 Modal especial para + Crear Obra
    if (openModal === "crearObra") {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 space-y-5">
            {/* HEADER */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Crear nueva Obra / Centro de Trabajo
                </h2>
                <p className="text-xs text-slate-500 max-w-xl">
                  Registra una nueva obra con los datos clave para la
                  trazabilidad: mandante, dirección, fechas y responsable de
                  prevención.
                </p>
              </div>
              <button
                onClick={() => setOpenModal(null)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            {/* FORMULARIO PRINCIPAL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-700">
                  Nombre de la obra
                </label>
                <input
                  className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="Ej: Condominio Los Álamos Etapa 2"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-700">
                  Código interno
                </label>
                <input
                  className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="OB-2025-001"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-700">
                  Mandante / Cliente
                </label>
                <input
                  className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="Ej: Inmobiliaria Andes SpA"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-700">
                  Responsable de obra
                </label>
                <input
                  className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="Nombre del administrador / jefe de obra"
                />
              </div>

              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[11px] font-medium text-slate-700">
                  Dirección
                </label>
                <input
                  className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  placeholder="Calle, número, comuna, ciudad"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-700">
                  Fecha de inicio (estimada)
                </label>
                <input
                  type="date"
                  className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-700">
                  Fecha de término (estimada)
                </label>
                <input
                  type="date"
                  className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-700">
                  Estado
                </label>
                <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option>Activa</option>
                  <option>En planificación</option>
                  <option>Inactiva / Cerrada</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-medium text-slate-700">
                  Tipo de obra
                </label>
                <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option>Edificación en altura</option>
                  <option>Edificación en extensión</option>
                  <option>Industrial</option>
                  <option>Obra vial</option>
                  <option>Otro</option>
                </select>
              </div>
            </div>

            {/* BLOQUE DS44 / PREVENCIÓN */}
            <div className="border border-slate-100 rounded-2xl bg-slate-50/60 p-4 text-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] font-medium text-slate-800">
                    Configuración de DS44 y prevención
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Estos datos permiten generar el plan de trabajo DS44, matrices
                    y reportes de cumplimiento por centro de trabajo.
                  </p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                  DS44
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-slate-700">
                    Prevencionista asignado
                  </label>
                  <input
                    className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    placeholder="Nombre del prevencionista"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-slate-700">
                    Jornada del prevencionista
                  </label>
                  <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200">
                    <option>Tiempo completo</option>
                    <option>Tiempo parcial</option>
                    <option>Visitas programadas</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Generar plan de trabajo DS44
                </span>
                <span className="text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  Incluir en dashboard de cumplimiento
                </span>
              </div>
            </div>

            {/* FOOTER BOTONES */}
            <div className="flex items-center justify-between gap-3 pt-2 text-xs">
              <p className="text-[11px] text-slate-500 max-w-xs">
                En la versión conectada, esta acción creará el registro de la
                obra en Firestore y la incorporará al carrusel de centros de
                trabajo.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpenModal(null)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow">
                  Guardar obra (mock)
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // 🔹 Modal genérico para el resto de opciones
    let title = "";
    let description = "";

    switch (openModal) {
      case "editarObra":
        title = "Editar Obra (activa o inactiva)";
        description =
          "En la versión funcional podrás editar datos de una obra incluso si está inactiva: actualizar mandante, observaciones, fechas de término, o reactivarla según tu flujo interno.";
        break;
      case "crearTrabajador":
        title = "Crear trabajador";
        description =
          "Alta de trabajador con datos personales, cargo, obra asignada, riesgos asociados y configuración de requisitos automáticos según DS44.";
        break;
      case "verDocumentos":
        title = "Detalle de documentos del trabajador";
        description =
          "Vista detallada con pestañas para documentos, certificaciones, historial y carga de nuevos documentos.";
        break;
      case "regularizacion":
        title = "Solicitud de regularización";
        description =
          "Aquí configurarás el envío de solicitudes al administrador de obra y el seguimiento del workflow de regularización.";
        break;
      default:
        title = "";
        description = "";
    }

    if (!title) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <button
              onClick={() => setOpenModal(null)}
              className="text-slate-400 hover:text-slate-700 text-sm"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-slate-500">{description}</p>
          <div className="mt-2 flex justify-end gap-2 text-xs">
            <button
              onClick={() => setOpenModal(null)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Cerrar
            </button>
            <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow">
              Guardar (mock)
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 p-8 flex flex-col gap-8">
      {/* HEADER PREMIUM */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">
              Obras / Centros de Trabajo
            </h1>
            <p className="text-sm text-slate-500 max-w-xl mt-1">
              Gestiona la documentación y cumplimiento de cada centro de trabajo, sus
              trabajadores y requisitos normativos asociados (DS44, reglamentos internos, EPP y más).
            </p>
          </div>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm shadow-sm hover:bg-emerald-100"
              onClick={() => setOpenModal("matrizDs44")}
            >
              Ver matriz DS44
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-medium shadow-lg hover:brightness-105"
              onClick={() => setOpenModal("crearObra")}
            >
              + Crear Obra
            </button>
          </div>
        </div>

        {/* INDICADORES GLOBALES */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Trabajadores totales</span>
            <span className="text-2xl font-semibold text-slate-900">126</span>
            <span className="text-[11px] text-emerald-600">+4 ingresados este mes</span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Cumplimiento global</span>
            <span className="text-2xl font-semibold text-emerald-600">84%</span>
            <span className="text-[11px] text-slate-500">Meta mínima sugerida: 80%</span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Docs faltantes</span>
            <span className="text-2xl font-semibold text-amber-500">19</span>
            <span className="text-[11px] text-amber-600">Revisar antes de fiscalización</span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Alertas por vencer</span>
            <span className="text-2xl font-semibold text-orange-500">11</span>
            <span className="text-[11px] text-orange-600">Próx. 30 días</span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-slate-400">Docs vencidos</span>
            <span className="text-2xl font-semibold text-rose-500">6</span>
            <span className="text-[11px] text-rose-600">Prioridad alta</span>
          </div>
        </div>
      </div>

      {/* TARJETAS RESUMEN DE OBRAS CON CARRUSEL */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-800">Obras activas e inactivas</h2>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>
              Página {obraPage + 1} de {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={handlePrevPage}
                disabled={obraPage === 0}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs disabled:opacity-40"
              >
                ◀
              </button>
              <button
                onClick={handleNextPage}
                disabled={obraPage === totalPages - 1}
                className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs disabled:opacity-40"
              >
                ▶
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleObras.map((obra) => (
            <div
              key={obra.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 hover:shadow-md hover:-translate-y-[2px] transition cursor-pointer flex flex-col gap-3"
            >
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">{obra.nombre}</h2>
                  <p className="text-xs text-slate-500">{obra.direccion}</p>
                </div>
                {obra.activa ? (
                  <span className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    Activa · DS44
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                    Inactiva
                  </span>
                )}
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>
                  Documentos: <strong>{obra.documentosActuales} / {obra.documentosTotales}</strong>
                </span>
                <span>
                  Trabajadores: <strong>{obra.trabajadores}</strong>
                </span>
              </div>
              <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                  style={{ width: `${obra.cumplimiento * 100}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-1 text-[11px]">
                <span className="text-slate-500">
                  Última actualización: {obra.ultimaActualizacion}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    className="text-emerald-700 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVerDetalleObra(obra.id);
                    }}
                  >
                    Ver detalle
                  </button>
                  <button
                    className="text-slate-500 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVerDetalleObra(obra.id);
                    }}
                  >
                    Editar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CUERPO PRINCIPAL: LISTA TRABAJADORES + PANEL LATERAL */}
      <div
        className={
          "grid gap-6 items-start " +
          (showWorkerPanel ? "xl:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)]" : "grid-cols-1")
        }
      >
        {/* SECCIÓN DOCUMENTACIÓN DE TRABAJADORES */}
        <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col gap-6 border border-slate-100">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Documentación de Trabajadores</h2>
              <p className="text-xs text-slate-500 max-w-xl mt-1">
                Revisa el cumplimiento documental por trabajador: contratos, exámenes, capacitaciones,
                EPP, permisos especiales y más, agrupados por categoría normativa.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                onClick={() => setOpenModal("filtroAvanzado")}
              >
                Filtro avanzado
              </button>
              <button
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-105 text-white text-xs px-4 py-2 rounded-xl shadow"
                onClick={() => setOpenModal("crearTrabajador")}
              >
                + Crear Trabajador
              </button>
            </div>
          </div>

          {/* FILTROS RÁPIDOS */}
          <div className="flex flex-wrap gap-3">
            <input
              placeholder="Buscar trabajador por nombre o RUT..."
              className="border border-slate-200 rounded-xl px-4 py-2 text-sm w-full md:w-72 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs">
              <option>Todos los requisitos</option>
              <option>Trabajo en Altura</option>
              <option>Espacios Confinados</option>
              <option>Certificación Maquinaria</option>
              <option>EPP Obligatorio</option>
            </select>
            <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs">
              <option>Todos los estados</option>
              <option>Vigente</option>
              <option>Por vencer</option>
              <option>Vencido</option>
            </select>
            <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs">
              <option>Todos los cargos</option>
              <option>Maestro</option>
              <option>Prevencionista</option>
              <option>Supervisor</option>
            </select>
          </div>

          {/* LISTA MOCK DE TRABAJADORES (puedes cambiar a workersToDisplay.map más adelante) */}
          <div className="flex flex-col gap-4 mt-2">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-[1px] transition bg-slate-50/60"
              >
                {/* HEADER DEL TRABAJADOR */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 text-base">
                      Juan Pérez
                    </span>
                    <span className="text-xs text-slate-500">
                      11.111.111-1 · Maestro en Obra 1
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex flex-col text-[11px] text-slate-500">
                      <span>
                        Vigentes:{" "}
                        <strong className="text-emerald-600">14</strong>
                      </span>
                      <span>
                        Vencidos:{" "}
                        <strong className="text-rose-500">2</strong>
                      </span>
                    </div>
                    <div className="flex flex-col text-[11px] text-slate-500">
                      <span>
                        Alertas por vencer:{" "}
                        <strong className="text-amber-500">3</strong>
                      </span>
                      <span>Últ. actualización: 10-11-2025</span>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 text-[11px] px-3 py-1 rounded-full border border-emerald-100">
                      Cumplimiento 82%
                    </span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-slate-500">
                        Estado en esta obra:
                      </span>
                      <select className="border border-slate-200 rounded-lg px-2 py-1 text-[11px]">
                        <option>Asignado</option>
                        <option>Desvinculado</option>
                      </select>
                    </div>
                    <button
                      className="text-[11px] text-emerald-700 hover:underline"
                      onClick={() => setOpenModal("verDocumentos")}
                    >
                      Ver documentos
                    </button>
                  </div>
                </div>

                {/* CATEGORÍAS DOCUMENTALES DESPLEGABLES */}
                <div className="mt-4 flex flex-col gap-3">
                  {/* CATEGORÍA: LEGALES */}
                  <details className="border border-slate-100 rounded-xl bg-white p-3">
                    <summary className="cursor-pointer text-slate-700 font-medium text-sm">
                      Legales
                    </summary>
                    <div className="mt-3 flex flex-col gap-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span>Contrato de Trabajo</span>
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 text-[11px] rounded-full border border-emerald-100">
                          Vigente
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Anexo de Funciones</span>
                        <span className="bg-amber-50 text-amber-700 px-2 py-1 text-[11px] rounded-full border border-amber-100">
                          Por vencer
                        </span>
                      </div>
                    </div>
                  </details>

                  {/* CATEGORÍA: EXÁMENES */}
                  <details className="border border-slate-100 rounded-xl bg-white p-3">
                    <summary className="cursor-pointer text-slate-700 font-medium text-sm">
                      Exámenes Ocupacionales
                    </summary>
                    <div className="mt-3 flex flex-col gap-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span>Examen Altura Física</span>
                        <span className="bg-rose-50 text-rose-700 px-2 py-1 text-[11px] rounded-full border border-rose-100">
                          Vencido
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Examen Preocupacional</span>
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 text-[11px] rounded-full border border-emerald-100">
                          Vigente
                        </span>
                      </div>
                    </div>
                  </details>

                  {/* CATEGORÍA: CAPACITACIONES */}
                  <details className="border border-slate-100 rounded-xl bg-white p-3">
                    <summary className="cursor-pointer text-slate-700 font-medium text-sm">
                      Capacitaciones
                    </summary>
                    <div className="mt-3 flex flex-col gap-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span>Trabajo en Altura</span>
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 text-[11px] rounded-full border border-emerald-100">
                          Vigente
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Espacios Confinados</span>
                        <span className="bg-amber-50 text-amber-700 px-2 py-1 text-[11px] rounded-full border border-amber-100">
                          Por vencer
                        </span>
                      </div>
                    </div>
                  </details>

                  {/* CATEGORÍA: EPP */}
                  <details className="border border-slate-100 rounded-xl bg-white p-3">
                    <summary className="cursor-pointer text-slate-700 font-medium text-sm">
                      EPP Obligatorio
                    </summary>
                    <div className="mt-3 flex flex-col gap-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span>Entrega EPP Inicial</span>
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 text-[11px] rounded-full border border-emerald-100">
                          Vigente
                        </span>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PANEL LATERAL: VER DOCUMENTOS / SOLICITUD REGULARIZACIÓN */}
        {showWorkerPanel && (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Panel del trabajador (vista rápida)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Se actualiza al seleccionar "Ver documentos".
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-[10px] px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                  onClick={() => setShowWorkerPanel(false)}
                >
                  Ocultar panel
                </button>
                <span className="px-2 py-1 rounded-full text-[10px] bg-slate-50 text-slate-500 border border-slate-100">
                  Modo demo
                </span>
              </div>
            </div>

            {/* TABS */}
            <div className="flex gap-2 text-[11px] bg-slate-50 rounded-xl p-1">
              <button
                onClick={() => setWorkerPanelTab("perfil")}
                className={
                  "flex-1 px-2 py-1 rounded-lg " +
                  (workerPanelTab === "perfil"
                    ? "bg-white shadow-sm text-slate-800 font-medium"
                    : "text-slate-500 hover:text-slate-800")
                }
              >
                Perfil
              </button>
              <button
                onClick={() => setWorkerPanelTab("documentos")}
                className={
                  "flex-1 px-2 py-1 rounded-lg " +
                  (workerPanelTab === "documentos"
                    ? "bg-white shadow-sm text-slate-800 font-medium"
                    : "text-slate-500 hover:text-slate-800")
                }
              >
                Documentos
              </button>
              <button
                onClick={() => setWorkerPanelTab("certificaciones")}
                className={
                  "flex-1 px-2 py-1 rounded-lg " +
                  (workerPanelTab === "certificaciones"
                    ? "bg-white shadow-sm text-slate-800 font-medium"
                    : "text-slate-500 hover:text-slate-800")
                }
              >
                Certificaciones
              </button>
              <button
                onClick={() => setWorkerPanelTab("historial")}
                className={
                  "flex-1 px-2 py-1 rounded-lg " +
                  (workerPanelTab === "historial"
                    ? "bg-white shadow-sm text-slate-800 font-medium"
                    : "text-slate-500 hover:text-slate-800")
                }
              >
                Historial
              </button>
              <button
                onClick={() => setWorkerPanelTab("subir")}
                className={
                  "flex-1 px-2 py-1 rounded-lg " +
                  (workerPanelTab === "subir"
                    ? "bg-white shadow-sm text-slate-800 font-medium"
                    : "text-slate-500 hover:text-slate-800")
                }
              >
                Subir doc.
              </button>
            </div>

            {/* CONTENIDO SEGÚN TAB */}
            {workerPanelTab === "perfil" && (
              <div className="mt-1 flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900">
                      Juan Pérez
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Obra 1 · Maestro
                    </span>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 text-[11px] px-3 py-1 rounded-full border border-emerald-100">
                    Cumplimiento 82%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-1 border border-slate-100">
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                      Docs vigentes
                    </span>
                    <span className="text-lg font-semibold text-emerald-600">
                      14
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-1 border border-slate-100">
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                      Vencidos
                    </span>
                    <span className="text-lg font-semibold text-rose-500">
                      2
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-1 border border-slate-100">
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                      Alertas por vencer
                    </span>
                    <span className="text-lg font-semibold text-amber-500">
                      3
                    </span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-1 border border-slate-100">
                    <span className="text-[10px] uppercase tracking-wide text-slate-400">
                      Riesgos asociados
                    </span>
                    <span className="text-[11px] text-slate-600">
                      Altura, carga manual, herramientas
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-1">
                  <span className="text-[11px] font-medium text-slate-700">
                    Dependencias DS44 sugeridas
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-slate-500 flex flex-col gap-0.5">
                    <li>
                      Si realiza trabajo en altura: Examen altura + capacitación
                      altura + EPP asociado.
                    </li>
                    <li>
                      Si manipula maquinaria: Licencia / certificación + inducción
                      específica.
                    </li>
                  </ul>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  <button
                    className="w-full px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium shadow"
                    onClick={() => setOpenModal("regularizacion")}
                  >
                    Generar solicitud de regularización
                  </button>
                  <p className="text-[11px] text-slate-500">
                    La solicitud se envía al administrador de obra y queda
                    registrada en el workflow de pendientes de regularización
                    para seguimiento.
                  </p>
                </div>
              </div>
            )}

            {workerPanelTab === "documentos" && (
              <div className="mt-2 flex flex-col gap-3 text-xs">
                <p className="text-[11px] font-medium text-slate-700">
                  Resumen documental por categoría
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/60">
                    <p className="text-[11px] font-medium text-slate-800">
                      Legales
                    </p>
                    <p className="text-[11px] text-slate-500">2/2 vigentes</p>
                  </div>
                  <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/60">
                    <p className="text-[11px] font-medium text-slate-800">
                      Exámenes
                    </p>
                    <p className="text-[11px] text-slate-500">
                      1 vencido · 2 vigentes
                    </p>
                  </div>
                  <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/60">
                    <p className="text-[11px] font-medium text-slate-800">
                      Capacitaciones
                    </p>
                    <p className="text-[11px] text-slate-500">1 por vencer</p>
                  </div>
                  <div className="border border-slate-100 rounded-xl p-3 bg-slate-50/60">
                    <p className="text-[11px] font-medium text-slate-800">EPP</p>
                    <p className="text-[11px] text-slate-500">
                      Entrega registrada
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  En la versión conectada, aquí verás la grilla completa de
                  documentos del trabajador.
                </p>
              </div>
            )}

            {workerPanelTab === "certificaciones" && (
              <div className="mt-2 flex flex-col gap-3 text-xs">
                <p className="text-[11px] font-medium text-slate-700">
                  Certificaciones vigentes y vencidas
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span>Certificación trabajo en altura</span>
                    <span className="bg-emerald-50 text-emerald-700 text-[11px] px-2 py-1 rounded-full border border-emerald-100">
                      Vigente
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Licencia maquinaria ligera</span>
                    <span className="bg-amber-50 text-amber-700 text-[11px] px-2 py-1 rounded-full border border-amber-100">
                      Por vencer
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Inducción reglamento interno</span>
                    <span className="bg-rose-50 text-rose-700 text-[11px] px-2 py-1 rounded-full border border-rose-100">
                      Vencida
                    </span>
                  </div>
                </div>
              </div>
            )}

            {workerPanelTab === "historial" && (
              <div className="mt-2 flex flex-col gap-3 text-xs">
                <p className="text-[11px] font-medium text-slate-700">
                  Historial de movimientos
                </p>
                <ul className="flex flex-col gap-1.5 text-[11px] text-slate-500">
                  <li>10-11-2025 · Actualización documental general</li>
                  <li>02-11-2025 · Carga de examen altura física</li>
                  <li>15-10-2025 · Asignación a Obra 1</li>
                  <li>01-09-2025 · Alta de trabajador en sistema</li>
                </ul>
              </div>
            )}

            {workerPanelTab === "subir" && (
              <div className="mt-2 flex flex-col gap-3 text-xs">
                <p className="text-[11px] font-medium text-slate-700">
                  Subir nuevo documento para el trabajador
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-slate-700">
                      Categoría
                    </label>
                    <select className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200">
                      <option>Legales</option>
                      <option>Exámenes</option>
                      <option>Capacitaciones</option>
                      <option>EPP</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-slate-700">
                      Nombre del documento
                    </label>
                    <input
                      className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      placeholder="Ej: Examen altura 2025"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-slate-700">
                      Archivo (mock)
                    </label>
                    <input
                      type="file"
                      className="text-[11px] border border-dashed border-slate-300 rounded-xl px-3 py-2"
                    />
                  </div>
                  <button className="mt-1 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium shadow">
                    Subir documento (mock)
                  </button>
                  <p className="text-[11px] text-slate-500">
                    En la versión real, este flujo guardará el archivo en tu
                    storage y registrará el documento en Firestore.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {!showWorkerPanel && (
        <div className="mt-[-8px] flex justify-end">
          <button
            className="text-[11px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
            onClick={() => setShowWorkerPanel(true)}
          >
            Mostrar panel de trabajador
          </button>
        </div>
      )}

      {/* NOTA MOCK */}
      <div className="mt-4 bg-slate-900/5 border border-dashed border-emerald-300 rounded-2xl p-4 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-700">Nota:</span> ahora todos los
        botones clave abren un modal de demostración. En la versión conectada a
        Firestore, aquí se integrarán los formularios reales para crear obras,
        editar obras (activas o inactivas), trabajadores, filtros avanzados y
        solicitudes de regularización.
      </div>

      {renderModal()}
    </div>
  );
}
