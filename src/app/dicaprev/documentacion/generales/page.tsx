"use client";

import React, { useMemo, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ======================================
   Tipos (mock)
====================================== */

type EstadoDocumento = "Vigente" | "Por vencer" | "Vencido";

type Categoria = {
  id: string;
  nombre: string;
  descripcion?: string;
};

type DocumentoGeneral = {
  id: string;
  nombre: string;
  categoriaId?: string | null;
  aplica: boolean;
  fechaEmision?: string;
  fechaVencimiento?: string;
  estado: EstadoDocumento;
  responsable?: string;
};

/* ======================================
   Helpers
====================================== */

const formatDate = (isoLike?: string) => {
  if (!isoLike) return "—";
  const d = new Date(`${isoLike}T00:00:00Z`);
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
};

const estadoClase = (estado: EstadoDocumento) => {
  switch (estado) {
    case "Vigente":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "Por vencer":
      return "bg-amber-50 text-amber-700 border border-amber-100";
    case "Vencido":
      return "bg-rose-50 text-rose-700 border border-rose-100";
    default:
      return "bg-slate-100 text-slate-600 border border-slate-200";
  }
};

/* ======================================
   Datos mock
====================================== */

const mockCategoriasIniciales: Categoria[] = [
  {
    id: "cat-oblig",
    nombre: "Obligaciones legales",
    descripcion: "Normativa básica DS44 / Código del Trabajo",
  },
  {
    id: "cat-prev",
    nombre: "Prevención de riesgos",
    descripcion: "Documentos internos de gestión",
  },
  {
    id: "cat-rh",
    nombre: "Recursos humanos",
    descripcion: "Reglamentos internos, contratos, anexos",
  },
];

const mockDocumentosIniciales: DocumentoGeneral[] = [
  {
    id: "doc-1",
    nombre: "Reglamento Interno de Orden, Higiene y Seguridad",
    categoriaId: "cat-rh",
    aplica: true,
    fechaEmision: "2024-01-10",
    fechaVencimiento: "",
    estado: "Vigente",
    responsable: "RRHH",
  },
  {
    id: "doc-2",
    nombre: "Matriz IPER DS44",
    categoriaId: "cat-prev",
    aplica: true,
    fechaEmision: "2024-02-15",
    fechaVencimiento: "2025-02-15",
    estado: "Por vencer",
    responsable: "Prevencionista",
  },
  {
    id: "doc-3",
    nombre: "Contrato de trabajo tipo operario",
    categoriaId: "cat-rh",
    aplica: true,
    fechaEmision: "2023-11-01",
    fechaVencimiento: "",
    estado: "Vigente",
    responsable: "RRHH",
  },
  {
    id: "doc-4",
    nombre: "Programa anual de trabajo DS44",
    categoriaId: "cat-prev",
    aplica: true,
    fechaEmision: "2023-03-01",
    fechaVencimiento: "2024-03-01",
    estado: "Vencido",
    responsable: "Prevencionista",
  },
  {
    id: "doc-5",
    nombre: "Póliza de seguro complementario",
    categoriaId: null,
    aplica: false,
    fechaEmision: "2022-05-10",
    fechaVencimiento: "2023-05-10",
    estado: "Vencido",
    responsable: "Administración",
  },
];

/* ======================================
   Componente principal
====================================== */

export default function DocumentosGeneralesPage() {
  const [categorias, setCategorias] = useState<Categoria[]>(
    mockCategoriasIniciales
  );
  const [documentos, setDocumentos] = useState<DocumentoGeneral[]>(
    mockDocumentosIniciales
  );

  const [busqueda, setBusqueda] = useState("");
  const [soloAplica, setSoloAplica] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<EstadoDocumento | "Todos">(
    "Todos"
  );

  const [categoriaModalAbierto, setCategoriaModalAbierto] = useState(false);
  const [categoriaEditando, setCategoriaEditando] =
    useState<Categoria | null>(null);
  const [nombreCategoria, setNombreCategoria] = useState("");
  const [descripcionCategoria, setDescripcionCategoria] = useState("");

  const [categoriasColapsadas, setCategoriasColapsadas] = useState<string[]>(
    []
  );
  const [confirmEliminarCategoriaId, setConfirmEliminarCategoriaId] =
    useState<string | null>(null);
  const [confirmEliminarDocumentoId, setConfirmEliminarDocumentoId] =
    useState<string | null>(null);

  // Modal NUEVO DOCUMENTO
  const [documentoModalAbierto, setDocumentoModalAbierto] = useState(false);
  const [nombreDocumento, setNombreDocumento] = useState("");
  const [categoriaDocumento, setCategoriaDocumento] = useState<string>("");
  const [responsableDocumento, setResponsableDocumento] = useState("");
  const [fechaEmisionDocumento, setFechaEmisionDocumento] = useState("");
  const [fechaVencimientoDocumento, setFechaVencimientoDocumento] =
    useState("");
  const [aplicaDocumento, setAplicaDocumento] = useState(true);
  const [estadoDocumento, setEstadoDocumento] =
    useState<EstadoDocumento>("Vigente");

  /* ---------- Resumen tarjetas ---------- */

  const { totalVigentes, totalPorVencer, totalVencidos } = useMemo(() => {
    let v = 0;
    let pv = 0;
    let ve = 0;
    documentos.forEach((doc) => {
      if (doc.estado === "Vigente") v++;
      else if (doc.estado === "Por vencer") pv++;
      else if (doc.estado === "Vencido") ve++;
    });
    return { totalVigentes: v, totalPorVencer: pv, totalVencidos: ve };
  }, [documentos]);

  /* ---------- Filtrado documentos ---------- */

  const documentosFiltrados = useMemo(() => {
    return documentos.filter((doc) => {
      if (soloAplica && !doc.aplica) return false;
      if (filtroEstado !== "Todos" && doc.estado !== filtroEstado) return false;

      if (busqueda.trim().length > 0) {
        const q = busqueda.toLowerCase();
        const categoria = categorias.find((c) => c.id === doc.categoriaId);
        return (
          doc.nombre.toLowerCase().includes(q) ||
          (doc.responsable && doc.responsable.toLowerCase().includes(q)) ||
          (categoria && categoria.nombre.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [documentos, soloAplica, filtroEstado, busqueda, categorias]);

  /* ---------- Agrupar por categoría ---------- */

  const docsPorCategoria = useMemo(() => {
    const map = new Map<string, DocumentoGeneral[]>();

    const SIN_CATEGORIA_ID = "__sin_categoria__";

    documentosFiltrados.forEach((doc) => {
      const key = doc.categoriaId ?? SIN_CATEGORIA_ID;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(doc);
    });

    const resultado: {
      key: string;
      categoria: Categoria | null;
      titulo: string;
      documentos: DocumentoGeneral[];
    }[] = [];

    map.forEach((docs, key) => {
      if (key === SIN_CATEGORIA_ID) {
        resultado.push({
          key,
          categoria: null,
          titulo: "Sin categoría",
          documentos: docs,
        });
      } else {
        const cat = categorias.find((c) => c.id === key) || null;
        resultado.push({
          key,
          categoria: cat,
          titulo: cat?.nombre ?? "Categoría no definida",
          documentos: docs,
        });
      }
    });

    resultado.sort((a, b) => a.titulo.localeCompare(b.titulo, "es"));

    return resultado;
  }, [documentosFiltrados, categorias]);

  /* ---------- Gestión categorías ---------- */

  const abrirNuevaCategoria = () => {
    setCategoriaEditando(null);
    setNombreCategoria("");
    setDescripcionCategoria("");
    setCategoriaModalAbierto(true);
    setConfirmEliminarCategoriaId(null);
  };

  const abrirEditarCategoria = (cat: Categoria) => {
    setCategoriaEditando(cat);
    setNombreCategoria(cat.nombre);
    setDescripcionCategoria(cat.descripcion || "");
    setCategoriaModalAbierto(true);
    setConfirmEliminarCategoriaId(null);
  };

  const guardarCategoria = () => {
    if (!nombreCategoria.trim()) return;

    if (categoriaEditando) {
      setCategorias((prev) =>
        prev.map((c) =>
          c.id === categoriaEditando.id
            ? {
                ...c,
                nombre: nombreCategoria.trim(),
                descripcion: descripcionCategoria.trim(),
              }
            : c
        )
      );
    } else {
      const nueva: Categoria = {
        id: `cat-${Date.now()}`,
        nombre: nombreCategoria.trim(),
        descripcion: descripcionCategoria.trim(),
      };
      setCategorias((prev) => [...prev, nueva]);
    }

    setCategoriaModalAbierto(false);
    setCategoriaEditando(null);
    setNombreCategoria("");
    setDescripcionCategoria("");
  };

  const intentarEliminarCategoria = (id: string) => {
    setConfirmEliminarCategoriaId((prev) => (prev === id ? null : id));
  };

  const eliminarCategoriaDefinitivo = (id: string) => {
    setCategorias((prev) => prev.filter((c) => c.id !== id));
    setDocumentos((prev) =>
      prev.map((doc) =>
        doc.categoriaId === id ? { ...doc, categoriaId: null } : doc
      )
    );
    setConfirmEliminarCategoriaId(null);
  };

  /* ---------- Gestión documentos ---------- */

  const cambiarCategoriaDocumento = (
    docId: string,
    categoriaId: string | null
  ) => {
    setDocumentos((prev) =>
      prev.map((doc) => (doc.id === docId ? { ...doc, categoriaId } : doc))
    );
  };

  const intentarEliminarDocumento = (id: string) => {
    setConfirmEliminarDocumentoId((prev) => (prev === id ? null : id));
  };

  const eliminarDocumentoDefinitivo = (id: string) => {
    setDocumentos((prev) => prev.filter((d) => d.id !== id));
    setConfirmEliminarDocumentoId(null);
  };

  const categoriaNombrePorId = (id: string | null | undefined) => {
    if (!id) return "Sin categoría";
    const cat = categorias.find((c) => c.id === id);
    return cat?.nombre || "Categoría no definida";
  };

  const estaColapsada = (key: string) => categoriasColapsadas.includes(key);

  const toggleColapsarCategoria = (key: string) => {
    setCategoriasColapsadas((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const resetFormularioDocumento = () => {
    setNombreDocumento("");
    setCategoriaDocumento("");
    setResponsableDocumento("");
    setFechaEmisionDocumento("");
    setFechaVencimientoDocumento("");
    setAplicaDocumento(true);
    setEstadoDocumento("Vigente");
  };

  const guardarDocumento = () => {
    if (!nombreDocumento.trim()) return;

    const nuevo: DocumentoGeneral = {
      id: `doc-${Date.now()}`,
      nombre: nombreDocumento.trim(),
      categoriaId: categoriaDocumento || null,
      aplica: aplicaDocumento,
      fechaEmision: fechaEmisionDocumento || undefined,
      fechaVencimiento: fechaVencimientoDocumento || undefined,
      estado: estadoDocumento,
      responsable: responsableDocumento.trim() || undefined,
    };

    setDocumentos((prev) => [...prev, nuevo]);
    setDocumentoModalAbierto(false);
    resetFormularioDocumento();
  };

  /* ======================================
     Render
  ====================================== */

  return (
    <main className="min-h-screen w-full bg-slate-50 px-4 py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {/* Header */}
        <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Documentos generales
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Administra toda la documentación transversal de la empresa,
              ordenada por categorías.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 px-5 py-2"
              onClick={abrirNuevaCategoria}
            >
              + Nueva categoría
            </Button>
            <Button
              className="rounded-full bg-slate-900 text-white hover:bg-slate-800 px-5 py-2"
              onClick={() => setDocumentoModalAbierto(true)}
            >
              + Nuevo documento
            </Button>
          </div>
        </section>

        {/* Tarjetas resumen */}
        <section className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-2xl border-emerald-100 bg-emerald-50/70">
            <CardHeader className="pb-1 text-center">
              <p className="text-sm font-medium text-emerald-800">Vigentes</p>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-1 pb-4">
              <span className="text-3xl font-semibold text-emerald-900">
                {totalVigentes}
              </span>
              <Badge className="border-emerald-200 bg-white text-emerald-800">
                OK
              </Badge>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-amber-100 bg-amber-50/70">
            <CardHeader className="pb-1 text-center">
              <p className="text-sm font-medium text-amber-800">Por vencer</p>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-1 pb-4">
              <span className="text-3xl font-semibold text-amber-900">
                {totalPorVencer}
              </span>
              <Badge className="border-amber-200 bg-white text-amber-800">
                Revisar
              </Badge>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-rose-100 bg-rose-50/70">
            <CardHeader className="pb-1 text-center">
              <p className="text-sm font-medium text-rose-800">Vencidos</p>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-1 pb-4">
              <span className="text-3xl font-semibold text-rose-900">
                {totalVencidos}
              </span>
              <Badge className="border-rose-200 bg-white text-rose-800">
                Crítico
              </Badge>
            </CardContent>
          </Card>
        </section>

        {/* Filtros */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <Input
                placeholder="Buscar por nombre, responsable o categoría..."
                value={busqueda}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setBusqueda(e.target.value)
                }
                className="max-w-md rounded-full bg-slate-50"
              />
              <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1">
                <Checkbox
                  checked={soloAplica}
                  onCheckedChange={(
                    val: boolean | "indeterminate" | undefined
                  ) => setSoloAplica(val === true)}
                  id="solo-aplica"
                  className="mr-1"
                />
                <Label
                  htmlFor="solo-aplica"
                  className="block text-xs text-slate-700"
                >
                  Mostrar solo documentos que aplican
                </Label>
              </div>
            </div>
            <Tabs
              value={filtroEstado}
              onValueChange={(v: string) =>
                setFiltroEstado(v as EstadoDocumento | "Todos")
              }
            >
              <TabsList>
                <TabsTrigger value="Todos">Todos</TabsTrigger>
                <TabsTrigger value="Vigente">Vigentes</TabsTrigger>
                <TabsTrigger value="Por vencer">Por vencer</TabsTrigger>
                <TabsTrigger value="Vencido">Vencidos</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </section>

        {/* Listas por categoría */}
        <section className="flex flex-col gap-4">
          {docsPorCategoria.length === 0 ? (
            <Card className="rounded-2xl border-dashed border-slate-200 bg-white/60 p-6 text-center text-sm text-slate-500">
              No hay documentos que coincidan con los filtros aplicados.
            </Card>
          ) : (
            docsPorCategoria.map((bloque) => (
              <Card
                key={bloque.key}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <CardHeader
                  className="flex cursor-pointer flex-row items-center justify-between bg-slate-50/80 px-5 py-3"
                  onClick={() => toggleColapsarCategoria(bloque.key)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                      {bloque.titulo.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {bloque.titulo}
                      </p>
                      <p className="text-xs text-slate-500">
                        {bloque.documentos.length} documento
                        {bloque.documentos.length !== 1 && "s"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {bloque.categoria && (
                      <Button
                        variant="ghost"
                        className="h-8 rounded-full px-3 text-xs text-slate-600 hover:bg-slate-100"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.stopPropagation();
                          abrirEditarCategoria(bloque.categoria!);
                        }}
                      >
                        Editar categoría
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      className="h-8 w-8 rounded-full p-0 hover:bg-slate-100"
                    >
                      <span
                        className={`transition-transform ${
                          estaColapsada(bloque.key)
                            ? "-rotate-90"
                            : "rotate-0"
                        }`}
                      >
                        ▾
                      </span>
                    </Button>
                  </div>
                </CardHeader>

                {!estaColapsada(bloque.key) && (
                  <CardContent className="px-5 pb-4 pt-3">
                    <div className="hidden grid-cols-12 border-b border-slate-100 pb-2 text-xs font-medium text-slate-500 md:grid">
                      <div className="col-span-4">Documento</div>
                      <div className="col-span-2">Categoría</div>
                      <div className="col-span-2">Vigencia</div>
                      <div className="col-span-1 text-center">Aplica</div>
                      <div className="col-span-1 text-center">Estado</div>
                      <div className="col-span-2 text-right">Acciones</div>
                    </div>

                    <div className="flex flex-col divide-y divide-slate-100">
                      {bloque.documentos.map((doc) => (
                        <div
                          key={doc.id}
                          className="grid grid-cols-1 gap-3 py-3 text-sm md:grid-cols-12 md:items-center"
                        >
                          {/* Nombre + responsable */}
                          <div className="md:col-span-4">
                            <p className="font-medium text-slate-900">
                              {doc.nombre}
                            </p>
                            {doc.responsable && (
                              <p className="text-xs text-slate-500">
                                Responsable: {doc.responsable}
                              </p>
                            )}
                            <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-400 md:hidden">
                              {categoriaNombrePorId(doc.categoriaId)}
                            </p>
                          </div>

                          {/* Categoría */}
                          <div className="md:col-span-2 hidden md:block">
                            <select
                              className="w-full rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700"
                              value={doc.categoriaId ?? ""}
                              onChange={(
                                e: React.ChangeEvent<HTMLSelectElement>
                              ) =>
                                cambiarCategoriaDocumento(
                                  doc.id,
                                  e.target.value || null
                                )
                              }
                            >
                              <option value="">Sin categoría</option>
                              {categorias.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.nombre}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Vigencia */}
                          <div className="md:col-span-2 text-xs text-slate-600">
                            <div>
                              <span className="text-[11px] font-medium uppercase text-slate-400">
                                Emisión
                              </span>
                              <p>{formatDate(doc.fechaEmision)}</p>
                            </div>
                            <div className="mt-1">
                              <span className="text-[11px] font-medium uppercase text-slate-400">
                                Vencimiento
                              </span>
                              <p>{formatDate(doc.fechaVencimiento)}</p>
                            </div>
                          </div>

                          {/* Aplica */}
                          <div className="md:col-span-1 flex items-center justify-start md:justify-center">
                            <div className="flex items-center gap-2 rounded-full bg-slate-50 px-2 py-1">
                              <div
                                className={`h-2 w-2 rounded-full ${
                                  doc.aplica ? "bg-emerald-500" : "bg-slate-300"
                                }`}
                              />
                              <span className="text-xs text-slate-700">
                                {doc.aplica ? "Sí" : "No"}
                              </span>
                            </div>
                          </div>

                          {/* Estado */}
                          <div className="md:col-span-1 flex items-center justify-start md:justify-center">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-medium ${estadoClase(
                                doc.estado
                              )}`}
                            >
                              {doc.estado}
                            </span>
                          </div>

                          {/* Acciones */}
                          <div className="md:col-span-2 flex flex-wrap items-center justify-start gap-2 md:justify-end">
                            {confirmEliminarDocumentoId === doc.id ? (
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="destructive"
                                  className="h-7 rounded-full px-3 text-[11px]"
                                  onClick={() =>
                                    eliminarDocumentoDefinitivo(doc.id)
                                  }
                                >
                                  Confirmar
                                </Button>
                                <Button
                                  variant="outline"
                                  className="h-7 rounded-full px-3 text-[11px]"
                                  onClick={() =>
                                    setConfirmEliminarDocumentoId(null)
                                  }
                                >
                                  Cancelar
                                </Button>
                              </div>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  className="h-7 rounded-full px-3 text-[11px]"
                                >
                                  Ver
                                </Button>
                                <Button
                                  variant="outline"
                                  className="h-7 rounded-full px-3 text-[11px]"
                                >
                                  Vincular
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="h-7 rounded-full px-3 text-[11px] text-rose-600 hover:bg-rose-50"
                                  onClick={() =>
                                    intentarEliminarDocumento(doc.id)
                                  }
                                >
                                  Eliminar
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </section>
      </div>

      {/* Modal categorías */}
      <Dialog
        open={categoriaModalAbierto}
        onOpenChange={(open: boolean) => {
          setCategoriaModalAbierto(open);
          if (!open) {
            setCategoriaEditando(null);
            setNombreCategoria("");
            setDescripcionCategoria("");
            setConfirmEliminarCategoriaId(null);
          }
        }}
      >
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {categoriaEditando ? "Editar categoría" : "Nueva categoría"}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2 flex flex-col gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="nombre-categoria"
                className="block text-xs text-slate-700"
              >
                Nombre de la categoría
              </Label>
              <Input
                id="nombre-categoria"
                placeholder="Ej. Prevención de riesgos"
                value={nombreCategoria}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNombreCategoria(e.target.value)
                }
                className="rounded-xl bg-slate-50"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="descripcion-categoria"
                className="block text-xs text-slate-700"
              >
                Descripción (opcional)
              </Label>
              <textarea
                id="descripcion-categoria"
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/5"
                placeholder="Describe brevemente qué tipo de documentos agrupa esta categoría."
                value={descripcionCategoria}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                  setDescripcionCategoria(e.target.value)
                }
              />
            </div>

            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <p className="mb-2 text-xs font-medium text-slate-600">
                Categorías existentes
              </p>
              <div className="flex max-h-40 flex-col gap-2 overflow-auto text-xs">
                {categorias.length === 0 ? (
                  <p className="text-slate-400">
                    Aún no tienes categorías creadas.
                  </p>
                ) : (
                  categorias.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-start justify-between gap-2 rounded-lg bg-white px-2 py-1.5"
                    >
                      <div>
                        <p className="font-medium text-slate-800">
                          {cat.nombre}
                        </p>
                        {cat.descripcion && (
                          <p className="text-[11px] text-slate-500">
                            {cat.descripcion}
                          </p>
                        )}
                      </div>
                      {confirmEliminarCategoriaId === cat.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            className="h-6 rounded-full px-2 text-[10px]"
                            onClick={() => eliminarCategoriaDefinitivo(cat.id)}
                          >
                            Confirmar
                          </Button>
                          <Button
                            variant="outline"
                            className="h-6 rounded-full px-2 text-[10px]"
                            onClick={() => setConfirmEliminarCategoriaId(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            className="h-6 rounded-full px-2 text-[10px] text-slate-600 hover:bg-slate-100"
                            onClick={() => abrirEditarCategoria(cat)}
                          >
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            className="h-6 rounded-full px-2 text-[10px] text-rose-600 hover:bg-rose-50"
                            onClick={() => intentarEliminarCategoria(cat.id)}
                          >
                            Eliminar
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              <p className="mt-2 text-[10px] text-slate-400">
                Al eliminar una categoría, sus documentos quedarán como
                <span className="font-semibold"> "Sin categoría"</span>.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              className="rounded-full px-5 py-2"
              onClick={() => setCategoriaModalAbierto(false)}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-full bg-slate-900 text-white hover:bg-slate-800 px-5 py-2"
              onClick={guardarCategoria}
            >
              Guardar categoría
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal nuevo documento */}
      <Dialog
        open={documentoModalAbierto}
        onOpenChange={(open: boolean) => {
          setDocumentoModalAbierto(open);
          if (!open) {
            resetFormularioDocumento();
          }
        }}
      >
        <DialogContent className="max-w-xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Nuevo documento
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2 flex flex-col gap-4">
            <div className="space-y-2">
              <Label
                htmlFor="nombre-documento"
                className="block text-xs text-slate-700"
              >
                Nombre del documento
              </Label>
              <Input
                id="nombre-documento"
                placeholder="Ej. Reglamento Interno actualizado"
                value={nombreDocumento}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNombreDocumento(e.target.value)
                }
                className="rounded-xl bg-slate-50"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="categoria-documento"
                  className="block text-xs text-slate-700"
                >
                  Categoría
                </Label>
                <select
                  id="categoria-documento"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  value={categoriaDocumento}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setCategoriaDocumento(e.target.value)
                  }
                >
                  <option value="">Sin categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="responsable-documento"
                  className="block text-xs text-slate-700"
                >
                  Responsable
                </Label>
                <Input
                  id="responsable-documento"
                  placeholder="Ej. RRHH, Prevención, Administración"
                  value={responsableDocumento}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setResponsableDocumento(e.target.value)
                  }
                  className="rounded-xl bg-slate-50"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="fecha-emision-documento"
                  className="block text-xs text-slate-700"
                >
                  Fecha de emisión
                </Label>
                <Input
                  id="fecha-emision-documento"
                  type="date"
                  value={fechaEmisionDocumento}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFechaEmisionDocumento(e.target.value)
                  }
                  className="rounded-xl bg-slate-50"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="fecha-vencimiento-documento"
                  className="block text-xs text-slate-700"
                >
                  Fecha de vencimiento (opcional)
                </Label>
                <Input
                  id="fecha-vencimiento-documento"
                  type="date"
                  value={fechaVencimientoDocumento}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFechaVencimientoDocumento(e.target.value)
                  }
                  className="rounded-xl bg-slate-50"
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="block text-xs text-slate-700">Estado</Label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  value={estadoDocumento}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setEstadoDocumento(e.target.value as EstadoDocumento)
                  }
                >
                  <option value="Vigente">Vigente</option>
                  <option value="Por vencer">Por vencer</option>
                  <option value="Vencido">Vencido</option>
                </select>
              </div>

              <div className="flex items-end">
                <div className="flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2">
                  <Checkbox
                    id="aplica-documento"
                    checked={aplicaDocumento}
                    onCheckedChange={(
                      val: boolean | "indeterminate" | undefined
                    ) => setAplicaDocumento(val === true)}
                  />
                  <Label
                    htmlFor="aplica-documento"
                    className="block text-xs text-slate-700"
                  >
                    Este documento aplica a la empresa
                  </Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              className="rounded-full px-5 py-2"
              onClick={() => {
                setDocumentoModalAbierto(false);
                resetFormularioDocumento();
              }}
            >
              Cancelar
            </Button>
            <Button
              className="rounded-full bg-slate-900 text-white hover:bg-slate-800 px-5 py-2"
              onClick={guardarDocumento}
            >
              Guardar documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
