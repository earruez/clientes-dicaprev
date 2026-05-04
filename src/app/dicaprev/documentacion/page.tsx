"use client";

import { useMemo, useRef, useState } from "react";
import { Building2, CalendarClock, FileSearch, FileText, FolderKanban, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoriaDocumento, DocumentoEmpresa, EstadoDocumento, TabDocumentacion } from "./types";
import { useDocumentos } from "./hooks/useDocumentos";
import TableView from "./components/TableView";
import Filtros from "./components/Filtros";

export default function DocumentacionPage() {
  const {
    usuarioActual,
    documentos,
    tabActiva,
    setTabActiva,
    filtrados,
    filtros,
    setFiltros,
    historialGlobal,
    kpis,
    addDocumento,
    replaceDocumentoArchivo,
    updateDocumentoMetadatos,
    marcarDocumentoNoAplica,
  } = useDocumentos();

  const [openUpload, setOpenUpload] = useState(false);
  const [openNewCategory, setOpenNewCategory] = useState(false);
  const [openRequiredConfig, setOpenRequiredConfig] = useState(false);
  const [openReplace, setOpenReplace] = useState(false);
  const [openHistory, setOpenHistory] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openView, setOpenView] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentoEmpresa | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const [uploadForm, setUploadForm] = useState({
    nombre: "",
    categoria: "legales_empresa" as CategoriaDocumento,
    tipo: "",
    fechaEmision: "",
    fechaVencimiento: "",
    tieneVencimiento: true,
    observaciones: "",
    estado: "vigente" as EstadoDocumento,
    version: "1.0",
  });
  const [replaceForm, setReplaceForm] = useState({ version: "", observaciones: "" });
  const [newCategoryForm, setNewCategoryForm] = useState({ nombre: "", descripcion: "", grupo: "legales_empresa" });
  const [customCategories, setCustomCategories] = useState<Array<{ id: string; nombre: string; descripcion: string; grupo: string }>>([]);
  const [requiredDocsConfig, setRequiredDocsConfig] = useState([
    { id: "rq-1", nombre: "Escritura / constitución de empresa", categoria: "Legales empresa", requerido: true },
    { id: "rq-2", nombre: "Inicio de actividades", categoria: "Legales empresa", requerido: true },
    { id: "rq-3", nombre: "Certificado F30-1", categoria: "Laborales y previsionales", requerido: true },
    { id: "rq-4", nombre: "Certificado F30", categoria: "Laborales y previsionales", requerido: true },
    { id: "rq-5", nombre: "Reglamento Interno de Orden, Higiene y Seguridad", categoria: "Seguridad y salud en el trabajo", requerido: true },
    { id: "rq-6", nombre: "Matriz IPER", categoria: "Seguridad y salud en el trabajo", requerido: true },
    { id: "rq-7", nombre: "Plan anual de prevención", categoria: "Seguridad y salud en el trabajo", requerido: true },
    { id: "rq-8", nombre: "Certificado de afiliación Ley 16.744", categoria: "Mutualidad / Ley 16.744", requerido: true },
    { id: "rq-9", nombre: "Tasa de cotización adicional", categoria: "Mutualidad / Ley 16.744", requerido: true },
    { id: "rq-10", nombre: "Protocolo psicosocial", categoria: "Protocolos", requerido: true },
  ]);

  const uploadFileRef = useRef<HTMLInputElement>(null);
  const replaceFileRef = useRef<HTMLInputElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);

  const hasActiveFilters = filtros.estado !== "todos" || filtros.search.trim() !== "";
  const tabs: Array<{ key: TabDocumentacion; label: string }> = [
    { key: "todos", label: "Todos" },
    { key: "legales_empresa", label: "Legales empresa" },
    { key: "laborales_previsionales", label: "Laborales y previsionales" },
    { key: "sst", label: "Seguridad y salud en el trabajo" },
    { key: "mutualidad_ley_16744", label: "Mutualidad / Ley 16.744" },
    { key: "protocolos", label: "Protocolos" },
    { key: "historial", label: "Historial" },
  ];

  const dataTable = tabActiva === "historial" ? documentos : filtrados;

  const selectedHistory = useMemo(() => {
    if (!selectedDoc) return [];
    return [...selectedDoc.historial].sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [selectedDoc]);

  function categoryLabel(value: CategoriaDocumento) {
    return {
      legales_empresa: "Legales empresa",
      laborales_previsionales: "Laborales y previsionales",
      sst: "Seguridad y salud en el trabajo",
      mutualidad_ley_16744: "Mutualidad / Ley 16.744",
      protocolos: "Protocolos",
    }[value];
  }

  function handleUpload() {
    if (!uploadFile || !uploadForm.nombre.trim() || !uploadForm.categoria) {
      setInfoMessage("Debes completar nombre, categoría y archivo.");
      return;
    }
    if (uploadForm.tieneVencimiento && !uploadForm.fechaVencimiento) {
      setInfoMessage("Si el documento tiene vencimiento, debes ingresar la fecha de vencimiento.");
      return;
    }

    const ok = addDocumento({
      nombre: uploadForm.nombre,
      categoria: uploadForm.categoria,
      tipo: uploadForm.tipo,
      archivo: uploadFile,
      fechaEmision: uploadForm.fechaEmision,
      fechaVencimiento: uploadForm.tieneVencimiento ? uploadForm.fechaVencimiento : null,
      tieneVencimiento: uploadForm.tieneVencimiento,
      observaciones: uploadForm.observaciones,
      estado: uploadForm.estado,
      version: uploadForm.version,
    });

    if (!ok) {
      setInfoMessage("No se pudo guardar el documento. Revisa los datos requeridos.");
      return;
    }

    setInfoMessage("Documento cargado correctamente con trazabilidad registrada.");
    setOpenUpload(false);
    setUploadForm({
      nombre: "",
      categoria: "legales_empresa",
      tipo: "",
      fechaEmision: "",
      fechaVencimiento: "",
      tieneVencimiento: true,
      observaciones: "",
      estado: "vigente",
      version: "1.0",
    });
    setUploadFile(null);
    if (uploadFileRef.current) uploadFileRef.current.value = "";
  }

  function handleDownload(doc: DocumentoEmpresa) {
    if (!doc.archivoUrl) {
      setInfoMessage("Este documento no tiene archivo cargado.");
      return;
    }
    window.open(doc.archivoUrl, "_blank", "noopener,noreferrer");
  }

  function handleReplace() {
    if (!selectedDoc || !replaceFile) {
      setInfoMessage("Selecciona un documento y archivo para reemplazar.");
      return;
    }
    const ok = replaceDocumentoArchivo({
      documentoId: selectedDoc.id,
      archivo: replaceFile,
      version: replaceForm.version || selectedDoc.version,
      observaciones: replaceForm.observaciones,
    });
    if (!ok) {
      setInfoMessage("No se pudo reemplazar el archivo.");
      return;
    }
    setInfoMessage("Archivo reemplazado y trazabilidad actualizada.");
    setOpenReplace(false);
    setReplaceFile(null);
    setReplaceForm({ version: "", observaciones: "" });
    if (replaceFileRef.current) replaceFileRef.current.value = "";
  }

  function handleEditMetadata() {
    if (!selectedDoc) return;
    const ok = updateDocumentoMetadatos({
      documentoId: selectedDoc.id,
      nombre: selectedDoc.nombre,
      categoria: selectedDoc.categoria,
      tipo: selectedDoc.tipo,
      estado: selectedDoc.estado,
      fechaEmision: selectedDoc.fechaEmision,
      fechaVencimiento: selectedDoc.tieneVencimiento ? selectedDoc.fechaVencimiento : null,
      tieneVencimiento: selectedDoc.tieneVencimiento,
      observaciones: selectedDoc.observaciones,
      version: selectedDoc.version,
    });
    setInfoMessage(ok ? "Metadatos actualizados correctamente." : "No se pudieron actualizar metadatos.");
    setOpenEdit(false);
  }

  function openReplaceDialog(doc: DocumentoEmpresa) {
    setSelectedDoc(doc);
    setReplaceForm({ version: doc.version, observaciones: doc.observaciones });
    setOpenReplace(true);
  }

  function openHistoryDialog(doc: DocumentoEmpresa) {
    setSelectedDoc(doc);
    setOpenHistory(true);
  }

  function openEditDialog(doc: DocumentoEmpresa) {
    setSelectedDoc({ ...doc });
    setOpenEdit(true);
  }

  function openViewDialog(doc: DocumentoEmpresa) {
    setSelectedDoc(doc);
    setOpenView(true);
  }

  function handleCreateCategory() {
    if (!newCategoryForm.nombre.trim()) {
      setInfoMessage("Debes ingresar el nombre de la categoría.");
      return;
    }

    setCustomCategories((prev) => [
      {
        id: `cat-${Date.now()}`,
        nombre: newCategoryForm.nombre.trim(),
        descripcion: newCategoryForm.descripcion.trim(),
        grupo: newCategoryForm.grupo,
      },
      ...prev,
    ]);
    setInfoMessage("Nueva categoría registrada (modo mock local).");
    setOpenNewCategory(false);
    setNewCategoryForm({ nombre: "", descripcion: "", grupo: "legales_empresa" });
  }

  function toggleRequiredDoc(id: string) {
    setRequiredDocsConfig((prev) => prev.map((d) => (d.id === id ? { ...d, requerido: !d.requerido } : d)));
  }

  function saveRequiredConfig() {
    const requiredCount = requiredDocsConfig.filter((d) => d.requerido).length;
    setInfoMessage(`Configuración guardada en modo local. Documentos requeridos activos: ${requiredCount}.`);
    setOpenRequiredConfig(false);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-slate-900 p-2.5 text-white">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Módulo Empresa</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">Documentación legal de la empresa</h1>
              <p className="mt-1 text-sm text-slate-600">
                Repositorio corporativo para mantener vigente, trazable y auditable la documentación legal, laboral y preventiva de la empresa.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button className="bg-slate-900 text-white hover:bg-slate-800 [&_svg]:text-white" onClick={() => setOpenUpload(true)}>
              <Upload className="mr-1 h-4 w-4" />Subir documento
            </Button>
            <Button variant="outline" onClick={() => setOpenNewCategory(true)}>Nueva categoría</Button>
            <Button variant="outline" onClick={() => setOpenRequiredConfig(true)}>Configurar documentos requeridos</Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
          <KpiCard label="Documentos totales" value={kpis.total} icon={<FileText className="h-4 w-4" />} tone="slate" />
          <KpiCard label="Vigentes" value={kpis.vigentes} icon={<ShieldCheck className="h-4 w-4" />} tone="emerald" />
          <KpiCard label="Por vencer" value={kpis.porVencer} icon={<CalendarClock className="h-4 w-4" />} tone="amber" />
          <KpiCard label="Vencidos" value={kpis.vencidos} icon={<FileSearch className="h-4 w-4" />} tone="rose" />
          <KpiCard label="Pendientes de carga" value={kpis.pendientesCarga} icon={<Building2 className="h-4 w-4" />} tone="sky" />
          <KpiCard label="Actualizados este mes" value={kpis.actualizadosMes} icon={<FileText className="h-4 w-4" />} tone="slate" />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {tabs.map((item) => (
            <button
              key={item.key}
              onClick={() => setTabActiva(item.key)}
              className={[
                "rounded-lg px-3 py-2 text-sm font-medium transition",
                tabActiva === item.key
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-800">Filtros</h2>
          <span className="text-xs text-slate-500">
            Mostrando {filtrados.length} de {documentos.length}
          </span>
        </div>
        <Filtros filtros={filtros} onChangeFiltros={setFiltros} />
      </div>

      {hasActiveFilters ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs text-slate-600">
          Filtros activos: {filtros.estado !== "todos" ? `estado ${filtros.estado}` : "estado todos"}
          {filtros.search.trim() ? ` · búsqueda "${filtros.search}"` : ""}
        </div>
      ) : null}

      {infoMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {infoMessage}
        </div>
      ) : null}

      {tabActiva === "historial" ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-800">Historial global documental</h3>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {historialGlobal.map((h) => (
              <div key={h.id} className="border-b border-slate-100 px-4 py-3 text-sm">
                <p className="font-medium text-slate-800">{h.accion} · {h.documentoNombre}</p>
                <p className="text-xs text-slate-500">
                  {new Date(h.fecha).toLocaleString("es-CL")} · {h.usuario} ({h.usuarioEmail})
                </p>
                <p className="mt-1 text-slate-600">{h.detalle}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tabActiva !== "historial" && filtrados.length === 0 && hasActiveFilters ? (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-8 text-center">
          <FileSearch className="mx-auto h-12 w-12 text-slate-200 mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No se encontraron documentos</h3>
          <p className="text-slate-600 mb-4">
            No hay documentos que coincidan con los filtros aplicados.
          </p>
          <div className="text-sm text-slate-500 space-y-1">
            {filtros.estado !== "todos" && (
              <p>Estado filtrado: <span className="font-medium capitalize">{filtros.estado}</span></p>
            )}
            {filtros.search.trim() && (
              <p>Búsqueda: <span className="font-medium">&quot;{filtros.search}&quot;</span></p>
            )}
          </div>
        </div>
      ) : (
        tabActiva !== "historial" ? (
          <TableView
            documentos={dataTable}
            onView={openViewDialog}
            onDownload={handleDownload}
            onReplace={openReplaceDialog}
            onHistory={openHistoryDialog}
            onEdit={openEditDialog}
            onNoAplica={(doc) => {
              marcarDocumentoNoAplica(doc.id);
              setInfoMessage("Documento marcado como no aplica.");
            }}
          />
        ) : null
      )}

      <Dialog open={openUpload} onOpenChange={setOpenUpload}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Subir documento</DialogTitle>
            <DialogDescription>Registro corporativo con trazabilidad automática de carga.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1 md:col-span-2">
              <Label>Nombre del documento</Label>
              <Input value={uploadForm.nombre} onChange={(e) => setUploadForm((p) => ({ ...p, nombre: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Select value={uploadForm.categoria} onValueChange={(v) => setUploadForm((p) => ({ ...p, categoria: v as CategoriaDocumento }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="legales_empresa">Legales empresa</SelectItem>
                  <SelectItem value="laborales_previsionales">Laborales y previsionales</SelectItem>
                  <SelectItem value="sst">Seguridad y salud en el trabajo</SelectItem>
                  <SelectItem value="mutualidad_ley_16744">Mutualidad / Ley 16.744</SelectItem>
                  <SelectItem value="protocolos">Protocolos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tipo de documento</Label>
              <Input value={uploadForm.tipo} onChange={(e) => setUploadForm((p) => ({ ...p, tipo: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Archivo</Label>
              <input ref={uploadFileRef} type="file" onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-1">
              <Label>Fecha de emisión</Label>
              <Input type="date" value={uploadForm.fechaEmision} onChange={(e) => setUploadForm((p) => ({ ...p, fechaEmision: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Tiene vencimiento</Label>
              <Select value={uploadForm.tieneVencimiento ? "si" : "no"} onValueChange={(v) => setUploadForm((p) => ({ ...p, tieneVencimiento: v === "si" }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="si">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Fecha de vencimiento</Label>
              <Input
                type="date"
                value={uploadForm.fechaVencimiento}
                onChange={(e) => setUploadForm((p) => ({ ...p, fechaVencimiento: e.target.value }))}
                disabled={!uploadForm.tieneVencimiento}
              />
            </div>
            <div className="space-y-1">
              <Label>Estado inicial</Label>
              <Select value={uploadForm.estado} onValueChange={(v) => setUploadForm((p) => ({ ...p, estado: v as EstadoDocumento }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vigente">Vigente</SelectItem>
                  <SelectItem value="por_vencer">Por vencer</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="pendiente_carga">Pendiente de carga</SelectItem>
                  <SelectItem value="en_revision">En revisión</SelectItem>
                  <SelectItem value="reemplazado">Reemplazado</SelectItem>
                  <SelectItem value="no_aplica">No aplica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Versión</Label>
              <Input value={uploadForm.version} onChange={(e) => setUploadForm((p) => ({ ...p, version: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>Observaciones</Label>
              <Textarea value={uploadForm.observaciones} onChange={(e) => setUploadForm((p) => ({ ...p, observaciones: e.target.value }))} />
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 md:col-span-2">
              Subido por: {usuarioActual.nombre} ({usuarioActual.email}) · Fecha/hora de carga: automática
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenUpload(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleUpload}>Guardar documento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openNewCategory} onOpenChange={setOpenNewCategory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva categoría</DialogTitle>
            <DialogDescription>Crea una categoría corporativa para organizar documentos legales de empresa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre categoría</Label>
              <Input
                value={newCategoryForm.nombre}
                onChange={(e) => setNewCategoryForm((p) => ({ ...p, nombre: e.target.value }))}
                placeholder="Ej: Cumplimiento societario"
              />
            </div>
            <div className="space-y-1">
              <Label>Grupo base</Label>
              <Select value={newCategoryForm.grupo} onValueChange={(v) => setNewCategoryForm((p) => ({ ...p, grupo: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="legales_empresa">Legales empresa</SelectItem>
                  <SelectItem value="laborales_previsionales">Laborales y previsionales</SelectItem>
                  <SelectItem value="sst">Seguridad y salud en el trabajo</SelectItem>
                  <SelectItem value="mutualidad_ley_16744">Mutualidad / Ley 16.744</SelectItem>
                  <SelectItem value="protocolos">Protocolos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Textarea
                value={newCategoryForm.descripcion}
                onChange={(e) => setNewCategoryForm((p) => ({ ...p, descripcion: e.target.value }))}
                placeholder="Describe cuándo usar esta categoría"
              />
            </div>
            {customCategories.length > 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Categorías creadas en esta sesión</p>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  {customCategories.slice(0, 4).map((cat) => (
                    <p key={cat.id}>{cat.nombre} · {cat.grupo}</p>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenNewCategory(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreateCategory}>Guardar categoría</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openRequiredConfig} onOpenChange={setOpenRequiredConfig}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Configurar documentos requeridos</DialogTitle>
            <DialogDescription>Define el set obligatorio para auditoría corporativa. El estado se guarda en modo mock local.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[420px] space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">
            {requiredDocsConfig.map((doc) => (
              <label key={doc.id} className="flex items-start gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2">
                <input
                  type="checkbox"
                  checked={doc.requerido}
                  onChange={() => toggleRequiredDoc(doc.id)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <div>
                  <p className="text-sm font-medium text-slate-800">{doc.nombre}</p>
                  <p className="text-xs text-slate-500">{doc.categoria}</p>
                </div>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenRequiredConfig(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={saveRequiredConfig}>Guardar configuración</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openReplace} onOpenChange={setOpenReplace}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reemplazar archivo</DialogTitle>
            <DialogDescription>Mantiene historial y trazabilidad del documento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <input ref={replaceFileRef} type="file" onChange={(e) => setReplaceFile(e.target.files?.[0] ?? null)} />
            <div className="space-y-1">
              <Label>Versión</Label>
              <Input value={replaceForm.version} onChange={(e) => setReplaceForm((p) => ({ ...p, version: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Observaciones</Label>
              <Textarea value={replaceForm.observaciones} onChange={(e) => setReplaceForm((p) => ({ ...p, observaciones: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenReplace(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleReplace}>Confirmar reemplazo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openHistory} onOpenChange={setOpenHistory}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Historial del documento</DialogTitle>
            <DialogDescription>{selectedDoc?.nombre}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[420px] overflow-y-auto rounded-lg border border-slate-200">
            {selectedHistory.map((h) => (
              <div key={h.id} className="border-b border-slate-100 px-4 py-3 text-sm">
                <p className="font-medium text-slate-800">{h.accion}</p>
                <p className="text-xs text-slate-500">{new Date(h.fecha).toLocaleString("es-CL")} · {h.usuario} ({h.usuarioEmail})</p>
                <p className="mt-1 text-slate-600">{h.detalle}</p>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenHistory(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Editar metadatos</DialogTitle>
            <DialogDescription>Actualiza nombre, categoría, estado, vigencia y versión del documento.</DialogDescription>
          </DialogHeader>
          {selectedDoc ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <Label>Nombre</Label>
                <Input value={selectedDoc.nombre} onChange={(e) => setSelectedDoc((p) => (p ? { ...p, nombre: e.target.value } : p))} />
              </div>
              <div className="space-y-1">
                <Label>Categoría</Label>
                <Select value={selectedDoc.categoria} onValueChange={(v) => setSelectedDoc((p) => (p ? { ...p, categoria: v as CategoriaDocumento } : p))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="legales_empresa">Legales empresa</SelectItem>
                    <SelectItem value="laborales_previsionales">Laborales y previsionales</SelectItem>
                    <SelectItem value="sst">Seguridad y salud en el trabajo</SelectItem>
                    <SelectItem value="mutualidad_ley_16744">Mutualidad / Ley 16.744</SelectItem>
                    <SelectItem value="protocolos">Protocolos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Input value={selectedDoc.tipo} onChange={(e) => setSelectedDoc((p) => (p ? { ...p, tipo: e.target.value } : p))} />
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={selectedDoc.estado} onValueChange={(v) => setSelectedDoc((p) => (p ? { ...p, estado: v as EstadoDocumento } : p))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vigente">Vigente</SelectItem>
                    <SelectItem value="por_vencer">Por vencer</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                    <SelectItem value="pendiente_carga">Pendiente de carga</SelectItem>
                    <SelectItem value="en_revision">En revisión</SelectItem>
                    <SelectItem value="reemplazado">Reemplazado</SelectItem>
                    <SelectItem value="no_aplica">No aplica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Versión</Label>
                <Input value={selectedDoc.version} onChange={(e) => setSelectedDoc((p) => (p ? { ...p, version: e.target.value } : p))} />
              </div>
              <div className="space-y-1">
                <Label>Fecha emisión</Label>
                <Input type="date" value={selectedDoc.fechaEmision} onChange={(e) => setSelectedDoc((p) => (p ? { ...p, fechaEmision: e.target.value } : p))} />
              </div>
              <div className="space-y-1">
                <Label>Fecha vencimiento</Label>
                <Input
                  type="date"
                  value={selectedDoc.fechaVencimiento ?? ""}
                  onChange={(e) => setSelectedDoc((p) => (p ? { ...p, fechaVencimiento: e.target.value || null } : p))}
                  disabled={!selectedDoc.tieneVencimiento}
                />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Observaciones</Label>
                <Textarea value={selectedDoc.observaciones} onChange={(e) => setSelectedDoc((p) => (p ? { ...p, observaciones: e.target.value } : p))} />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenEdit(false)}>Cancelar</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleEditMetadata}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openView} onOpenChange={setOpenView}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ver documento</DialogTitle>
            <DialogDescription>{selectedDoc?.nombre}</DialogDescription>
          </DialogHeader>
          {selectedDoc ? (
            <div className="space-y-2 text-sm text-slate-700">
              <p><span className="font-medium text-slate-900">Categoría:</span> {categoryLabel(selectedDoc.categoria)}</p>
              <p><span className="font-medium text-slate-900">Tipo:</span> {selectedDoc.tipo}</p>
              <p><span className="font-medium text-slate-900">Estado:</span> {selectedDoc.estado}</p>
              <p><span className="font-medium text-slate-900">Archivo:</span> {selectedDoc.archivoNombre ?? "Sin archivo"}</p>
              <p><span className="font-medium text-slate-900">Versión:</span> {selectedDoc.version}</p>
              <p><span className="font-medium text-slate-900">Subido por:</span> {selectedDoc.subidoPorEmail}</p>
              <p><span className="font-medium text-slate-900">Fecha subida:</span> {new Date(selectedDoc.fechaSubida).toLocaleString("es-CL")}</p>
              <p><span className="font-medium text-slate-900">Última actualización:</span> {new Date(selectedDoc.fechaActualizacion).toLocaleString("es-CL")}</p>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenView(false)}>Cerrar</Button>
            <Button onClick={() => selectedDoc && handleDownload(selectedDoc)} disabled={!selectedDoc?.archivoUrl}>Descargar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "slate" | "emerald" | "amber" | "rose" | "sky";
}) {
  const toneClass = {
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    rose: "bg-rose-50 text-rose-700 border-rose-200",
    sky: "bg-sky-50 text-sky-700 border-sky-200",
  }[tone];

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wide">{label}</p>
        <span>{icon}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}