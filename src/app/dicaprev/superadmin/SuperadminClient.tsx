"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import {
  createEmpresaAction,
  createUsuarioAction,
  ensureBackfillAction,
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

export default function SuperadminClient({ data, appUrl }: { data: SuperadminData; appUrl: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState<Message[]>([]);
  const [confirm, setConfirm] = useState<ConfirmData>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

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
    const nombre = formData.get("nombre") as string;
    const rut = formData.get("rut") as string;

    if (!nombre?.trim()) {
      addMessage("error", "Nombre de empresa es requerido");
      return;
    }

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
          const result = await prepararEmpresaAction(formData);
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

  // ==================== USUARIO ====================

  const handleCreateUsuario = async (formData: FormData) => {
    const nombre = formData.get("nombre") as string;
    const email = formData.get("email") as string;
    const rol = formData.get("rol") as string;

    if (!nombre?.trim()) {
      addMessage("error", "Nombre de usuario es requerido");
      return;
    }

    if (!email?.trim() || !email.includes("@")) {
      addMessage("error", "Email válido es requerido");
      return;
    }

    if (!rol || !SUPERADMIN_ROLES.includes(rol as Rol)) {
      addMessage("error", "Rol válido es requerido");
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
        await createUsuarioAction(formData);
        addMessage("success", `Usuario "${email}" creado exitosamente`);
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
        await toggleUsuarioActivoAction(formData);
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

      {/* Page Content */}
      <div className="space-y-6 opacity-50" style={{ pointerEvents: confirm ? "none" : "auto" }}>
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
            <button disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Usuarios */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Usuarios</h2>
          <form onSubmit={(e) => { e.preventDefault(); handleCreateUsuario(new FormData(e.currentTarget)); }} ref={createUsuarioFormRef} className="mt-4 grid gap-3 md:grid-cols-5">
            <input name="nombre" placeholder="Nombre" disabled={isLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" />
            <input name="email" placeholder="email@dominio.cl" type="email" disabled={isLoading} className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50" />
            <select name="rol" disabled={isLoading} defaultValue="ADMIN_EMPRESA" className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50">
              {SUPERADMIN_ROLES.map((rol) => (
                <option key={rol} value={rol}>
                  {rol}
                </option>
              ))}
            </select>
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
