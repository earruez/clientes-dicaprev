import {
  ACTIVIDADES_PLAN,
  EVIDENCIAS_MOCK,
  MESES_SHORT,
  type ActividadPlan,
  type EstadoActividad,
  type MesShort,
} from "./mock-data";

export type CrearActividadInput = {
  actividad: string;
  normativa: string;
  categoria: string;
  periodicidad: ActividadPlan["periodicidad"];
  mes: MesShort;
  responsable: string;
  centroContratista: string;
  estadoInicial: EstadoActividad;
  requiereEvidencia: boolean;
};

export type PlanActivityPayload = {
  actividad: string;
  normativa: string;
  categoria: string;
  periodicidad: ActividadPlan["periodicidad"];
  mes: MesShort;
  responsable: string;
  centroContratista: string;
  estado: EstadoActividad;
  requiereEvidencia: boolean;
};

export type UpdateActividadInput = {
  id: number;
} & PlanActivityPayload;

export type EvidenciaItem = {
  id: string;
  actividadId: number;
  archivo: string;
  fecha: string;
  estado: "cargada" | "rechazada";
  observacion: string;
};

export type HistorialEvidencia = {
  id: string;
  fecha: string;
  usuario: string;
  accion: string;
  archivo: string;
  actividadId: number;
};

export type EstadoPlan = "borrador" | "en_revision" | "aprobado" | "rechazado";

export type AprobacionPlanInput = {
  usuario: string;
  cargo: string;
};

export type RechazoPlanInput = {
  usuario: string;
  cargo: string;
  motivo: string;
};

export type PlanSnapshot = {
  actividades: ActividadPlan[];
  evidencias: EvidenciaItem[];
  historial: HistorialEvidencia[];
  estadoPlan: EstadoPlan;
  aprobadoPor: string | null;
  aprobadoCargo: string | null;
  aprobadoEn: string | null;
  rechazadoPor: string | null;
  rechazadoCargo: string | null;
  rechazadoEn: string | null;
  motivoRechazo: string;
  enviadoRevisionEn: string | null;
  versionPlan: number;
};

const PLAN_STORAGE_KEY = "dicaprev:plan-trabajo-store:v1";

let actividadesState: ActividadPlan[] = ACTIVIDADES_PLAN.map((a) => ({ ...a, meses: { ...a.meses } }));
let evidenciasState: EvidenciaItem[] = EVIDENCIAS_MOCK.map((e) => ({ ...e }));
let historialState: HistorialEvidencia[] = EVIDENCIAS_MOCK.map((e, idx) => ({
  id: `hist-initial-${idx + 1}`,
  fecha: e.fecha,
  usuario: "Sistema",
  accion: "Carga inicial",
  archivo: e.archivo,
  actividadId: e.actividadId,
}));
let estadoPlanState: EstadoPlan = "borrador";
let aprobadoPorState: string | null = null;
let aprobadoCargoState: string | null = null;
let aprobadoEnState: string | null = null;
let rechazadoPorState: string | null = null;
let rechazadoCargoState: string | null = null;
let rechazadoEnState: string | null = null;
let motivoRechazoState = "";
let enviadoRevisionEnState: string | null = null;
let versionPlanState = 1;

const listeners = new Set<() => void>();
let hydratedFromStorage = false;

function isBrowser() {
  return typeof window !== "undefined";
}

function readFromStorage(): PlanSnapshot | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(PLAN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlanSnapshot>;

    if (!Array.isArray(parsed.actividades) || !Array.isArray(parsed.evidencias) || !Array.isArray(parsed.historial)) {
      return null;
    }

    const planStates: EstadoPlan[] = ["borrador", "en_revision", "aprobado", "rechazado"];
    const estadoPlan = planStates.includes(parsed.estadoPlan as EstadoPlan)
      ? (parsed.estadoPlan as EstadoPlan)
      : "borrador";

    const versionPlan =
      typeof parsed.versionPlan === "number" && Number.isFinite(parsed.versionPlan)
        ? Math.max(1, Math.floor(parsed.versionPlan))
        : 1;

    return {
      actividades: parsed.actividades as ActividadPlan[],
      evidencias: parsed.evidencias as EvidenciaItem[],
      historial: parsed.historial as HistorialEvidencia[],
      estadoPlan,
      aprobadoPor: typeof parsed.aprobadoPor === "string" ? parsed.aprobadoPor : null,
      aprobadoCargo: typeof parsed.aprobadoCargo === "string" ? parsed.aprobadoCargo : null,
      aprobadoEn: typeof parsed.aprobadoEn === "string" ? parsed.aprobadoEn : null,
      rechazadoPor: typeof parsed.rechazadoPor === "string" ? parsed.rechazadoPor : null,
      rechazadoCargo: typeof parsed.rechazadoCargo === "string" ? parsed.rechazadoCargo : null,
      rechazadoEn: typeof parsed.rechazadoEn === "string" ? parsed.rechazadoEn : null,
      motivoRechazo: typeof parsed.motivoRechazo === "string" ? parsed.motivoRechazo : "",
      enviadoRevisionEn: typeof parsed.enviadoRevisionEn === "string" ? parsed.enviadoRevisionEn : null,
      versionPlan,
    };
  } catch {
    return null;
  }
}

function writeToStorage(data: PlanSnapshot) {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Intentionally noop in development if storage quota/privacy blocks write.
  }
}

function emit() {
  writeToStorage(snapshot());
  listeners.forEach((listener) => listener());
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function nextActividadId() {
  return (Math.max(0, ...actividadesState.map((a) => a.id)) || 0) + 1;
}

function monthState(base: EstadoActividad = "no_aplica") {
  const map = {} as Record<MesShort, EstadoActividad>;
  MESES_SHORT.forEach((m) => {
    map[m] = base;
  });
  return map;
}

function snapshot(): PlanSnapshot {
  return {
    actividades: actividadesState.map((a) => ({ ...a, meses: { ...a.meses } })),
    evidencias: evidenciasState.map((e) => ({ ...e })),
    historial: historialState.map((h) => ({ ...h })),
    estadoPlan: estadoPlanState,
    aprobadoPor: aprobadoPorState,
    aprobadoCargo: aprobadoCargoState,
    aprobadoEn: aprobadoEnState,
    rechazadoPor: rechazadoPorState,
    rechazadoCargo: rechazadoCargoState,
    rechazadoEn: rechazadoEnState,
    motivoRechazo: motivoRechazoState,
    enviadoRevisionEn: enviadoRevisionEnState,
    versionPlan: versionPlanState,
  };
}

export function getPlanSnapshot() {
  return snapshot();
}

export function hydratePlanStore() {
  if (!isBrowser() || hydratedFromStorage) return;

  hydratedFromStorage = true;
  const stored = readFromStorage();
  if (!stored) return;

  actividadesState = stored.actividades.map((a) => ({ ...a, meses: { ...a.meses } }));
  evidenciasState = stored.evidencias.map((e) => ({ ...e }));
  historialState = stored.historial.map((h) => ({ ...h }));
  estadoPlanState = stored.estadoPlan;
  aprobadoPorState = stored.aprobadoPor;
  aprobadoCargoState = stored.aprobadoCargo;
  aprobadoEnState = stored.aprobadoEn;
  rechazadoPorState = stored.rechazadoPor;
  rechazadoCargoState = stored.rechazadoCargo;
  rechazadoEnState = stored.rechazadoEn;
  motivoRechazoState = stored.motivoRechazo;
  enviadoRevisionEnState = stored.enviadoRevisionEn;
  versionPlanState = stored.versionPlan;
}

export function subscribePlan(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function canMutatePlanActivities() {
  return estadoPlanState === "borrador";
}

export function canUploadPlanEvidence() {
  return estadoPlanState !== "aprobado";
}

function pushHistory(action: string, usuario: string, actividadId = 0, archivo = "-") {
  historialState = [
    {
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      fecha: today(),
      usuario,
      accion: action,
      archivo,
      actividadId,
    },
    ...historialState,
  ];
}

export function createActividad(input: CrearActividadInput) {
  if (!canMutatePlanActivities()) return null;

  const actividadId = nextActividadId();
  const meses = monthState();
  meses[input.mes] = input.estadoInicial;

  const nuevaActividad: ActividadPlan = {
    id: actividadId,
    actividad: input.actividad,
    normativa: input.normativa,
    categoria: input.categoria,
    periodicidad: input.periodicidad,
    responsable: input.responsable,
    centroContratista: input.centroContratista,
    requiereEvidencia: input.requiereEvidencia,
    estado: input.estadoInicial,
    evidencia: input.requiereEvidencia ? "pendiente" : "cargada",
    meses,
  };

  actividadesState = [nuevaActividad, ...actividadesState];

  pushHistory("Creación de actividad", "admin@nextprev.cl", actividadId);

  emit();
  return nuevaActividad;
}

export function updateActividad(input: UpdateActividadInput) {
  return updatePlanActivity(input.id, {
    actividad: input.actividad,
    normativa: input.normativa,
    categoria: input.categoria,
    periodicidad: input.periodicidad,
    mes: input.mes,
    responsable: input.responsable,
    centroContratista: input.centroContratista,
    estado: input.estado,
    requiereEvidencia: input.requiereEvidencia,
  });
}

export function updatePlanActivity(id: number, payload: PlanActivityPayload) {
  if (!canMutatePlanActivities()) return null;

  const current = actividadesState.find((a) => a.id === id);
  if (!current) return null;

  const meses = monthState();
  meses[payload.mes] = payload.estado;

  const hasUploadedEvidence = evidenciasState.some(
    (e) => e.actividadId === id && e.estado === "cargada"
  );

  const evidencia = payload.requiereEvidencia
    ? hasUploadedEvidence
      ? "cargada"
      : "pendiente"
    : "cargada";

  const updated: ActividadPlan = {
    ...current,
    actividad: payload.actividad,
    normativa: payload.normativa,
    categoria: payload.categoria,
    periodicidad: payload.periodicidad,
    responsable: payload.responsable,
    centroContratista: payload.centroContratista,
    requiereEvidencia: payload.requiereEvidencia,
    estado: payload.estado,
    evidencia,
    meses,
  };

  actividadesState = actividadesState.map((a) => (a.id === id ? updated : a));

  if (current.requiereEvidencia && !payload.requiereEvidencia) {
    pushHistory("Actividad marcada como no requiere evidencia", "admin@nextprev.cl", id);
  }

  pushHistory("Edición de actividad", "admin@nextprev.cl", id);

  emit();
  return updated;
}

export function uploadEvidencia(actividadId: number, archivo: string, usuario = "admin@nextprev.cl") {
  if (!canUploadPlanEvidence()) return false;

  const actividad = actividadesState.find((a) => a.id === actividadId);
  if (!actividad) return false;

  const item: EvidenciaItem = {
    id: `ev-${Date.now()}`,
    actividadId,
    archivo,
    fecha: today(),
    estado: "cargada",
    observacion: "Archivo cargado correctamente",
  };

  evidenciasState = [item, ...evidenciasState];
  actividadesState = actividadesState.map((a) =>
    a.id === actividadId ? { ...a, evidencia: "cargada" } : a
  );

  pushHistory("Carga de evidencia", usuario, actividadId, archivo);

  emit();
  return true;
}

export function enviarPlanARevision(usuario = "admin@nextprev.cl", cargo = "Administrador") {
  if (estadoPlanState !== "borrador") return false;

  estadoPlanState = "en_revision";
  enviadoRevisionEnState = today();
  motivoRechazoState = "";
  rechazadoPorState = null;
  rechazadoCargoState = null;
  rechazadoEnState = null;
  versionPlanState += 1;
  pushHistory(`Plan enviado a revisión (v${versionPlanState})`, `${usuario} · ${cargo}`);
  emit();
  return true;
}

export function aprobarPlan(input: AprobacionPlanInput) {
  if (estadoPlanState !== "en_revision") return false;

  estadoPlanState = "aprobado";
  aprobadoPorState = input.usuario;
  aprobadoCargoState = input.cargo;
  aprobadoEnState = today();
  motivoRechazoState = "";
  rechazadoPorState = null;
  rechazadoCargoState = null;
  rechazadoEnState = null;
  pushHistory("Plan aprobado", `${input.usuario} · ${input.cargo}`);
  emit();
  return true;
}

export function rechazarPlan(input: RechazoPlanInput) {
  if (estadoPlanState !== "en_revision") return false;
  if (!input.motivo.trim()) return false;

  estadoPlanState = "rechazado";
  rechazadoPorState = input.usuario;
  rechazadoCargoState = input.cargo;
  rechazadoEnState = today();
  motivoRechazoState = input.motivo.trim();
  aprobadoPorState = null;
  aprobadoCargoState = null;
  aprobadoEnState = null;
  pushHistory(`Plan rechazado: ${motivoRechazoState}`, `${input.usuario} · ${input.cargo}`);
  emit();
  return true;
}

export function volverABorrador(usuario = "admin@nextprev.cl") {
  if (estadoPlanState !== "rechazado") return false;

  estadoPlanState = "borrador";
  motivoRechazoState = "";
  rechazadoPorState = null;
  rechazadoCargoState = null;
  rechazadoEnState = null;
  pushHistory("Plan devuelto a borrador", usuario);
  emit();
  return true;
}
