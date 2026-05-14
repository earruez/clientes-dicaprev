"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Loader2,
  Shield,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ResumenEmpresaResponse } from "@/app/dicaprev/empresa/resumen/actions";
import { generarDocumentosFaltantes } from "@/app/dicaprev/empresa/resumen/actions";
import { guardarEstadoActivacionEmpresa } from "@/app/dicaprev/empresa/resumen/actions";
import { enviarDocumentoEmpresaAFirma, firmarDocumentoEmpresa } from "@/app/dicaprev/documentacion/actions";
import type { DocumentoMatrizRow } from "@/app/dicaprev/documentacion/types";

interface ActivacionFlowProps {
  resumen: ResumenEmpresaResponse;
  onComplete: () => Promise<void>;
  isLoading?: boolean;
  estadoActivacion: ResumenEmpresaResponse["activacion"];
}

type PasoActivacion = 1 | 2 | 3 | 4 | "completo";

type DocumentoActivacion = Pick<
  DocumentoMatrizRow,
  "documentoEmpresaId" | "nombre" | "tipo" | "estado" | "firmado" | "firmadoPor" | "firmadoEn"
>;

const PASOS: Array<{ numero: PasoActivacion; titulo: string; descripcion: string; icono: React.ReactNode }> = [
  {
    numero: 1,
    titulo: "Generar IRL",
    descripcion: "Instructivo de Riesgos Laborales personalizado para tu empresa",
    icono: <FileText className="h-5 w-5" />,
  },
  {
    numero: 2,
    titulo: "Generar EPP",
    descripcion: "Elementos de Protección Personal según riesgos identificados",
    icono: <Shield className="h-5 w-5" />,
  },
  {
    numero: 3,
    titulo: "Revisar",
    descripcion: "Verificar que todos los documentos sean correctos",
    icono: <CheckCircle2 className="h-5 w-5" />,
  },
  {
    numero: 4,
    titulo: "Firmar",
    descripcion: "Autorizar los documentos para activar cumplimiento",
    icono: <CheckCircle2 className="h-5 w-5" />,
  },
];

export function ActivacionFlow({ resumen, onComplete, isLoading, estadoActivacion }: ActivacionFlowProps) {
  const [pasoActual, setPasoActual] = useState<PasoActivacion>(() =>
    estadoActivacion.pasoActual == null ? 1 : (estadoActivacion.pasoActual as PasoActivacion)
  );
  const [generandoDocumentos, setGenerandoDocumentos] = useState(false);
  const [firmandoDocumentos, setFirmandoDocumentos] = useState(false);
  const [feedbackGeneracion, setFeedbackGeneracion] = useState<{
    documentos: number;
    mensajes: [string, string];
  } | null>(null);
  const [feedbackFirma, setFeedbackFirma] = useState<{
    documentosFirmados: number;
    cumplimientoAntes: number | null;
    cumplimientoDespues: number | null;
    mensajes: [string, string, string];
  } | null>(null);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [documentosActivacion, setDocumentosActivacion] = useState<DocumentoActivacion[]>([]);
  const [pasoCompletado, setPasoCompletado] = useState<Record<number, boolean>>({});

  const progreso = (Object.values(pasoCompletado).filter(Boolean).length / 4) * 100;

  const documentosFirmables = useMemo(
    () => documentosActivacion.filter((doc) => !doc.firmado && Boolean(doc.documentoEmpresaId)),
    [documentosActivacion],
  );

  useEffect(() => {
    if (estadoActivacion.completada) return;
    const pasoPersistido = estadoActivacion.pasoActual;
    if (pasoPersistido === null) return;
    setPasoActual(pasoPersistido as PasoActivacion);
  }, [estadoActivacion.completada, estadoActivacion.pasoActual]);

  const persistirActivacion = useCallback(
    async (params: {
      pasoActual: number;
      evento?: "activacion_inicio" | "activacion_generar_docs" | "activacion_firma" | "activacion_completa";
      completada?: boolean;
      metadata?: Record<string, unknown>;
    }) => {
      const resultado = await guardarEstadoActivacionEmpresa({
        empresaId: resumen.empresa.id,
        pasoActual: params.pasoActual,
        evento: params.evento,
        completada: params.completada,
        metadata: params.metadata,
      });

      if (!resultado.ok) {
        throw new Error(resultado.error);
      }

      return resultado;
    },
    [resumen.empresa.id],
  );

  const cargarDocumentosActivacion = useCallback(async () => {
    try {
      const response = await fetch("/api/dicaprev/documentacion/matriz", { cache: "no-store" });
      if (!response.ok) return;

      const payload = (await response.json()) as { documentos?: DocumentoMatrizRow[] };
      const documentos = (payload.documentos ?? [])
        .filter((doc) => {
          const tipoNormalizado = doc.tipo.trim().toUpperCase();
          const nombreNormalizado = doc.nombre.toLowerCase();
          return (
            tipoNormalizado === "IRL" ||
            tipoNormalizado === "EPP" ||
            nombreNormalizado.includes("riesgos laborales") ||
            nombreNormalizado.includes("equipos de proteccion personal")
          );
        })
        .slice(0, 2)
        .map((doc) => ({
          documentoEmpresaId: doc.documentoEmpresaId,
          nombre: doc.nombre,
          tipo: doc.tipo,
          estado: doc.estado,
          firmado: doc.firmado,
          firmadoPor: doc.firmadoPor,
          firmadoEn: doc.firmadoEn,
        }));

      setDocumentosActivacion(documentos);
    } catch (error) {
      console.error("Error cargando documentos de activación:", error);
    }
  }, []);

  useEffect(() => {
    void cargarDocumentosActivacion();
  }, [cargarDocumentosActivacion]);

  // Generar documentos faltantes
  const handleGenerarDocumentos = useCallback(async () => {
    setGenerandoDocumentos(true);
    setErrorAccion(null);
    setFeedbackFirma(null);
    setFeedbackGeneracion(null);
    try {
      if (!estadoActivacion.pasoActual) {
        await persistirActivacion({ pasoActual: 1, evento: "activacion_inicio" });
      }

      const resultado = await generarDocumentosFaltantes({ empresaId: resumen.empresa.id });
      if (resultado.generados > 0 || resultado.actualizados > 0) {
        // Marcar paso 1 y 2 como completados
        setPasoCompletado((prev) => ({ ...prev, 1: true, 2: true }));
        setPasoActual(2);
        await persistirActivacion({ pasoActual: 2, evento: "activacion_generar_docs" });
        await cargarDocumentosActivacion();
        await onComplete();
        setFeedbackGeneracion({
          documentos: 2,
          mensajes: [
            "Se crearon 2 documentos obligatorios",
            "Ya puedes revisarlos y firmarlos",
          ],
        });
      }
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudieron generar los documentos.";
      setErrorAccion(mensaje);
      console.error("Error generando documentos:", error);
    } finally {
      setGenerandoDocumentos(false);
    }
  }, [persistirActivacion, estadoActivacion.pasoActual, resumen.empresa.id, onComplete, cargarDocumentosActivacion]);

  const handleRevisar = useCallback(async () => {
    setPasoCompletado((prev) => ({ ...prev, 3: true }));
    setPasoActual(4);
    setErrorAccion(null);
    await persistirActivacion({ pasoActual: 4 });
  }, [persistirActivacion]);

  const handleFirmar = useCallback(async () => {
    if (documentosFirmables.length === 0) {
      setErrorAccion("No hay documentos listos para firmar todavía.");
      return;
    }

    setFirmandoDocumentos(true);
    setErrorAccion(null);
    setFeedbackFirma(null);

    try {
      const cumplimientoAntes = resumen.cumplimiento.porcentaje;

      await persistirActivacion({ pasoActual: 4, evento: "activacion_firma" });

      for (const documento of documentosFirmables) {
        if (!documento.documentoEmpresaId) continue;

        if (String(documento.estado).toLowerCase() !== "enviado a firma" && String(documento.estado).toLowerCase() !== "enviado_firma") {
          const enviado = await enviarDocumentoEmpresaAFirma({ documentoId: documento.documentoEmpresaId });
          if (!enviado.ok) {
            throw new Error(enviado.error ?? "No se pudo enviar el documento a firma.");
          }
        }

        const firmado = await firmarDocumentoEmpresa({ documentoId: documento.documentoEmpresaId });
        if (!firmado.ok) {
          throw new Error(firmado.error ?? "No se pudo firmar el documento.");
        }
      }

      setPasoCompletado((prev) => ({ ...prev, 4: true }));
      setPasoActual("completo");
      await persistirActivacion({ pasoActual: 4, evento: "activacion_completa", completada: true });
      await cargarDocumentosActivacion();
      await onComplete();
      let cumplimientoDespues: number | null = null;
      const response = await fetch("/api/dicaprev/empresa/resumen", { cache: "no-store" });
      if (response.ok) {
        const resumenActualizado = (await response.json()) as ResumenEmpresaResponse;
        cumplimientoDespues = resumenActualizado.cumplimiento.porcentaje;
      }

      setFeedbackFirma({
        documentosFirmados: documentosFirmables.length,
        cumplimientoAntes,
        cumplimientoDespues,
        mensajes: [
          `${documentosFirmables.length} documentos firmados`,
          "Cumplimiento actualizado",
          "Ya estás listo para cumplir requisitos básicos",
        ],
      });
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "No se pudo completar la firma.";
      setErrorAccion(mensaje);
    } finally {
      setFirmandoDocumentos(false);
    }
  }, [documentosFirmables, onComplete, cargarDocumentosActivacion, persistirActivacion, resumen.cumplimiento.porcentaje]);

  const handleSaltar = useCallback(() => {
    // Permitir saltar el flujo de activación
    setPasoActual(1);
    setPasoCompletado({});
    setFeedbackGeneracion(null);
    setFeedbackFirma(null);
    setErrorAccion(null);
  }, []);

  return (
    <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-md">
      <div className="space-y-6">
        {/* Header con CTA principal */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-blue-900">
              <Zap className="h-6 w-6 text-blue-600" />
              Activación rápida
            </h2>
            <p className="text-sm text-blue-700 mt-2">
              Completa estos 4 pasos en menos de 5 minutos para comenzar
            </p>
          </div>
          <Button
            onClick={handleSaltar}
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-100"
          >
            Saltar por ahora
          </Button>
        </div>

        {feedbackGeneracion && (
          <Card className="border border-blue-200 bg-blue-50 p-4 shadow-sm">
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">Documentos generados</h3>
                  <p className="text-sm text-blue-800">Generación completada correctamente.</p>
                </div>
              </div>
              <div className="space-y-1 pl-11 text-sm text-blue-800">
                <p>✔ {feedbackGeneracion.mensajes[0]}</p>
                <p>✔ {feedbackGeneracion.mensajes[1]}</p>
              </div>
            </div>
          </Card>
        )}

        {feedbackFirma && (
          <Card className="border-2 border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-emerald-900">Firma completada</h3>
                  <p className="text-sm text-emerald-800">Documentos listos y cumplimiento actualizado.</p>
                </div>
              </div>
              <div className="space-y-1 pl-11 text-sm font-medium text-emerald-900">
                <p>✔ {feedbackFirma.mensajes[0]}</p>
                <p>✔ {feedbackFirma.mensajes[1]}</p>
                <p>✔ {feedbackFirma.mensajes[2]}</p>
              </div>
              {feedbackFirma.cumplimientoAntes !== null && feedbackFirma.cumplimientoDespues !== null && (
                <div className="ml-11 rounded-md border border-emerald-200 bg-white/70 px-3 py-2 text-sm font-semibold text-emerald-900">
                  Tu cumplimiento subió de {feedbackFirma.cumplimientoAntes}% → {feedbackFirma.cumplimientoDespues}%
                </div>
              )}
            </div>
          </Card>
        )}

        {errorAccion && (
          <Card className="border border-rose-200 bg-rose-50 p-4 shadow-sm">
            <p className="text-sm font-medium text-rose-800">{errorAccion}</p>
          </Card>
        )}

        {/* Barra de progreso */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-blue-900">
              Progreso: {Math.round(progreso)}%
            </span>
            <span className="text-xs text-blue-700">
              {Object.values(pasoCompletado).filter(Boolean).length} de 4 completados
            </span>
          </div>
          <Progress value={progreso} className="h-2" />
        </div>

        {/* Pasos visuales */}
        <div className="grid grid-cols-4 gap-3">
          {PASOS.map((paso) => {
            const isActual = pasoActual === paso.numero;
            const isCompleted = pasoCompletado[paso.numero as number];

            return (
              <button
                key={paso.numero}
                onClick={() => {
                  if (isCompleted || pasoActual === paso.numero) {
                    setPasoActual(paso.numero);
                  }
                }}
                className={`p-3 rounded-lg border-2 transition-all text-left ${
                  isActual
                    ? "border-blue-500 bg-white shadow-md"
                    : isCompleted
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-slate-200 bg-slate-50 opacity-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`flex-shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-xs font-semibold ${
                      isCompleted
                        ? "bg-emerald-500 text-white"
                        : isActual
                          ? "bg-blue-500 text-white"
                          : "bg-slate-300 text-slate-600"
                    }`}
                  >
                    {isCompleted ? "✓" : paso.numero}
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      isActual
                        ? "text-blue-900"
                        : isCompleted
                          ? "text-emerald-900"
                          : "text-slate-600"
                    }`}
                  >
                    {paso.titulo}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-tight">{paso.descripcion}</p>
              </button>
            );
          })}
        </div>

        {/* Contenido del paso actual */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 space-y-4">
          {pasoActual === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900">Paso 1: Generar IRL</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Se generará automáticamente el Instructivo de Riesgos Laborales según el giro y tamaño de tu empresa.
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-900">
                ✓ Documento personalizado según tus datos
                <br />✓ Conforme a normativa vigente
                <br />✓ Listo para firmar
              </div>
              <Button
                onClick={handleGenerarDocumentos}
                disabled={generandoDocumentos || isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {generandoDocumentos ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  <>
                    Generar IRL y EPP
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}

          {pasoActual === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900">Paso 3: Revisar documentos</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Verifica que todos los documentos hayan sido generados correctamente.
                </p>
              </div>
              <div className="space-y-2 bg-slate-50 p-3 rounded">
                {documentosActivacion.length > 0 ? (
                  documentosActivacion.map((documento) => (
                    <div key={documento.tipo} className="flex items-start justify-between gap-3 rounded-md bg-white px-3 py-2 border border-slate-200">
                      <div className="min-w-0 flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                        <div className="min-w-0 text-sm">
                          <p className="font-medium text-slate-900">{documento.tipo === "EPP" ? "EPP" : "IRL"} generado</p>
                          <p className="truncate text-xs text-slate-600">{documento.nombre}</p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${documento.firmado ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {documento.firmado ? "Firmado" : "Listo"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">Genera los documentos para ver el resumen aquí.</p>
                )}
              </div>
              <Button
                onClick={handleRevisar}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Continuar a firma
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {pasoActual === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900">Paso 2: Generar EPP</h3>
                <p className="text-sm text-slate-600 mt-1">
                  IRL y EPP ya fueron creados. Revisa el resumen antes de avanzar.
                </p>
              </div>
              <div className="space-y-2 bg-slate-50 p-3 rounded">
                {documentosActivacion.length > 0 ? (
                  documentosActivacion.map((documento) => (
                    <div key={documento.tipo} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 border border-slate-200">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{documento.tipo}</p>
                        <p className="truncate text-xs text-slate-500">{documento.nombre}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${documento.firmado ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                        {documento.firmado ? "Firmado" : "Generado"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">Genera los documentos para ver el resumen aquí.</p>
                )}
              </div>
              <Button
                onClick={async () => {
                  setPasoCompletado((prev) => ({ ...prev, 2: true }));
                  setPasoActual(3);
                  await persistirActivacion({ pasoActual: 3 });
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Revisar documentos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {pasoActual === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900">Paso 4: Firmar documentos</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Autoriza los documentos para activar el cumplimiento en tu empresa.
                </p>
              </div>
              <div className="space-y-2 bg-slate-50 p-3 rounded">
                {documentosActivacion.length > 0 ? (
                  documentosActivacion.map((documento) => (
                    <div key={documento.tipo} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 border border-slate-200">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{documento.tipo}</p>
                        <p className="truncate text-xs text-slate-500">{documento.nombre}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${documento.firmado ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                        {documento.firmado ? "Firmado" : "Pendiente"}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">Aún no se detectan documentos listos para firmar.</p>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 p-3 rounded text-sm text-green-900">
                Después de firmar, tu cumplimiento comenzará a aumentar inmediatamente.
              </div>
              <Button
                onClick={handleFirmar}
                disabled={isLoading || firmandoDocumentos || documentosFirmables.length === 0}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {firmandoDocumentos ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Firmando ahora...
                  </>
                ) : (
                  <>
                    Firmar ahora
                    <ShieldCheck className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}

          {pasoActual === "completo" && (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-lg">¡Activación completada!</h3>
                <p className="text-sm text-slate-600 mt-2">
                  Tu empresa está lista para comenzar. El cumplimiento se actualizará en tiempo real a medida que avances.
                </p>
              </div>
              <a href="/dicaprev/documentacion">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  Ir a Documentación
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </a>
            </div>
          )}
        </div>

        {/* Resumen de impacto */}
        {pasoActual !== "completo" && (
          <div className="border-t border-blue-200 pt-4">
            <p className="text-xs font-semibold text-blue-900 mb-2">Impacto esperado:</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">+25%</div>
                <p className="text-xs text-slate-600">Cumplimiento</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">2</div>
                <p className="text-xs text-slate-600">Documentos creados</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-600">~5 min</div>
                <p className="text-xs text-slate-600">Tiempo estimado</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
