// =====================================================================
//  Módulo Acreditaciones — Modelo de dominio
//  Regla: los requisitos SIEMPRE provienen de una PlantillaAcreditacion.
// =====================================================================

// ---- Enumeraciones ---------------------------------------------------------

export type EstadoAcreditacion =
  | "en_preparacion"
  | "listo_para_enviar"
  | "enviado"
  | "observada"
  | "aprobado"
  | "rechazado"
  | "cerrada"
  | "vencido";

export type CategoriaRequisito =
  | "empresa"
  | "trabajador"
  | "sst"
  | "vehiculo"
  | "anexo";

export type AplicaA = "empresa" | "trabajador" | "vehiculo";

export type EstadoDocumento = "completo" | "vencido" | "faltante";

export type TipoAcreditacion =
  | "municipal"
  | "enel"
  | "cge"
  | "mandante_general"
  | "via_publica"
  | "contratista"
  | "mineria"
  | "sanitaria";

// ---- Plantilla de acreditación (base de todo) ------------------------------

export interface RequisitoPlantilla {
  id: string;
  plantillaId: string;
  nombreDocumento: string;
  codigoDocumento?: string;
  categoria: CategoriaRequisito;
  aplicaA: AplicaA;
  obligatorio: boolean;
  permiteMultiples: boolean;
  requiereVencimiento: boolean;
  requiereRevisionManual: boolean;
  orden: number;
  observacionAyuda?: string;
}

export interface PlantillaAcreditacion {
  id: string;
  nombre: string;
  mandante: string;
  mandanteId: string;
  tipo: TipoAcreditacion;
  descripcion: string;
  activa: boolean;
  requisitos: RequisitoPlantilla[];
  creadoEl: string;
  actualizadoEl: string;
}

// ---- Entidades del sistema --------------------------------------------------

export interface EmpresaCliente {
  id: string;
  razonSocial: string;
  rut: string;
  rubro: string;
}

export interface Mandante {
  id: string;
  nombre: string;
  rut?: string;
  tipo: "municipalidad" | "empresa_electrica" | "constructora" | "minera" | "privado" | "otro";
}

export interface Trabajador {
  id: string;
  nombre: string;
  rut: string;
  cargo: string;
}

export interface Vehiculo {
  id: string;
  patente: string;
  modelo: string;
  año?: number;
}

// ---- Documento instancia (un requisito resuelto para una acreditación) ------

export interface DocumentoInstancia {
  id: string;
  requisitoId: string;
  acreditacionId: string;
  nombreDocumento: string;
  categoria: CategoriaRequisito;
  aplicaA: AplicaA;
  /** null si aplica a empresa o expediente */
  titularId: string;
  titularNombre: string;
  obligatorio: boolean;
  estado: EstadoDocumento;
  archivoUrl?: string;
  nombreArchivo?: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  observaciones?: string;
  seleccionado: boolean;
  /** Si se vinculó desde la Biblioteca Documental */
  fuenteBiblioteca?: boolean;
  /** Id del DocumentoBase de origen, si aplica */
  documentoBaseId?: string;
}

// ---- Historial de cambios de estado ----------------------------------------

export interface HistorialEstadoAcreditacion {
  estado: EstadoAcreditacion;
  fecha: string;
  usuario: string;
  comentario?: string;
}

// ---- Acreditación -----------------------------------------------------------

export interface Acreditacion {
  id: string;
  empresaId: string;
  empresaNombre: string;
  mandanteId: string;
  mandante: string;
  tipo: TipoAcreditacion;
  estado: EstadoAcreditacion;
  plantillaId: string;
  plantillaNombre: string;
  trabajadores: Trabajador[];
  vehiculos: Vehiculo[];
  creadoEl: string;
  actualizadoEl: string;
  ultimoExpediente?: string;
  observaciones?: string;
  historialEstados?: HistorialEstadoAcreditacion[];
}

// ---- Historial de expedientes generados ------------------------------------

export interface HistorialExpediente {
  id: string;
  acreditacionId: string;
  fecha: string;
  generadoPor: string;
  documentosIncluidos: number;
  estado: "generado" | "enviado";
}

// ---- Wizard de creación ----------------------------------------------------

export interface WizardAcreditacionData {
  mandante: Mandante | null;
  tipo: TipoAcreditacion | null;
  plantilla: PlantillaAcreditacion | null;
  trabajadores: Trabajador[];
  vehiculos: Vehiculo[];
}

// ---- Biblioteca Documental (documentos reales de la empresa) ---------------

/**
 * Un DocumentoBase vive en la Biblioteca Documental.
 * Es independiente de cualquier acreditación.
 * Las acreditaciones los "toman prestados" al construir el expediente.
 */
export interface DocumentoBase {
  id: string;
  /** Nombre normalizado que debe coincidir con RequisitoPlantilla.nombreDocumento */
  nombre: string;
  categoria: CategoriaRequisito;
  /** A qué tipo de titular aplica */
  aplicaA: AplicaA;
  /** Si aplica a un trabajador o vehículo específico, su id */
  titularId?: string;
  titularNombre?: string;
  fechaEmision?: string;
  fechaVencimiento?: string;
  estado: EstadoDocumento;
  archivoUrl?: string;
  nombreArchivo?: string;
  /** Puede ser vinculado automáticamente a acreditaciones */
  reusableEnAcreditaciones: boolean;
  observaciones?: string;
  creadoEl: string;
}

// ---- Historial de gestión analítico ----------------------------------------

export type ResultadoHistorial = "aprobado" | "rechazado" | "con_observaciones";

export type CausaRechazo =
  | "documentos_vehiculo"
  | "licencias_vencidas"
  | "expediente_incompleto"
  | "examenes_salud_altura"
  | "formato_mandante"
  | "documentos_empresa"
  | "otro";

export interface RegistroHistorial {
  id: string;
  mandanteId: string;
  mandante: string;
  tipo: TipoAcreditacion;
  estado: EstadoAcreditacion;
  cantidadTrabajadores: number;
  cantidadVehiculos: number;
  fechaCreacion: string;
  fechaEnvio?: string;
  fechaRespuesta?: string;
  resultado?: ResultadoHistorial;
  /** Causa normalizada del rechazo u observación */
  motivoRechazo?: CausaRechazo;
  responsable: string;
  diasGestion: number;
  observaciones?: string;
}

// ---- Agrupación para la pantalla del expediente ----------------------------

export interface BloqueCategoria {
  categoria: CategoriaRequisito;
  label: string;
  documentos: DocumentoInstancia[];
}

export interface BloqueTrabajador {
  trabajador: Trabajador;
  documentos: DocumentoInstancia[];
}

export interface ExpedienteAgrupado {
  empresa: DocumentoInstancia[];
  sst: DocumentoInstancia[];
  trabajadores: BloqueTrabajador[];
  vehiculos: BloqueTrabajador[];
  anexos: DocumentoInstancia[];
}
