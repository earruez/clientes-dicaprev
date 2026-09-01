"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import {
  createEmpresaAction,
  eliminarEmpresaDefinitivamenteAction,
  createUsuarioAction,
  ensureBackfillAction,
  getEmpresaDeletionPreviewAction,
  prepararEmpresaAction,
  toggleEmpresaActivaAction,
  toggleEmpresaModuloAction,
  toggleUsuarioActivoAction,
  toggleUsuarioEmpresaActivoAction,
  updateEmpresaAction,
  upsertUsuarioEmpresaAction,
  type SuperadminData,
} from "./actions";
import { COMPANY_MODULE_LABELS, COMPANY_MODULES, type CompanyModuleKey } from "@/lib/company-modules";
import type { Rol } from "@prisma/client";

const SUPERADMIN_ROLES: Rol[] = [
  "SUPERADMIN",
  "ADMIN_EMPRESA",
  "PREVENCIONISTA",
  "SUPERVISOR",
  "TRABAJADOR",
  "AUDITOR",
  "LECTURA",
];

type Message = { type: "success" | "error"; text: string; id: string };
type ConfirmData = { title: string; description: string; action: () => Promise<void>; isDestructive?: boolean } | null;
type DeletePreview = {
  empresaId: string;
  nombre: string;
  rut: string | null;
  protegida: boolean;
  protegidaMotivo: string | null;
  esEmpresaActivaUsuario: boolean;
  canDelete: boolean;
  counts: {
    trabajadores: number;
    documentosEmpresa: number;
    documentosTrabajadores: number;
    capacitaciones: number;
    asignaciones: number;
    contratistas: number;
    acreditaciones: number;
    checklists: number;
    hallazgos: number;
    usuariosAsociados: number;
  };
};

export default function SuperadminClient({ data, appUrl }: { data: SuperadminData; appUrl: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState<Message[]>([]);
  const [confirm, setConfirm] = useState<ConfirmData>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [isCreatingEmpresa, setIsCreatingEmpresa] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState<1 | 2 | 3>(1);
  const [deletePreview, setDeletePreview] = useState<DeletePreview | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteTargetEmpresaId, setDeleteTargetEmpresaId] = useState<string>("");

  // Form refs para limpiar después de Submit
  const createEmpresaFormRef = useRef<HTMLFormElement>(null);
  const createUsuarioFormRef = useRef<HTMLFormElement>(null);
  const upsertUserEmpresaFormRef = useRef<HTMLFormElement>(null);

  const addMessage = useCallback((type: "success" | "error", text: string) => {
    const id = Math.random().toString(36).slice(2);
    setMessages((prev) => [...prev, { type, text, id }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, 5000);
  }, []);

  const handleError = (error: unknown) => {
    const errorMsg = error instanceof Error ? error.message : String(error);
    addMessage("error", errorMsg);
    console.error("Action error:", error);
  };

  const withConfirm = (title: string, description: string, action: () => Promise<void>, isDestructive = false) => {
    setConfirm({ title, description, action, isDestructive });
  };

  const executeConfirmedAction = async () => {
    if (!confirm) return;
    setLoadingAction("confirm");
    try {
      await confirm.action();
      setConfirm(null);
    } catch (error) {
      handleError(error);
    } finally {
      setLoadingAction(null);
    }
  };

  // ==================== EMPRESA ====================

  const handleCreateEmpresa = async (formData: FormData) => {
    if (isCreatingEmpresa || isPending) {
      return;
    }

    const nombre = formData.get("nombre") as string;

    if (!nombre?.trim()) {
      addMessage("error", "Nombre de empresa es requerido");
      return;
    }

    setIsCreatingEmpresa(true);
    startTransition(async () => {
      try {
        const result = await createEmpresaAction(formData);
        addMessage("success", `Empresa "${result.empresa.nombre}" creada exitosamente`);
        if (createEmpresaFormRef.current) {
          createEmpresaFormRef.current.reset();
        }
        router.refresh();
      } catch (error) {
        handleError(error);
      } finally {
        setIsCreatingEmpresa(false);
      }
    });
  };

  const handleUpdateEmpresa = async (formData: FormData) => {
    const nombre = formData.get("nombre") as string;

    if (!nombre?.trim()) {
      addMessage("error", "Nombre de empresa es requerido");
      return;
    }

    startTransition(async () => {
      try {
        await updateEmpresaAction(formData);
        addMessage("success", `Empresa actualizada exitosamente`);
        router.refresh();
      } catch (error) {
        handleError(error);
      }
    });
  };

  const handleToggleEmpresaActiva = (empresa: SuperadminData["empresas"][0]) => {
    const newState = !empresa.activa;
    withConfirm(
      newState ? "Activar empresa" : "Desactivar empresa",
      `¿Está seguro que desea ${newState ? "activar" : "desactivar"} "${empresa.nombre}"?`,
      async () => {
        const formData = new FormData();
        formData.set("empresaId", empresa.id);
        formData.set("activa", newState ? "1" : "0");
        await toggleEmpresaActivaAction(formData);
        addMessage("success", `Empresa ${newState ? "activada" : "desactivada"}`);
        router.refresh();
      },
      true
    );
  };

  const handlePrepararEmpresa = (empresaId: string, nombre: string) => {
    withConfirm(
      "Preparar empresa",
      `Esto ejecutará bootstrap/backfill en "${nombre}". ¿Continuar?`,
      async () => {
        setLoadingAction(`prepare-${empresaId}`);
        try {
          const formData = new FormData();
          formData.set("empresaId", empresaId);
          await prepararEmpresaAction(formData);
          addMessage("success", `Empresa "${nombre}" preparada exitosamente`);
          router.refresh();
        } catch (error) {
          handleError(error);
        } finally {
          setLoadingAction(null);
        }
      },
      false
    );
  };

  const handleBackfill = () => {
    withConfirm(
      "Ejecutar backfill idempotente",
      "Esto sincronizará usuarios y módulos en todas las empresas. ¿Continuar?",
      async () => {
        setLoadingAction("backfill");
        try {
          await ensureBackfillAction();
          addMessage("success", "Backfill completado exitosamente");
          router.refresh();
        } catch (error) {
          handleError(error);
        } finally {
          setLoadingAction(null);
        }
      },
      false
    );
  };

  const openDeleteEmpresaModal = async (empresaId: string) => {
    setLoadingAction(`delete-preview-${empresaId}`);
    try {
      const formData = new FormData();
      formData.set("empresaId", empresaId);
      const preview = await getEmpresaDeletionPreviewAction(formData);
      setDeleteTargetEmpresaId(empresaId);
      setDeletePreview(preview);
      setDeleteStep(1);
      setDeleteConfirmText("");
      setDeletePassword("");
      setDeleteModalOpen(true);
    } catch (error) {
      handleError(error);
    } finally {
      setLoadingAction(null);
    }
  };

  const closeDeleteEmpresaModal = () => {
    setDeleteModalOpen(false);
    setDeleteStep(1);
    setDeletePreview(null);
    setDeleteConfirmText("");
    setDeletePassword("");
    setDeleteTargetEmpresaId("");
  };

  const handleDeleteEmpresaDefinitiva = async () => {
    if (!deletePreview) return;

    setLoadingAction(`delete-confirm-${deletePreview.empresaId}`);
    try {
      const formData = new FormData();
      formData.set("empresaId", deletePreview.empresaId);
      formData.set("confirmacionTexto", deleteConfirmText);
      formData.set("currentPassword", deletePassword);
      const result = await eliminarEmpresaDefinitivamenteAction(formData);

      if (!result.ok) {
        addMessage("error", result.error);
        return;
      }

      addMessage("success", result.message);
      closeDeleteEmpresaModal();
      router.refresh();
    } catch (error) {
      handleError(error);
    } finally {
      setLoadingAction(null);
    }
  };

  // ==================== USUARIO ====================

  const handleCreateUsuario = async (formData: FormData) => {
    const nombre = formData.get("nombre") as string;
    const email = formData.get("email") as string;
    const empresaId = formData.get("empresaId") as string;
    const rol = formData.get("rol") as string;
    const passwordTemporal = formData.get("passwordTemporal") as string;
    const confirmarPasswordTemporal = formData.get("confirmarPasswordTemporal") as string;

    if (!nombre?.trim()) {
      addMessage("error", "Nombre de usuario es requerido");
      return;
    }

    if (!email?.trim() || !email.includes("@")) {
      addMessage("error", "Email válido es requerido");
      return;
    }

    if (!empresaId) {
      addMessage("error", "Empresa es requerida");
      return;
    }

    if (!rol || !SUPERADMIN_ROLES.includes(rol as Rol)) {
      addMessage("error", "Rol válido es requerido");
      return;
    }

    if (!passwordTemporal?.trim()) {
      addMessage("error", "Contraseña temporal es requerida");
      return;
    }

    if (passwordTemporal.trim().length < 8) {
      addMessage("error", "La contraseña temporal debe tener al menos 8 caracteres");
      return;
    }

    if (passwordTemporal !== confirmarPasswordTemporal) {
      addMessage("error", "La confirmación de contraseña no coincide");
      return;
    }

    // Check for duplicates
    const exists = data.usuarios.some((u) => u.email.toLowerCase() === email.toLowerCase());
    if (exists) {
      addMessage("error", "Un usuario con este email ya existe");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createUsuarioAction(formData);
        addMessage(
          result.correoEnviado ? "success" : "error",
          result.correoEnviado
            ? `Usuario "${email}" creado y correo de bienvenida enviado`
            : `Usuario "${email}" creado, pero no fue posible enviar el correo de bienvenida`,
        );
        if (createUsuarioFormRef.current) {
          createUsuarioFormRef.current.reset();
        }
        router.refresh();
      } catch (error) {
        handleError(error);
      }
    });
  };

  const handleToggleUsuarioActivo = (usuario: SuperadminData["usuarios"][0]) => {
    const newState = !usuario.activo;
    withConfirm(
      newState ? "Activar usuario" : "Desactivar usuario",
      `¿Está seguro que desea ${newState ? "activar" : "desactivar"} "${usuario.email}"?`,
      async () => {
        const formData = new FormData();
        formData.set("usuarioId", usuario.id);
        formData.set("activo", newState ? "1" : "0");
        const result = await toggleUsuarioActivoAction(formData);
        if (!result.ok) {
          throw new Error(result.error);
        }
        addMessage("success", `Usuario ${newState ? "activado" : "desactivado"}`);
        router.refresh();
      },
      true
    );
  };

  // ==================== USUARIO-EMPRESA ====================

  const handleUpsertUsuarioEmpresa = async (formData: FormData) => {
    const usuarioId = formData.get("usuarioId") as string;
    const empresaId = formData.get("empresaId") as string;
    const rol = formData.get("rol") as string;

    if (!usuarioId) {
      addMessage("error", "Usuario es requerido");
      return;
    }

    if (!empresaId) {
      addMessage("error", "Empresa es requerida");
      return;
    }

    if (!rol) {
      addMessage("error", "Rol es requerido");
      return;
    }

    startTransition(async () => {
      try {
        await upsertUsuarioEmpresaAction(formData);
        const usuario = data.usuarios.find((u) => u.id === usuarioId);
        const empresa = data.empresas.find((e) => e.id === empresaId);
        addMessage("success", `${usuario?.email} asignado a "${empresa?.nombre}" como ${rol}`);
        if (upsertUserEmpresaFormRef.current) {
          upsertUserEmpresaFormRef.current.reset();
        }
        router.refresh();
      } catch (error) {
        handleError(error);
      }
    });
  };

  const handleToggleUsuarioEmpresaActivo = (asignacion: SuperadminData["asignaciones"][0]) => {
    const newState = !asignacion.activo;
    withConfirm(
      newState ? "Activar asignación" : "Desactivar asignación",
      `¿Está seguro que desea ${newState ? "activar" : "desactivar"} "${asignacion.usuarioEmail}" en "${asignacion.empresaNombre}"?`,
      async () => {
        const formData = new FormData();
        formData.set("id", asignacion.id);
        formData.set("activo", newState ? "1" : "0");
        await toggleUsuarioEmpresaActivoAction(formData);
        addMessage("success", `Asignación ${newState ? "activada" : "desactivada"}`);
        router.refresh();
      },
      true
    );
  };

  // ==================== MODULOS ====================

  const handleToggleModulo = (empresaId: string, modulo: CompanyModuleKey, activo: boolean, moduloLabel: string) => {
    const newState = !activo;
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("empresaId", empresaId);
        formData.set("modulo", modulo);
        formData.set("activo", newState ? "1" : "0");
        await toggleEmpresaModuloAction(formData);
        addMessage("success", `Módulo "${moduloLabel}" ${newState ? "activado" : "desactivado"}`);
        router.refresh();
      } catch (error) {
        handleError(error);
      }
    });
  };

  const isLoading = isPending || loadingAction !== null;
  const canConfirmDelete =
    (deletePreview?.canDelete ?? false) &&
    deleteConfirmText === "ELIMINAR EMPRESA" &&
    deletePassword.trim().length > 0;

  return (
    <>
      {/* Message Toast */}
      {messages.length > 0 && (
        <div className="fixed right-4 top-4 z-50 space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium shadow-lg animate-in slide-in-from-right-4 ${
                msg.type === "success"
                  ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                  : "bg-rose-50 text-rose-900 border border-rose-200"
              }`}
            >
              {msg.type === "success" ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>{msg.text}</span>
              <button onClick={() => setMessages((m) => m.filter((x) => x.id !== msg.id))}>
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg max-w-sm">
            <h3 className="text-lg font-semibold text-slate-900">{confirm.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{confirm.description}</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setConfirm(null)}
                disabled={loadingAction === "confirm"}
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={executeConfirmedAction}
                disabled={loadingAction === "confirm"}
                className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                  confirm.isDestructive
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {loadingAction === "confirm" && <Loader2 className="h-4 w-4 animate-spin" />}
                {confirm.isDestructive ? "Confirmar" : "Continuar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && deletePreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-rose-200 bg-white p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-rose-900">Eliminar definitivamente empresa</h3>
            <p className="mt-1 text-sm text-slate-600">
              Empresa objetivo: <span className="font-semibold">{deletePreview.nombre}</span>
              {deletePreview.rut ? ` (${deletePreview.rut})` : ""}
            </p>

            {deleteStep === 1 && (
              <div className="mt-4 space-y-4">
                <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
                  <p>Esta acción eliminará de forma definitiva:</p>
                  <ul className="mt-2 list-disc pl-5">
                    <li>empresa y configuración</li>
                    <li>documentos asociados si corresponde</li>
                    <li>módulos, asignaciones y relaciones</li>
                    <li>esta acción no se puede deshacer</li>
                  </ul>
                </div>

                <div className="grid gap-2 rounded-md border border-slate-200 p-3 text-sm text-slate-700 md:grid-cols-2">
                  <p>Trabajadores: <span className="font-semibold">{deletePreview.counts.trabajadores}</span></p>
                  <p>Documentos empresa: <span className="font-semibold">{deletePreview.counts.documentosEmpresa}</span></p>
                  <p>Documentos trabajadores: <span className="font-semibold">{deletePreview.counts.documentosTrabajadores}</span></p>
                  <p>Capacitaciones: <span className="font-semibold">{deletePreview.counts.capacitaciones}</span></p>
                  <p>Asignaciones: <span className="font-semibold">{deletePreview.counts.asignaciones}</span></p>
                  <p>Contratistas: <span className="font-semibold">{deletePreview.counts.contratistas}</span></p>
                  <p>Acreditaciones: <span className="font-semibold">{deletePreview.counts.acreditaciones}</span></p>
                  <p>Checklists: <span className="font-semibold">{deletePreview.counts.checklists}</span></p>
                  <p>Hallazgos: <span className="font-semibold">{deletePreview.counts.hallazgos}</span></p>
                  <p>Usuarios asociados: <span className="font-semibold">{deletePreview.counts.usuariosAsociados}</span></p>
                </div>

                {deletePreview.protegidaMotivo && (
                  <p className="text-sm font-semibold text-rose-700">{deletePreview.protegidaMotivo}</p>
                )}
                {deletePreview.esEmpresaActivaUsuario && (
                  <p className="text-sm font-semibold text-rose-700">
                    No puede eliminar su empresa activa actual. Cambie la empresa activa antes de continuar.
                  </p>
                )}
              </div>
            )}

            {deleteStep === 2 && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-slate-700">
                  Escriba exactamente: <span className="font-semibold">ELIMINAR EMPRESA</span>
                </p>
                <input
                  value={deleteConfirmText}
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="ELIMINAR EMPRESA"
                />
              </div>
            )}

            {deleteStep === 3 && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-slate-700">Ingrese su clave de SUPERADMIN para confirmar.</p>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(event) => setDeletePassword(event.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Clave actual"
                />
              </div>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={closeDeleteEmpresaModal}
                disabled={isLoading}
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>

              {deleteStep > 1 && (
                <button
                  onClick={() => setDeleteStep((prev) => (prev - 1) as 1 | 2 | 3)}
                  disabled={isLoading}
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Volver
                </button>
              )}

              {deleteStep < 3 ? (
                <button
                  onClick={() => setDeleteStep((prev) => (prev + 1) as 1 | 2 | 3)}
                  disabled={isLoading || (deleteStep === 1 && !deletePreview.canDelete) || (deleteStep === 2 && deleteConfirmText !== "ELIMINAR EMPRESA")}
                  className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  Continuar
                </button>
              ) : (
                <button
                  onClick={handleDeleteEmpresaDefinitiva}
                  disabled={isLoading || !canConfirmDelete}
                  className="inline-flex items-center gap-2 rounded-md bg-rose-700 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-50"
                >
                  {loadingAction === `delete-confirm-${deleteTargetEmpresaId}` && <Loader2 className="h-4 w-4 animate-spin" />}
                  Eliminar definitivamente
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page Content */}
      <div className="space-y-6" style={{ pointerEvents: confirm ? "none" : "auto" }}>
        {/* Backfill */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Backfill y consistencia</h2>
            <button
              onClick={() => handleBackfill()}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {loadingAction === "backfill" && <Loader2 className="h-4 w-4 animate-spin" />}
              Ejecutar backfill idempotente
            </button>
          </div>
        </section>

        {/* Empresas */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Empresas</h2>
          <form onSubmit={(e) => { e.preventDefault(); handleCreateEmpresa(new FormData(e.currentTarget)); }} ref={createEmpresaFormRef} className="mt-4 grid gap-3 md:grid-cols-4">
            <input name="nombre" placeholder="Nombre empresa" disabled={isLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" />
            <input name="rut" placeholder="RUT (opcional)" disabled={isLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" />
            <button disabled={isLoading || isCreatingEmpresa} className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {(isPending || isCreatingEmpresa) && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear empresa
            </button>
          </form>

          <div className="mt-4 space-y-3">
            {data.empresas.map((empresa) => (
              <div key={empresa.id} className="rounded-lg border border-slate-200 p-3">
                <form onSubmit={(e) => { e.preventDefault(); handleUpdateEmpresa(new FormData(e.currentTarget)); }} className="grid gap-2 md:grid-cols-4">
                  <input type="hidden" name="empresaId" value={empresa.id} />
                  <input name="nombre" defaultValue={empresa.nombre} disabled={isLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" />
                  <input name="rut" defaultValue={empresa.rut ?? ""} disabled={isLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" />
                  <button disabled={isLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                    Guardar
                  </button>
                </form>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>ID: {empresa.id}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePrepararEmpresa(empresa.id, empresa.nombre)}
                      disabled={isLoading}
                      className="inline-flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                    >
                      {loadingAction === `prepare-${empresa.id}` && <Loader2 className="h-4 w-4 animate-spin" />}
                      Preparar empresa
                    </button>
                    <button
                      onClick={() => handleToggleEmpresaActiva(empresa)}
                      disabled={isLoading}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {empresa.activa ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      onClick={() => openDeleteEmpresaModal(empresa.id)}
                      disabled={isLoading}
                      className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                    >
                      {loadingAction === `delete-preview-${empresa.id}` && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
                      Eliminar definitivamente
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Usuarios */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Usuarios</h2>
          <form onSubmit={(e) => { e.preventDefault(); handleCreateUsuario(new FormData(e.currentTarget)); }} ref={createUsuarioFormRef} className="mt-4 grid gap-3 md:grid-cols-6">
            <input name="nombre" placeholder="Nombre" disabled={isLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" />
            <input name="email" placeholder="email@dominio.cl" type="email" disabled={isLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" />
            <select name="empresaId" disabled={isLoading} defaultValue="" className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">
              <option value="">Empresa</option>
              {data.empresas.filter((empresa) => empresa.activa).map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nombre}
                </option>
              ))}
            </select>
            <select name="rol" disabled={isLoading} defaultValue="ADMIN_EMPRESA" className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">
              {SUPERADMIN_ROLES.map((rol) => (
                <option key={rol} value={rol}>
                  {rol}
                </option>
              ))}
            </select>
            <input
              name="passwordTemporal"
              placeholder="Contraseña temporal"
              type="password"
              minLength={8}
              autoComplete="new-password"
              disabled={isLoading}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
            />
            <input
              name="confirmarPasswordTemporal"
              placeholder="Confirmar contraseña"
              type="password"
              minLength={8}
              autoComplete="new-password"
              disabled={isLoading}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50"
            />
            <button disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 md:col-span-1 disabled:opacity-50">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Crear usuario
            </button>
          </form>

          <div className="mt-4 space-y-3">
            {data.usuarios.map((usuario) => {
              const inviteLink = `${appUrl}/login?mode=invite&email=${encodeURIComponent(usuario.email)}`;
              const resetLink = `${appUrl}/login?mode=reset&email=${encodeURIComponent(usuario.email)}`;
              return (
                <div key={usuario.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{usuario.nombre}</p>
                      <p className="text-xs text-slate-500">{usuario.email}</p>
                      <p className="text-xs text-slate-500">Rol global: {usuario.rol}</p>
                    </div>
                    <button
                      onClick={() => handleToggleUsuarioActivo(usuario)}
                      disabled={isLoading}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {usuario.activo ? "Desactivar" : "Activar"}
                    </button>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-slate-500">
                    <p>Invitación: {inviteLink}</p>
                    <p>Reset: {resetLink}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Usuario-Empresa */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Asignación usuario-empresa y rol por empresa</h2>

          <form onSubmit={(e) => { e.preventDefault(); handleUpsertUsuarioEmpresa(new FormData(e.currentTarget)); }} ref={upsertUserEmpresaFormRef} className="mt-4 grid gap-3 md:grid-cols-5">
            <select name="usuarioId" disabled={isLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">
              <option value="">Usuario</option>
              {data.usuarios.map((usuario) => (
                <option key={usuario.id} value={usuario.id}>
                  {usuario.email}
                </option>
              ))}
            </select>
            <select name="empresaId" disabled={isLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">
              <option value="">Empresa</option>
              {data.empresas.map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nombre}
                </option>
              ))}
            </select>
            <select name="rol" disabled={isLoading} defaultValue="ADMIN_EMPRESA" className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">
              {SUPERADMIN_ROLES.map((rol) => (
                <option key={rol} value={rol}>
                  {rol}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" name="activo" defaultChecked disabled={isLoading} />
              Activo
            </label>
            <button disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Asignar / actualizar
            </button>
          </form>

          <div className="mt-4 space-y-2">
            {data.asignaciones.map((asignacion) => (
              <div key={asignacion.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 p-3">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">{asignacion.usuarioEmail}</span> → {asignacion.empresaNombre} ({asignacion.rol})
                </p>
                <button
                  onClick={() => handleToggleUsuarioEmpresaActivo(asignacion)}
                  disabled={isLoading}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {asignacion.activo ? "Desactivar" : "Activar"}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Módulos */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Módulos por empresa</h2>
          <div className="mt-4 space-y-4">
            {data.empresas.map((empresa) => {
              const modulosEmpresa = data.modulos.filter((modulo) => modulo.empresaId === empresa.id);
              return (
                <div key={empresa.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-semibold text-slate-900">{empresa.nombre}</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {COMPANY_MODULES.map((modulo) => {
                      const current = modulosEmpresa.find((row) => row.modulo === modulo);
                      const activo = current?.activo ?? true;
                      return (
                        <button
                          key={modulo}
                          onClick={() => handleToggleModulo(empresa.id, modulo, activo, COMPANY_MODULE_LABELS[modulo])}
                          disabled={isLoading}
                          className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50 disabled:opacity-50"
                        >
                          <span className="text-xs text-slate-700">{COMPANY_MODULE_LABELS[modulo]}</span>
                          <span className={`text-xs font-semibold ${activo ? "text-emerald-600" : "text-slate-400"}`}>
                            {activo ? "ON" : "OFF"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
