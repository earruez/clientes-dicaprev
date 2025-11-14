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

export default function CentroTrabajoSubmenuMock() {
  const [obraPage, setObraPage] = useState(0);
  const [showWorkerPanel, setShowWorkerPanel] = useState(true);
  const [openModal, setOpenModal] = useState<ModalType>(null);

  const pageSize = 3; // mostrar solo 3 obras por "slide"
  const totalPages = Math.ceil(OBRAS_MOCK.length / pageSize);
  const visibleObras = OBRAS_MOCK.slice(obraPage * pageSize, obraPage * pageSize + pageSize);

  const handlePrevPage = () => {
    setObraPage((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const handleNextPage = () => {
    setObraPage((prev) => (prev < totalPages - 1 ? prev + 1 : prev));
  };

  const renderModal = () => {
    if (!openModal) return null;

    let title = "";
    let description = "";

    switch (openModal) {
      case "matrizDs44":
        title = "Matriz DS44 (demo)";
        description =
          "Aquí se mostrará la matriz real de obligaciones DS44 por obra, con su estado de cumplimiento, responsables y plazos.";
        break;
      case "crearObra":
        title = "Crear nueva Obra / Centro de Trabajo";
        description =
          "Formulario para registrar una nueva obra: nombre, mandante, dirección, faena, fecha de inicio/término y datos clave para la trazabilidad.";
        break;
      case "editarObra":
        title = "Editar Obra (activa o inactiva)";
        description =
          "En la versión funcional podrás editar datos de una obra incluso si está inactiva: actualizar mandante, observaciones, fechas de término, o reactivarla según tu flujo interno.";
        break;
      case "filtroAvanzado":
        title = "Filtro avanzado de trabajadores";
        description =
          "En la versión funcional podrás filtrar por riesgo asociado, categoría documental, cargo, estado de certificación y más.";
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
    }

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
              Gestiona la documentación y cumplimiento de cada centro de trabajo, sus trabajadores
              y requisitos normativos asociados (DS44, reglamentos internos, EPP y más).
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
                ></div>
              </div>
              <div className="flex justify-between items-center mt-1 text-[11px]">
                <span className="text-slate-500">
                  Última actualización: {obra.ultimaActualizacion}
                </span>
                <div className="flex items-center gap-2">
                  <button className="text-emerald-700 hover:underline">Ver detalle</button>
                  <button
                    className="text-slate-500 hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenModal("editarObra");
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
              className="border border-slate-200 rounded-xl px-4 py-2 text-sm w_full md:w-72 focus:outline-none focus:ring-2 focus:ring-emerald-200"
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

          {/* LISTA PREMIUM DE TRABAJADORES */}
          <div className="flex flex-col gap-4 mt-2">
            {[1, 2].map((item) => (
              <div
                key={item}
                className="border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-[1px] transition bg-slate-50/60"
              >
                {/* HEADER DEL TRABAJADOR */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-900 text-base">Juan Pérez</span>
                    <span className="text-xs text-slate-500">11.111.111-1 · Maestro en Obra 1</span>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex flex-col text-[11px] text-slate-500">
                      <span>
                        Vigentes: <strong className="text-emerald-600">14</strong>
                      </span>
                      <span>
                        Vencidos: <strong className="text-rose-500">2</strong>
                      </span>
                    </div>
                    <div className="flex flex-col text-[11px] text-slate-500">
                      <span>
                        Alertas por vencer: <strong className="text-amber-500">3</strong>
                      </span>
                      <span>Últ. actualización: 10-11-2025</span>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 text-[11px] px-3 py-1 rounded-full border border-emerald-100">
                      Cumplimiento 82%
                    </span>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-slate-500">Estado en esta obra:</span>
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
                    <summary className="cursor-pointer text-slate-700 font-medium text-sm">Legales</summary>
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
                        <span className="bg-rose-50 text-rose-700 px-2 py-1 text-[11px] rounded_full border border-rose-100">
                          Vencido
                        </span>
                      </div>
                      <div className="flex justify_between items-center">
                        <span>Examen Preocupacional</span>
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-1 text-[11px] rounded-full border border-emerald-100">
                          Vigente
                        </span>
                      </div>
                    </div>
                  </details>

                  {/* CATEGORÍA: CAPACITACIONES */}
                  <details className="border border-slate-100 rounded-xl bg-white p-3">
                    <summary className="cursor-pointer text-slate-700 font-medium text-sm">Capacitaciones</summary>
                    <div className="mt-3 flex flex-col gap-2 text-xs">
                      <div className="flex justify-between items_center">
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
                    <summary className="cursor-pointer text-slate-700 font-medium text-sm">EPP Obligatorio</summary>
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
              <button className="flex-1 px-2 py-1 rounded-lg bg-white shadow-sm text-slate-800 font-medium">
                Perfil
              </button>
              <button className="flex-1 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-800">
                Documentos
              </button>
              <button className="flex-1 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-800">
                Certificaciones
              </button>
              <button className="flex-1 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-800">
                Historial
              </button>
              <button className="flex-1 px-2 py-1 rounded-lg text-slate-500 hover:text-slate-800">
                Subir doc.
              </button>
            </div>

            {/* CONTENIDO MOCK DEL PANEL */}
            <div className="mt-1 flex flex-col gap-3 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-semibold text-slate-900">Juan Pérez</span>
                  <span className="text-[11px] text-slate-500">Obra 1 · Maestro</span>
                </div>
                <span className="bg-emerald-50 text-emerald-700 text-[11px] px-3 py-1 rounded-full border border-emerald-100">
                  Cumplimiento 82%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-1">
                <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-1 border border-slate-100">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">Docs vigentes</span>
                  <span className="text-lg font-semibold text-emerald-600">14</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-1 border border-slate-100">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">Vencidos</span>
                  <span className="text-lg font-semibold text-rose-500">2</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-1 border border-slate-100">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">
                    Alertas por vencer
                  </span>
                  <span className="text-lg font-semibold text-amber-500">3</span>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 flex flex-col gap-1 border border-slate-100">
                  <span className="text-[10px] uppercase tracking-wide text-slate-400">Riesgos asociados</span>
                  <span className="text-[11px] text-slate-600">Altura, carga manual, herramientas</span>
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-700">Dependencias DS44 sugeridas</span>
                <ul className="list-disc list-inside text-[11px] text-slate-500 flex flex-col gap-0.5">
                  <li>
                    Si realiza trabajo en altura: Examen altura + capacitación altura + EPP asociado.
                  </li>
                  <li>Si manipula maquinaria: Licencia / certificación + inducción específica.</li>
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
                  La solicitud se envía al administrador de obra y queda registrada en el workflow de
                  pendientes de regularización para seguimiento.
                </p>
              </div>
            </div>
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

      {/* MOCK MODAL CREAR OBRA (SOLO VISTA) */}
      <div className="mt-4 bg-slate-900/5 border border-dashed border-emerald-300 rounded-2xl p-4 text-[11px] text-slate-500">
        <span className="font-semibold text-slate-700">Nota:</span> ahora todos los botones clave abren un
        modal de demostración. En la versión conectada a Firestore, aquí se integrarán los formularios
        reales para crear obras, editar obras (activas o inactivas), trabajadores, filtros avanzados y
        solicitudes de regularización.
      </div>

      {renderModal()}
    </div>
  );
}
