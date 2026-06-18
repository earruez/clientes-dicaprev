"use server";

import { findDocumentoEmpresaCanonicoPorRequerido } from "@/lib/documentacion/documento-empresa-duplicados";
import { cumpleCondicionesDocumento } from "@/lib/documentacion/cumplimiento-documento";
import {
  crearDocumentoEppEstructurado,
  crearDocumentoIrlEstructurado,
  parseDocumentoEstructurado,
  serializarDocumentoEstructurado,
  type DocumentoEppCampos,
  type DocumentoEstructurado,
  type DocumentoIrlCampos,
  type EppItem,
  type IrlRiesgoFila,
} from "@/lib/documentacion/documento-estructurado";
import { REGLAS_DOCUMENTALES, type ReglaDocumentalNextPrev } from "@/lib/documentacion/reglas-documentales";
import { prisma } from "@/lib/prisma";
import { crearFirmaDocumento } from "@/actions/firmas";
import { requirePermission } from "@/server/auth/permissions";
import { generarTokenFirma } from "@/lib/firmas/tokens";
import { generarHashFirma } from "@/lib/firmas/hash";
import type { Worker } from "@/components/trabajadores-v2/types";
import type {
  DocumentoTrabajador,
  DocEstado,
  ReglaDocumental,
  TipoDocumento,
} from "@/components/trabajadores-v2/documental/types";

export type TipoDocumentoTrabajadorInput = {
  nombre: string;
  codigo: string;
  descripcion?: string | null;
  vigenciaDias?: number | null;
  requiereVencimiento: boolean;
  requiereArchivo: boolean;
  activo?: boolean;
};

export type ReglaDocumentoTrabajadorInput = {
  tipoDocumentoId: string;
  cargoId?: string | null;
  areaId?: string | null;
  centroTrabajoId?: string | null;
  tipoContrato?: string | null;
  obligatorio: boolean;
  activo?: boolean;
};

export type ControlDocumentalTrabajadoresPayload = {
  workers: Worker[];
  tipos: TipoDocumento[];
  reglas: ReglaDocumental[];
  documentos: DocumentoTrabajador[];
};

const CODIGOS_INDUCCION_A_TIPO_CONTROL: Record<string, string> = {
  IRL: "IRL_RIESGOS",
  ENTREGA_EPP: "ENTREGA_EPP",
  RECEPCION_RI: "REGLAMENTO_INTERNO_RECIBIDO",
  REGISTRO_INDUCCION: "CAPACITACION_INICIAL",
};

function mapCodigoDocumentoInduccionACodigoControl(codigo: string): string | null {
  return CODIGOS_INDUCCION_A_TIPO_CONTROL[codigo.trim().toUpperCase()] ?? null;
}

export type EmpresaDocumentoMeta = {
  id: string;
  nombre: string;
  razonSocial: string | null;
  rut: string | null;
  direccion: string | null;
  logoUrl: string | null;
};

export type EstadoDocumentoTrabajadorInput =
  | "pendiente"
  | "en_revision"
  | "validado"
  | "enviado_firma"
  | "aprobado"
  | "firmado"
  | "rechazado"
  | "vencido"
  | "no_aplica"
  | "completo";

export type CreateTrabajadorDocumentoInput = {
  trabajadorId: string;
  tipoDocumentoId: string;
  estado: EstadoDocumentoTrabajadorInput;
  fechaEmision?: string;
  fechaVencimiento?: string;
  observaciones?: string;
  cargadoPor?: string;
  archivoNombre?: string;
  archivoNombreOriginal?: string;
  archivoTipo?: string;
  archivoPeso?: number;
  motivoReemplazo?: string;
};

export type UpdateTrabajadorDocumentoInput = {
  documentoId: string;
  estado?: EstadoDocumentoTrabajadorInput;
  fechaEmision?: string | null;
  fechaVencimiento?: string | null;
  observaciones?: string | null;
  cargadoPor?: string | null;
  archivoNombre?: string | null;
  archivoNombreOriginal?: string | null;
  archivoTipo?: string | null;
  archivoPeso?: number | null;
};

export type HistorialDocumentoTrabajadorInput = {
  accion: string;
  detalle?: string;
  version?: string;
  archivoNombre?: string;
  archivoNombreOriginal?: string;
  archivoUrl?: string;
  archivoTipo?: string;
  archivoPeso?: number;
};

export type EvaluacionReglasTrabajadorResult = {
  trabajadorId: string;
  reglasEvaluadas: number;
  reglasAplicables: number;
  pendientesGenerados: number;
  documentosGeneradosIds: string[];
  fuenteReglas?: "bd" | "fallback";
  reglasDesdeBD?: number;
  reglasDesdeFallback?: number;
};

export type EvaluacionReglasEmpresaResult = {
  trabajadoresEvaluados: number;
  trabajadoresConPendientesNuevos: number;
  pendientesGenerados: number;
  detalles: EvaluacionReglasTrabajadorResult[];
};

export type EventoDocumental =
  | "trabajador_creado"
  | "trabajador_actualizado"
  | "empresa_actualizada"
  | "estructura_empresa_actualizada"
  | "reglas_documentales_actualizadas";

export type EvaluacionDocumentosPorEventoInput = {
  empresaId: string;
  evento: EventoDocumental;
  trabajadorId?: string;
  usuarioId?: string;
  email?: string;
};

export type EvaluacionDocumentosPorEventoResult = {
  evento: EventoDocumental;
  trabajadorId?: string;
  trabajadoresEvaluados: number;
  documentosTrabajadorGenerados: number;
  documentosEmpresaGenerados: number;
  fuenteReglasTrabajador?: "bd" | "fallback";
  reglasTrabajadorDesdeBD?: number;
  reglasTrabajadorDesdeFallback?: number;
};

export type GeneracionContenidoOdiIAResult = {
  documentoId: string;
  contenido: string;
  fuente: "openai" | "fallback_local";
  advertencia: string;
};

type ContextoGeneracionCampoIA = {
  documentoId: string;
  empresaNombre: string;
  trabajadorNombre: string;
  trabajadorRut: string;
  cargo: string;
  area: string;
  centroTrabajo: string;
  jornada: string;
  riesgos: string[];
  estructura: DocumentoEstructurado;
};

function plantillaDesdeTipoDocumento(tipo: string, nombre: string): "IRL" | "EPP" {
  const source = `${tipo} ${nombre}`.toLowerCase();
  if (source.includes("epp") || source.includes("entrega")) return "EPP";
  return "IRL";
}

function getCargoTipo(cargo: string): "instalacion" | "supervision" | "admin" | "tecnico" | "bodega" | "generic" {
  const c = cargo.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/maestro|instalad|electricist|gasfiter|pintor|carpinter|soldad|operario/.test(c)) return "instalacion";
  if (/supervisor|jefe de|jefe (?:de )?area|encargado|coordinador|gerente|director|inspector de/.test(c)) return "supervision";
  if (/admin|secretar|recepcion|contab|finanz|rrhh|recursos humanos|asistente admin/.test(c)) return "admin";
  if (/tecnico|mecanico|electronico|informatico|sistemas|soporte/.test(c)) return "tecnico";
  if (/bodega|logistic|despach|almacen/.test(c)) return "bodega";
  return "generic";
}

function detectarRiesgosContextuales(cargo: string, area: string): string[] {
  const tipo = getCargoTipo(cargo);
  switch (tipo) {
    case "instalacion":
      return ["Caídas a distinto nivel (trabajos en altura)", "Contacto eléctrico", "Golpes y cortes con herramientas", "Proyección de partículas", "Sobreesfuerzos y manipulación manual de cargas"];
    case "supervision":
      return ["Caídas al mismo nivel", "Accidentes de tránsito en desplazamientos", "Sobrecarga mental", "Riesgos psicosociales por demandas del cargo"];
    case "admin":
      return ["Estrés laboral y riesgos psicosociales", "Sobrecarga postural frente a pantalla", "Caídas al mismo nivel"];
    case "tecnico":
      return ["Contacto eléctrico", "Proyección de partículas", "Golpes y cortes con herramientas", "Sobreesfuerzos"];
    case "bodega":
      return ["Manipulación manual de cargas", "Golpes por objetos en movimiento", "Atropello por equipos de manejo", "Caídas al mismo nivel"];
    default: {
      const source = `${cargo} ${area}`.toLowerCase();
      const riesgos: string[] = [];
      if (/bodega|logist/.test(source)) riesgos.push("Manipulación manual de cargas");
      if (/obra|terreno|instal/.test(source)) riesgos.push("Caídas a distinto nivel");
      if (/sold|metal/.test(source)) riesgos.push("Proyección de partículas");
      if (/admin|oficina/.test(source)) riesgos.push("Sobrecarga postural");
      if (/elect/.test(source)) riesgos.push("Contacto eléctrico");
      if (!riesgos.length) riesgos.push("Golpes por objetos", "Sobreesfuerzo", "Caídas al mismo nivel");
      return Array.from(new Set(riesgos));
    }
  }
}

function construirFilaRiesgoDesdeNombre(nombre: string): IrlRiesgoFila {
  const riesgo = nombre.toLowerCase();
  if (riesgo.includes("caida")) {
    return {
      peligro: nombre,
      consecuencia: "Contusiones, esguinces o fracturas",
      medida: "Uso de calzado de seguridad y control de superficies de tránsito",
    };
  }
  if (riesgo.includes("elect")) {
    return {
      peligro: nombre,
      consecuencia: "Quemaduras y lesiones graves",
      medida: "Bloqueo y verificación de energías antes de intervenir equipos",
    };
  }
  if (riesgo.includes("sobrecarga") || riesgo.includes("esfuerzo")) {
    return {
      peligro: nombre,
      consecuencia: "Lesiones musculoesqueléticas",
      medida: "Pausas activas, técnica de levantamiento y rediseño de tarea",
    };
  }
  return {
    peligro: nombre,
    consecuencia: "Accidente laboral",
    medida: "Aplicar procedimiento seguro y supervisión permanente",
  };
}

function generarTablaRiesgosDesdeContexto(ctx: ContextoGeneracionCampoIA): IrlRiesgoFila[] {
  return ctx.riesgos.map(construirFilaRiesgoDesdeNombre);
}

function generarTablaEppDesdeContexto(ctx: ContextoGeneracionCampoIA): EppItem[] {
  const today = new Date().toISOString().slice(0, 10);
  const defaults = [
    "Casco de seguridad",
    "Lentes de seguridad",
    "Guantes de protección",
    "Zapatos de seguridad",
  ];

  const extra = ctx.riesgos.some((riesgo) => riesgo.toLowerCase().includes("elect"))
    ? ["Guantes dieléctricos"]
    : [];

  return [...defaults, ...extra].map((descripcion) => ({
    descripcion,
    marca: "",
    modelo: "",
    color: "",
    talla: "",
    cantidad: 1,
    norma_tecnica: "",
    fecha_entrega: today,
    fecha_vencimiento_epp: "",
    si: true,
    no: false,
    firma_recepcion: "",
    observaciones: "",
  }));
}

function generarValorCampoIrl(campoId: keyof DocumentoIrlCampos, ctx: ContextoGeneracionCampoIA): DocumentoIrlCampos[keyof DocumentoIrlCampos] {
  const workerFirstName = ctx.trabajadorNombre.split(" ")[0] ?? ctx.trabajadorNombre;
  const today = new Date().toISOString().slice(0, 10);

  switch (campoId) {
    case "empresa_nombre":
      return ctx.empresaNombre;
    case "codigo_documento":
      return "REG-IRL-03";
    case "version":
      return "1";
    case "cargo":
    case "trabajador_cargo":
      return ctx.cargo;
    case "anio":
      return String(new Date().getFullYear());
    case "tipo_induccion":
      return "Persona trabajadora nueva";
    case "modalidad":
      return "Presencial";
    case "tipo_actividad":
      return "Interna";
    case "trabajador_nombre":
      return ctx.trabajadorNombre;
    case "trabajador_rut":
      return ctx.trabajadorRut;
    case "trabajador_area":
      return ctx.area;
    case "fecha":
      return today;
    case "telefono_emergencia":
      return "";
    case "lugar_trabajo":
      return ctx.centroTrabajo || `Dependencias operativas de ${ctx.empresaNombre}`;
    case "espacio_trabajo": {
      const tipo = getCargoTipo(ctx.cargo);
      const centro = ctx.centroTrabajo || `Dependencias de ${ctx.empresaNombre}`;
      if (tipo === "instalacion") return `El ${ctx.cargo} desarrolla sus labores en terreno (obras, faenas, instalaciones en dependencias del cliente) y eventualmente en ${centro}. El espacio de trabajo es variable según el proyecto asignado, pudiendo incluir espacios confinados, trabajo en altura, zonas de obra activa e instalaciones industriales o comerciales. Se requiere evaluación previa de condiciones del entorno antes de iniciar cada tarea.`;
      if (tipo === "admin") return `El ${ctx.cargo} desarrolla sus labores principalmente en oficinas de ${ctx.empresaNombre} (${centro}), en un entorno de trabajo con iluminación artificial y natural, temperatura controlada, nivel de ruido bajo y acceso a equipos computacionales y comunicaciones. Se requieren condiciones adecuadas de ergonomía en el puesto de trabajo.`;
      return `El ${ctx.cargo} desarrolla sus funciones en ${centro}, en las áreas asignadas según el cargo. El espacio incluye los equipos, herramientas y mobiliario necesarios. Se requieren condiciones adecuadas de iluminación, ventilación y orden para la correcta ejecución de las tareas.`;
    }
    case "condiciones_ambientales":
      return "Condiciones variables de iluminación, ruido y temperatura según jornada y tarea.";
    case "orden_aseo":
      return "Mantener pasillos despejados, retiro de residuos y almacenamiento seguro de materiales.";
    case "riesgos_generales_tabla":
    case "riesgos_especificos_tabla":
      return generarTablaRiesgosDesdeContexto(ctx);
    case "normas_generales":
      return "Cumplir procedimientos, usar EPP obligatorio y reportar incidentes o condiciones inseguras.";
    case "protocolos_minsal":
      return "Aplicar protocolos MINSAL vigentes según exposición (TMERT, MMC, Psicosocial, PREXOR, entre otros).";
    case "documentos_asociados":
      return "AST diario, PTS del cargo, matriz de riesgos, reglamento interno y registros de capacitación.";
    case "declaracion":
      return `Yo, ${ctx.trabajadorNombre}, declaro haber recibido y comprendido la información de riesgos laborales del cargo ${ctx.cargo}.`;
    case "firma_trabajador":
      return ctx.trabajadorNombre;
    case "firma_relator":
      return `Relator SST ${workerFirstName}`;
    case "empresa_contratista":
      return "";
    case "empresa_mandante":
      return ctx.empresaNombre;
    case "jornada":
      return ctx.jornada || "Diurna";
    case "turno":
      return "Mañana";
    case "hora_inicio":
      return "08:00";
    case "hora_termino":
      return "17:00";
    case "direccion_lugar_trabajo":
      return ctx.centroTrabajo || `Dependencias de ${ctx.empresaNombre}`;
    case "prevencionista_nombre":
      return "";
    case "prevencionista_cargo":
      return "Prevencionista de Riesgos";
    case "accidentes_anteriores":
      return "Sin accidentes previos registrados.";
    case "capacitaciones_previas":
      return ["Inducción general de empresa"];
    case "emergencias_evacuacion":
      return "En caso de emergencia, evacuar según señalética de salida de emergencia. Punto de encuentro habilitado en zona exterior del recinto. No utilizar ascensores.";
    case "pts":
      return `Procedimiento de trabajo seguro para el cargo ${ctx.cargo}. Documentar pasos críticos, peligros identificados y controles aplicados antes del inicio de cada tarea.`;
    case "epp_induccion_tabla":
      return [];
    case "compromisos_trabajador":
      return [
        "Utilizar los Elementos de Protección Personal asignados en todo momento durante la exposición al riesgo.",
        "Reportar de inmediato incidentes, accidentes o condiciones inseguras a mi supervisor.",
        "Cumplir con los Procedimientos de Trabajo Seguro (PTS) del cargo.",
        "Participar activamente en las actividades de capacitación y prevención de riesgos.",
        "No operar equipos o maquinarias para los que no esté habilitado o capacitado.",
      ];
    case "duracion_capacitacion":
      return "";
    // ── Riesgos por máquinas/equipos ─────────────────────────────────────
    case "riesgos_maquinas_tabla": {
      const tipo = getCargoTipo(ctx.cargo);
      if (tipo === "instalacion" || tipo === "tecnico") {
        return [
          { peligro: "Contacto eléctrico al conectar, operar o intervenir equipos eléctricos, herramientas, enchufes o extensiones.", consecuencia: "Descarga eléctrica, fibrilación ventricular, quemaduras dérmicas o riesgo vital.", medida: "Utilizar herramientas y equipos eléctricos certificados y en buen estado. Verificar ausencia de tensión antes de intervenir. Aplicar LOTO. Reportar fallas eléctricas de inmediato." },
          { peligro: "Golpes, cortes y atrapamientos con partes móviles de herramientas eléctricas (esmeril, taladro, sierra) durante su operación.", consecuencia: "Laceraciones, amputaciones, fracturas traumáticas de extremidades.", medida: "Verificar guardas de seguridad instaladas y en buen estado. No removerlas. Usar guantes anticorte y lentes de seguridad. Seguir PTS de uso de herramientas eléctricas." },
          { peligro: "Caída de herramientas, materiales u objetos desde altura hacia zonas inferiores durante el trabajo.", consecuencia: "Traumatismos craneanos, contusiones y lesiones graves por impacto.", medida: "Usar casco de seguridad. Asegurar herramientas con cuerda de retención en trabajos en altura. Señalizar y delimitar la zona inferior al área de trabajo." },
        ];
      }
      if (tipo === "bodega") {
        return [
          { peligro: "Atropello o atrapamiento por uso de transpaleta u equipos de manejo de materiales en movimiento dentro de bodega.", consecuencia: "Fracturas, aplastamientos, amputaciones o lesiones graves.", medida: "Operar equipos con capacitación vigente. Respetar límites de velocidad y señalización. Verificar que no haya personas en la trayectoria antes de mover la carga." },
          { peligro: "Caída de materiales apilados por sobrecarga, distribución incorrecta del peso o inestabilidad del apilamiento.", consecuencia: "Traumatismos graves, aplastamientos y lesiones incapacitantes.", medida: "Respetar la altura máxima de apilamiento. Distribuir pesos uniformemente. Verificar estabilidad de la carga. Usar tarimas en buen estado." },
        ];
      }
      return [
        { peligro: "Contacto eléctrico al conectar o manipular equipos, herramientas eléctricas, enchufes o extensiones del área de trabajo.", consecuencia: "Descarga eléctrica, quemaduras o riesgo de electrocución.", medida: "Utilizar equipos en buen estado y certificados. Evitar sobrecargar circuitos. Reportar fallas eléctricas inmediatamente al supervisor." },
        { peligro: "Golpes o atrapamientos con partes móviles de equipos y maquinaria presentes en el área de trabajo.", consecuencia: "Laceraciones, fracturas, traumatismos graves.", medida: "Mantener guardas de seguridad instaladas. No intervenir equipos sin bloqueo y etiquetado previo. Usar EPP específico para la tarea." },
      ];
    }
    // ── Riesgos por agentes químicos ──────────────────────────────────────
    case "riesgos_quimicos_tabla":
      return [
        { peligro: "Contacto con productos de limpieza, lubricantes u otras sustancias del área de trabajo.", consecuencia: "Dermatitis, irritación ocular o respiratoria, alergias.", medida: "Revisar HDS de los productos. Ventilar el área. Usar guantes, gafas y mascarilla si corresponde." },
        { peligro: "Exposición a vapores, polvos o aerosoles generados por el proceso de trabajo del cargo.", consecuencia: "Irritación de vías respiratorias, cefaleas, efectos crónicos.", medida: "Usar EPP respiratorio adecuado. Mantener ventilación. Conocer procedimientos ante derrames." },
      ];
    // ── Riesgos psicosociales ─────────────────────────────────────────────
    case "riesgos_psicosociales_tabla":
      return [
        { peligro: "Estrés laboral por carga de trabajo, plazos exigentes y presión organizacional sobre los resultados esperados.", consecuencia: "Ansiedad, fatiga mental, trastornos del sueño, disminución de la concentración.", medida: "Planificar cargas de trabajo con jefatura. Aplicar CEAL-SM. Fomentar comunicación y pausas activas." },
        { peligro: "Demandas emocionales derivadas de la coordinación con distintas áreas o personas en el ejercicio del cargo.", consecuencia: "Desgaste emocional, desmotivación, alteraciones psicosomáticas.", medida: "Promover ambientes colaborativos y respetuosos. Favorecer la desconexión efectiva fuera de jornada." },
      ];
    // ── Sección 7.1: Riesgos específicos del cargo ─────────────────────
    case "descripcion_actividad": {
      const tipo = getCargoTipo(ctx.cargo);
      const centro = ctx.centroTrabajo || `las dependencias asignadas de ${ctx.empresaNombre}`;
      if (tipo === "instalacion") {
        return `El ${ctx.cargo} es responsable de la ejecución directa de trabajos de instalación, montaje, habilitación y mantención en ${centro} y faenas asignadas por la empresa. Trabaja con herramientas manuales y eléctricas, coordinando con supervisores y otras especialidades para el cumplimiento de los trabajos según especificaciones técnicas, normas de seguridad vigentes y plazos del proyecto. Sus labores implican desplazamiento frecuente entre distintas zonas de trabajo y exposición a los riesgos característicos de obras, faenas e instalaciones en curso.`;
      }
      if (tipo === "supervision") {
        return `El ${ctx.cargo} es responsable de la supervisión y coordinación de los trabajos realizados por el equipo a su cargo en ${ctx.area}, verificando el cumplimiento de los procedimientos operacionales, estándares de calidad y normas de seguridad vigentes. Mantiene comunicación permanente con clientes, jefatura y otras áreas de la organización, siendo responsable directo del control de avance y condiciones de seguridad en las áreas asignadas. Realiza inspecciones en terreno, gestión de registros y toma de decisiones operativas en tiempo real.`;
      }
      if (tipo === "admin") {
        return `El ${ctx.cargo} desarrolla funciones administrativas y de apoyo organizacional en las dependencias de ${ctx.empresaNombre}, utilizando principalmente equipos computacionales, herramientas digitales y canales de comunicación corporativos. Participa en la coordinación interna con distintas áreas y colaboradores, contribuyendo al funcionamiento administrativo, contable y documental de la organización. Sus labores requieren concentración sostenida, manejo de información y cumplimiento de plazos internos.`;
      }
      if (tipo === "tecnico") {
        return `El ${ctx.cargo} es responsable de la ejecución de labores técnicas especializadas en ${ctx.area}, incluyendo instalación, mantención, diagnóstico y reparación de equipos, sistemas o instalaciones según el ámbito de especialización del cargo. Trabaja con herramientas, instrumentos de medición y equipos técnicos específicos, siguiendo procedimientos de trabajo seguro y estándares técnicos vigentes.`;
      }
      if (tipo === "bodega") {
        return `El ${ctx.cargo} es responsable de la recepción, almacenamiento, despacho y control de materiales, insumos e inventario en ${ctx.area}. Opera equipos de manejo de materiales y aplica técnicas de manipulación segura de cargas, manteniendo el orden y registro del área de bodega conforme a los procedimientos internos de la empresa.`;
      }
      return `El ${ctx.cargo} es responsable del desempeño de sus funciones en el área ${ctx.area} de ${ctx.empresaNombre}, desarrollando sus labores conforme a las instrucciones de la jefatura directa, los procedimientos de trabajo seguro definidos y las normas internas de la empresa. Asegura el cumplimiento de los estándares de calidad, seguridad y productividad del área, reportando condiciones inseguras oportunamente.`;
    }
    case "tareas_realiza": {
      const tipo = getCargoTipo(ctx.cargo);
      if (tipo === "instalacion") {
        return `• Ejecutar trabajos de instalación, montaje y habilitación según especificaciones técnicas y planos entregados por el supervisor.\n• Preparar el área de trabajo antes de iniciar la tarea: delimitar, señalizar y verificar condiciones de seguridad.\n• Operar herramientas manuales (martillo, llaves, destornilladores, metro) y eléctricas (taladro, esmeril, atornillador).\n• Realizar conexiones y empalmes según diseño y protocolos técnicos definidos para el cargo.\n• Verificar el correcto funcionamiento de las instalaciones ejecutadas antes del cierre de cada trabajo.\n• Mantener el orden y aseo del área de trabajo; retirar materiales sobrantes al término de la jornada.\n• Completar y firmar el AST antes de iniciar tareas de alto riesgo.\n• Reportar al supervisor avance de trabajos, condiciones inseguras, incidentes o fallas técnicas.\n• Cumplir PTS y reglamento interno de seguridad en todo momento.`;
      }
      if (tipo === "supervision") {
        return `• Planificar y asignar tareas al equipo de trabajo según programa diario de actividades.\n• Supervisar el cumplimiento de Procedimientos de Trabajo Seguro (PTS) y el uso correcto de EPP.\n• Realizar inspecciones de seguridad en áreas de trabajo y registrar condiciones inseguras detectadas.\n• Verificar el AST de los trabajadores antes del inicio de actividades críticas.\n• Coordinar con jefatura, clientes y áreas de apoyo el avance de los trabajos.\n• Documentar avance productivo, incidentes, no conformidades y acciones correctivas.\n• Investigar incidentes o condiciones inseguras en el área a su cargo.\n• Gestionar recursos (materiales, personal, equipos) para el cumplimiento del programa de trabajo.\n• Velar por el cumplimiento del reglamento interno y normativa de seguridad vigente.`;
      }
      if (tipo === "admin") {
        return `• Gestionar documentación y registros administrativos del área (contratos, facturas, reportes, correspondencia).\n• Atender y derivar llamadas, correos y solicitudes internas y externas según prioridad.\n• Mantener bases de datos, registros y sistemas de información del área actualizados.\n• Coordinar agenda, reuniones y actividades del área o de la jefatura directa.\n• Elaborar informes, presentaciones y documentos corporativos según requerimiento.\n• Apoyar procesos de contratación, compras u operaciones administrativas en curso.\n• Mantener el orden y confidencialidad de la información gestionada.\n• Reportar a jefatura situaciones que requieran atención o toma de decisiones.`;
      }
      if (tipo === "tecnico") {
        return `• Instalar, mantener y reparar equipos y sistemas según programa de mantenimiento y solicitudes.\n• Diagnosticar fallas y ejecutar acciones correctivas siguiendo protocolos técnicos y de seguridad.\n• Completar órdenes de trabajo, registros de mantención y documentación técnica del cargo.\n• Verificar correcto funcionamiento de equipos antes de entregar el trabajo al cliente o supervisor.\n• Mantener en buen estado y ordenados los equipos, herramientas e instrumentos a su cargo.\n• Cumplir PTS y procedimientos de bloqueo/etiquetado (LOTO) antes de intervenir equipos.\n• Reportar fallas recurrentes, condiciones inseguras o deterioro de equipos a jefatura directa.`;
      }
      if (tipo === "bodega") {
        return `• Recepcionar, revisar e ingresar materiales a sistema según procedimientos de bodega.\n• Almacenar materiales en forma segura y ordenada según criterios de ubicación y compatibilidad.\n• Despachar materiales según órdenes de trabajo autorizadas y registrar movimientos.\n• Controlar inventario y participar en los procesos de inventariado periódico.\n• Operar equipos de manejo de materiales (transpaleta) según capacitación y autorización vigente.\n• Aplicar técnicas correctas de manipulación manual de cargas.\n• Mantener el orden y aseo del área de bodega.\n• Informar a jefatura sobre faltantes, deterioro de materiales o condiciones inseguras detectadas.`;
      }
      return `• Ejecutar las tareas asignadas conforme a los procedimientos de trabajo seguro definidos por la empresa.\n• Operar equipos, herramientas y materiales con la capacitación y autorización correspondiente.\n• Coordinar con la jefatura directa y compañeros de trabajo el avance de las labores asignadas.\n• Mantener el orden y aseo en el área de trabajo durante toda la jornada.\n• Reportar de inmediato condiciones inseguras, incidentes o accidentes a la jefatura directa.\n• Cumplir los Procedimientos de Trabajo Seguro (PTS) y normas internas de la empresa.\n• Participar activamente en las actividades de capacitación y prevención de riesgos.`;
    }
    case "lugares_trabajo_cargo": {
      const tipo = getCargoTipo(ctx.cargo);
      const centro = ctx.centroTrabajo || `Dependencias de ${ctx.empresaNombre}`;
      if (tipo === "instalacion") {
        return `• Obras, faenas y proyectos en curso en dependencias de clientes.\n• Instalaciones industriales, comerciales o residenciales asignadas por la empresa.\n• Taller o bodega de la empresa (preparación de materiales, carga y descarga).\n• Vías de acceso, circulación y zonas de tránsito en el lugar de trabajo.\n• Centro de trabajo principal: ${centro}.`;
      }
      if (tipo === "supervision") {
        return `• Obras y faenas bajo supervisión directa en dependencias de clientes.\n• Oficina o sala de coordinación en ${centro}.\n• Áreas de inspección en los distintos frentes de trabajo bajo su responsabilidad.\n• Vías de acceso y desplazamiento entre distintos puntos de la faena o proyecto.`;
      }
      if (tipo === "admin") {
        return `• Oficina principal o área administrativa de ${ctx.empresaNombre}.\n• Sala de reuniones para coordinaciones con otras áreas.\n• ${centro}.\n• Teletrabajo parcial conforme a política vigente de la empresa (si aplica).`;
      }
      return `• ${centro}.\n• Dependencias internas de ${ctx.empresaNombre} asignadas al área ${ctx.area}.\n• Zonas de trabajo habilitadas para el cargo según organización interna de la empresa.`;
    }
    case "herramientas_equipos": {
      const tipo = getCargoTipo(ctx.cargo);
      if (tipo === "instalacion") {
        return `• Herramientas manuales: martillo, llaves mixtas, alicate, destornilladores, formón, serrucho, metro y flexómetro.\n• Herramientas eléctricas: taladro percutor, esmeril angular, atornillador eléctrico, sierra circular (según tarea asignada).\n• Equipos de medición: nivel digital, detector de tensión, multímetro.\n• Escalera o andamio certificado para trabajos en altura.\n• Equipos de protección colectiva: conos, cinta de señalización y delimitación de zona.\n• Teléfono o radio para coordinación con supervisor.`;
      }
      if (tipo === "supervision") {
        return `• Computador portátil o tablet para gestión de documentación y registro de avance.\n• Teléfono corporativo para coordinación con equipo, jefatura y clientes.\n• Vehículo de empresa para desplazamientos a terreno (con autorización vigente).\n• Herramientas de inspección: cinta métrica, nivel, linterna, cámara fotográfica.\n• Documentos de obra: planos, PTS, registros de habilitación y check-list de inspección.`;
      }
      if (tipo === "admin") {
        return `• Computador de escritorio o portátil con software corporativo (ERP, suite de oficina, correo electrónico).\n• Monitor, teclado y mouse ergonómico; apoya muñeca según evaluación ergonómica.\n• Teléfono IP o celular corporativo.\n• Impresora, escáner y equipos periféricos de oficina.\n• Escritorio, silla ergonómica ajustable y mobiliario de oficina.\n• Archivadores y medios de almacenamiento de documentos físicos y digitales.`;
      }
      if (tipo === "tecnico") {
        return `• Instrumentos de medición y diagnóstico propios de la especialidad técnica del cargo.\n• Herramientas manuales y eléctricas de uso técnico (llaves, destornilladores, pinzas, multímetro, etc.).\n• Equipos de prueba, calibración y verificación de sistemas e instalaciones.\n• Repuestos, consumibles y materiales técnicos para mantenimiento preventivo y correctivo.\n• Computador portátil o tablet para registro de mantención y acceso a manuales técnicos.\n• Teléfono para coordinación con supervisor y clientes.`;
      }
      if (tipo === "bodega") {
        return `• Transpaleta manual o eléctrica (con autorización y capacitación vigente).\n• Terminal de bodega para registro de inventario (WMS u otro sistema corporativo).\n• Lectores de código de barras y/o escáner de inventario.\n• Herramientas de habilitación de embalaje: cúter, cintas adhesivas, zuncho.\n• EPP de bodega: zapatos o botines de seguridad, guantes de trabajo, chaleco reflectante.`;
      }
      return `• Herramientas y equipos asignados al cargo ${ctx.cargo} según la naturaleza de las labores del área ${ctx.area}.\n• Equipos de comunicación (teléfono, radio) para coordinación con jefatura directa.\n• EPP requerido según la matriz de riesgos del cargo.\n• El trabajador debe estar capacitado y autorizado para operar cada equipo o herramienta.`;
    }
    case "epp_requerido_info": {
      const tipo = getCargoTipo(ctx.cargo);
      if (tipo === "instalacion") {
        return `EPP requeridos para el cargo ${ctx.cargo} (uso obligatorio en todo momento de exposición al riesgo):\n• Casco de seguridad tipo I o II certificado (uso permanente en obra y faenas).\n• Zapatos o botines de seguridad con puntera de acero y suela antideslizante.\n• Guantes de cuero o anticorte para trabajos con herramientas y materiales.\n• Lentes o gafas de seguridad (uso permanente en zonas de riesgo).\n• Chaleco reflectante de identificación.\n• Protector auditivo tipo fono o inserción (según nivel de ruido presente).\n• Arnés de seguridad y línea de vida para trabajos en altura igual o mayor a 1,8 m.\n• Mascarilla antipolvo o respirador según exposición a polvo o gases.\n⚠ La entrega de EPP se registra en el documento 'Registro de Entrega de EPP' (documento separado).`;
      }
      if (tipo === "supervision") {
        return `EPP requeridos para el cargo ${ctx.cargo} al ingresar a áreas operativas:\n• Casco de seguridad (obligatorio en obra y faenas).\n• Chaleco reflectante identificativo de supervisor.\n• Zapatos o botines de seguridad con puntera de acero.\n• Lentes de seguridad en zonas con riesgo de proyección de partículas.\n• Guantes de trabajo para inspecciones en terreno.\n⚠ La entrega de EPP se registra en el documento 'Registro de Entrega de EPP' (documento separado).`;
      }
      if (tipo === "admin") {
        return `EPP requeridos para el cargo ${ctx.cargo}:\n• No requiere EPP de uso permanente en funciones administrativas de oficina.\n• Al ingresar ocasionalmente a áreas operativas: chaleco reflectante y calzado cerrado adecuado.\n• Elementos ergonómicos complementarios (apoya muñeca, apoya pies) según evaluación ergonómica.\n⚠ La entrega de EPP se registra en el documento 'Registro de Entrega de EPP' (documento separado).`;
      }
      if (tipo === "tecnico") {
        return `EPP requeridos para el cargo ${ctx.cargo}:\n• Zapatos o botines de seguridad con puntera de acero.\n• Lentes de seguridad al trabajar con herramientas o en zonas de riesgo.\n• Guantes dieléctricos y/o anticorte según la tarea (trabajos eléctricos, mecánicos).\n• Casco de seguridad en trabajos con riesgo de caída de objetos o en altura.\n• Chaleco reflectante al ingresar a áreas operativas o de tráfico.\n⚠ La entrega de EPP se registra en el documento 'Registro de Entrega de EPP' (documento separado).`;
      }
      if (tipo === "bodega") {
        return `EPP requeridos para el cargo ${ctx.cargo}:\n• Zapatos o botines de seguridad con puntera de acero y suela antideslizante.\n• Guantes de trabajo para manipulación de materiales y superficies cortantes.\n• Chaleco reflectante de identificación en bodega.\n• Lentes de seguridad al manipular insumos o en zonas de tránsito de equipos.\n• Casco de seguridad en áreas con operación de maquinaria elevadora.\n⚠ La entrega de EPP se registra en el documento 'Registro de Entrega de EPP' (documento separado).`;
      }
      return `EPP requeridos para el cargo ${ctx.cargo} según la matriz de riesgos y la naturaleza de las tareas en ${ctx.area}:\n• El trabajador debe usar los EPP asignados en todo momento durante la exposición al riesgo.\n• Los EPP son entregados sin costo para el trabajador, certificados según D.S. 18 del Minsal.\n⚠ La entrega de EPP se registra en el documento 'Registro de Entrega de EPP' (documento separado).`;
    }
    case "riesgos_tareas_tabla": {
      const tipo = getCargoTipo(ctx.cargo);
      if (tipo === "instalacion") {
        return [
          { peligro: "Caída a distinto nivel durante trabajos en altura: uso de escalera, andamio o plataforma elevadora.", consecuencia: "Traumatismos graves, fracturas de cráneo, columna o extremidades. Riesgo fatal.", medida: "Usar arnés de seguridad y línea de vida certificados. Verificar condición de la escalera/andamio antes de usar. Delimitar área inferior. No superar la capacidad del equipo." },
          { peligro: "Contacto eléctrico al ejecutar instalación, empalme o mantención de sistemas energizados.", consecuencia: "Descarga eléctrica, quemaduras, fibrilación ventricular o paro cardíaco.", medida: "Verificar ausencia de tensión con detector antes de intervenir. Aplicar LOTO. Usar guantes dieléctricos y herramientas aisladas. Nunca intervenir sistemas energizados sin PTS." },
          { peligro: "Proyección de partículas (metal, concreto, madera) durante corte, esmerilado o taladrado.", consecuencia: "Lesiones oculares, laceraciones faciales o corporales.", medida: "Usar lentes de seguridad certificados. Señalizar y delimitar el área. Verificar que el personal adyacente use EPP al iniciar." },
          { peligro: "Golpe o lesión por manejo incorrecto de herramientas manuales y eléctricas durante la ejecución del trabajo.", consecuencia: "Cortes, contusiones, fracturas leves o graves según el evento.", medida: "Usar cada herramienta según el protocolo definido. Verificar estado antes de usar. Usar guantes anticorte. No operar herramientas en mal estado." },
          { peligro: "Sobreesfuerzo por manipulación manual de materiales de construcción, equipos o estructuras pesadas.", consecuencia: "Lesiones musculoesqueléticas de columna, hombros y extremidades superiores.", medida: "Aplicar técnica correcta de levantamiento. No exceder 25 kg individualmente. Solicitar apoyo para cargas pesadas. Usar carretilla o elementos auxiliares cuando corresponda." },
        ];
      }
      if (tipo === "supervision") {
        return [
          { peligro: "Accidente de tránsito durante desplazamientos a terreno o faenas en vehículo de empresa.", consecuencia: "Lesiones de diversa gravedad. Riesgo vital.", medida: "Respetar normativa de tránsito. No usar teléfono al conducir. Verificar condición del vehículo antes de salir. Reportar condiciones adversas de ruta." },
          { peligro: "Caídas al mismo nivel en accesos a obra, terrenos irregulares o áreas en construcción.", consecuencia: "Contusiones, esguinces o fracturas.", medida: "Usar calzado de seguridad adecuado al ingresar a faenas. Prestar atención al entorno y a las señalizaciones. Reportar zonas irregulares." },
          { peligro: "Exposición a riesgos de las áreas supervisadas (altura, ruido, polvo) durante inspecciones en terreno.", consecuencia: "Accidentes o enfermedades profesionales según el riesgo presente en el área.", medida: "Usar EPP adecuado al área a inspeccionar. Cumplir las mismas normas de seguridad exigidas al personal bajo su supervisión." },
        ];
      }
      if (tipo === "admin") {
        return [
          { peligro: "Sobrecarga visual y postural por trabajo prolongado frente a pantalla de computador.", consecuencia: "Fatiga visual, dolor cervical, dorsal y lumbar. Trastornos musculoesqueléticos de extremidades superiores.", medida: "Ajustar postura ergonómica según instrucciones. Aplicar pausa visual (regla 20-20-20). Realizar pausas activas cada 45-60 minutos." },
          { peligro: "Caídas al mismo nivel en oficina por pasillos desordenados, cables expuestos o pisos húmedos.", consecuencia: "Contusiones, esguinces o fracturas.", medida: "Mantener pasillos despejados. Ordenar cables bajo el escritorio. Informar de inmediato pisos húmedos u objetos en el camino." },
          { peligro: "Riesgos psicosociales por alta demanda cognitiva, plazos exigentes o sobrecarga de trabajo.", consecuencia: "Estrés, ansiedad, cansancio mental, ausentismo laboral.", medida: "Planificar carga de trabajo con la jefatura. Aplicar Protocolo CEAL-SM. Comunicar situaciones de sobrecarga al supervisor directo." },
        ];
      }
      return ctx.riesgos.map((r) => ({
        peligro: r,
        consecuencia: (() => {
          const n = r.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (/caida|altura/.test(n)) return "Fracturas, contusiones y lesiones incapacitantes.";
          if (/elect/.test(n)) return "Descargas eléctricas, quemaduras o riesgo vital.";
          if (/sobreesfuerzo|postur|muscul|ergonom/.test(n)) return "Lesiones musculoesqueléticas y dolor crónico.";
          if (/golpe|atrap|corte/.test(n)) return "Traumatismos, laceraciones o amputaciones.";
          if (/ruido/.test(n)) return "Hipoacusia, pérdida auditiva inducida por ruido.";
          if (/psicosocial|estres/.test(n)) return "Fatiga mental, ansiedad, bajo rendimiento laboral.";
          return "Accidente laboral con consecuencias variables según el tipo de evento.";
        })(),
        medida: (() => {
          const n = r.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (/caida|altura/.test(n)) return "Mantener áreas despejadas. Calzado de seguridad. Arnés para altura. Aplicar PTS.";
          if (/elect/.test(n)) return "Equipos certificados. LOTO antes de intervenir. Verificar ausencia de tensión. Reportar fallas.";
          if (/sobreesfuerzo|postur|muscul|ergonom/.test(n)) return "Técnica correcta de manipulación. Pausas activas. Evaluación ergonómica. No exceder 25 kg.";
          if (/golpe|atrap|corte/.test(n)) return "Guardas de seguridad instaladas. EPP adecuado. Seguir PTS. Reportar herramientas en mal estado.";
          if (/ruido/.test(n)) return "Protección auditiva obligatoria. Evaluación PREXOR. Rotación de tareas en zonas ruidosas.";
          return "Identificar peligros antes de iniciar. Aplicar controles definidos. Usar EPP asignado. Reportar condiciones inseguras.";
        })(),
      }));
    }
    case "riesgos_lugar_tabla": {
      const tipo = getCargoTipo(ctx.cargo);
      if (tipo === "instalacion") {
        return [
          { peligro: "Caídas al mismo nivel por superficies irregulares, húmedas o con escombros en la zona de trabajo.", consecuencia: "Esguinces, contusiones y fracturas.", medida: "Mantener la zona despejada antes y durante la tarea. Señalizar obstáculos y zonas húmedas. Usar calzado con suela antideslizante." },
          { peligro: "Exposición a material particulado (polvo, cemento, partículas) generado por el proceso de trabajo.", consecuencia: "Irritación respiratoria, afecciones bronquiales o efectos crónicos pulmonares.", medida: "Usar mascarilla antipolvo al ejecutar cortes, perforaciones o trabajos con polvo. Ventilar el espacio de trabajo. Delimitar el área." },
          { peligro: "Riesgo de incendio o explosión por presencia de materiales inflamables o chispas durante trabajos de corte o esmerilado.", consecuencia: "Quemaduras, intoxicación por humo y daños materiales.", medida: "No generar chispas cerca de materiales inflamables. Mantener extintor accesible. Revisar área antes de iniciar trabajos de corte o soldadura." },
        ];
      }
      return [
        { peligro: "Caídas al mismo nivel por estado de pisos, pasillos o vías de circulación en el área de trabajo.", consecuencia: "Contusiones, esguinces y fracturas.", medida: "Mantener zonas de tránsito despejadas y señalizadas. Informar inmediatamente al supervisor cualquier condición insegura del entorno." },
        { peligro: "Condiciones ambientales adversas del lugar de trabajo (iluminación insuficiente, temperatura extrema, ruido).", consecuencia: "Fatigabilidad, disminución de la concentración, efectos agudos o crónicos en salud.", medida: "Mantener condiciones adecuadas de iluminación y ventilación. Usar protección auditiva cuando el ruido lo requiera. Reportar condiciones inadecuadas." },
        { peligro: "Riesgos psicosociales derivados de carga de trabajo, plazos exigentes y condiciones organizacionales del área.", consecuencia: "Estrés, fatiga mental, disminución del rendimiento y de la concentración.", medida: "Mantener comunicación continua con jefatura sobre cargas de trabajo. Participar en el Protocolo de Vigilancia de Riesgos Psicosociales (CEAL-SM)." },
      ];
    }
    // ── Sección 8: Normas generales ───────────────────────────────────────
    case "normas_ley16744":
      return `Ley 16.744 y su contenido: Define Accidente del Trabajo como toda lesión que sufra una persona a causa o con ocasión del trabajo. Accidente del Trayecto: ocurrido en el trayecto directo entre la habitación y el trabajo. Enfermedad Profesional: causada directamente por el ejercicio de la profesión. Beneficios médicos del seguro: atención clínica, honorarios médicos, medicamentos, días cama, exámenes, procedimientos, prótesis y rehabilitación. Beneficios económicos: subsidio por incapacidad laboral, indemnizaciones, pensiones de invalidez y sobrevivencia. Procedimiento: atención inmediata y primeros auxilios. Traslado a Mutual de Seguridad. Emisión de DIAT o DIEP. Notificación a la jefatura.`;
    case "normas_mmc":
      return `Riesgos del Manejo Manual de Materiales (Ley 20.001, Art. 211H; Ley 20.949; D.S. 63): Límites máximos de carga manual: Hombres mayores de 18 años: hasta 25 kg. Mujeres y hombres menores de 18 años: no más de 20 kg. Mujeres embarazadas: prohibición de manipular cargas. Aplicar técnicas correctas de levantamiento, traslado, empuje y arrastre. Evaluación ergonómica cuando la manipulación sea frecuente o repetitiva. Uso de ayudas mecánicas (carros, transpaletas, mesas elevadoras). Capacitación periódica en técnicas de manipulación segura.`;
    case "normas_emergencias_control":
      return `Control de Emergencias, Incendios y Primeros Auxilios: El trabajador debe conocer los procedimientos generales de emergencia de la empresa, rutas de evacuación, puntos de encuentro y canales de comunicación. En caso de incendio: reconocer el lugar de origen. Evaluar el estado de avance de las llamas. Si está entrenado y el fuego no se ha descontrolado, usar el extintor adecuado. Avisar inmediatamente a la jefatura directa. Retirarse del área. Llamar a emergencias: Ambulancia 131, Bomberos 132, Carabineros 133. En caso de accidente: activar protocolo interno, prestar primeros auxilios básicos y coordinar con servicios de emergencia.`;
    case "normas_emergencias_actuacion":
      return `Actuación en caso de emergencias: INCENDIOS: Reconocer el lugar de origen del fuego. Evaluar avance de llamas. Si está entrenado y fuego es controlable, usar extintor. Avisar a jefatura directa. Retirarse del área. Llamar Ambulancia 131, Bomberos 132, Carabineros 133. Si incendio declarado, activar Plan GRD. SISMOS: Mantener la calma. Mantenerse bajo vigas o pilares. Detener marcha si conduce. Alejarse del cableado eléctrico. Esperar señal de evacuación a zonas de seguridad. Al concluir el sismo, evaluar condición de equipos e infraestructura antes de retomar operaciones.`;
    case "normas_accidentes_graves":
      return `Res. Exenta 156 SUSESO - Accidentes Graves y Fatales: Accidente Fatal: cuyo resultado es la muerte inmediata o durante traslado. Accidente Grave: caída desde más de 1,8m; obliga a maniobras de rescate o reanimación; provoca pérdida inmediata de parte del cuerpo; involucra número de trabajadores que interrumpe la faena. Procedimiento obligatorio: Paralización inmediata de la faena. Aislamiento del área. Prohibición de modificar el sitio. Comunicación inmediata a: SEREMI de Salud, Inspección del Trabajo, Organismo Administrador del Seguro. Cooperar con la investigación oficial.`;
    case "normas_epp_info":
      return `Elementos de Protección Personal (EPP): Deben ser entregados sin costo para el trabajador, certificados según D.S. 18 del Ministerio de Salud. La entrega se realiza contra firma, registrando fecha, tipo de EPP y vigencia. El trabajador debe: mantener los EPP en buen estado, informar inmediatamente su deterioro, entregar el EPP dañado al recibir uno nuevo. El uso de EPP es obligatorio durante todo el tiempo de exposición al riesgo. La empresa debe verificar periódicamente su correcta utilización.`;
    case "normas_ergonomia":
      return `Posición Ergonómica en Estaciones de Trabajo: Mantener la espalda apoyada en el respaldo con soporte lumbar. Regular altura del asiento: pies apoyados en el suelo, flexión de rodillas ~90-100°. Hombros relajados, codos cercanos al cuerpo, antebrazos apoyados ~90°. Monitor a la altura de los ojos, a 50-70 cm de distancia. Teclado y mouse sin extensión o flexión forzada de muñecas. Realizar pausas activas periódicas. Aplicar regla 20-20-20 para descanso visual.`;
    case "normas_extintores":
      return `Capacitación uso y manejo de extintores: Componentes del fuego (combustible, calor, oxígeno). Clases de fuego: A (sólidos), B (líquidos), C (eléctricos), D (metales). Equipos de extinción: polvo químico seco (PQS) y dióxido de carbono (CO2). Técnica PASS: Jalar el seguro. Apuntar a la base del fuego. Apretar la palanca. Barrer de un lado al otro. Nunca dar la espalda al fuego al retirarse.`;
    case "normas_senalizacion":
      return `Señalizaciones de Seguridad: ROJO = PELIGRO: riesgo o peligro inmediato; también indica ubicación de equipos contra incendio. AMARILLO = PRECAUCIÓN: advertencia contra riesgos potenciales o acciones subestándar. VERDE = RECOMENDACIÓN: sugerencias de seguridad y circuitos de evacuación hasta la zona de seguridad. Todas las personas trabajadoras deben respetar las señalizaciones de seguridad de manera obligatoria.`;
    case "normas_pts_texto":
      return `Procedimientos de Trabajo Seguro (PTS): Todas las tareas habituales de mediana o alta criticidad del cargo ${ctx.cargo} deben realizarse bajo los PTS definidos por la empresa. El uso de PTS es obligatorio previo a cualquier actividad que implique un riesgo significativo. Revisar el AST antes de iniciar la tarea. Identificar peligros, evaluar riesgos y aplicar controles. Reportar cualquier condición insegura al supervisor antes de continuar.`;
    case "normas_protocolos_tabla":
      return [
        { protocolo: "Protocolo Psicosocial (CEAL/SM)", aplica: "Sí", detalle: "Aplica a organizaciones con más de 10 trabajadores. Vigilancia de la salud mental de los colaboradores." },
        { protocolo: "Protocolo TMERT/MMC", aplica: "Sí", detalle: "Prevención de trastornos musculoesqueléticos, movimientos repetitivos, esfuerzos físicos y posturas forzadas." },
      ];
    case "normas_quimicos":
      return `Sustancias Químicas Peligrosas: En el desempeño de sus funciones, el trabajador puede estar expuesto a sustancias químicas según el cargo y área. Respetar las Hojas de Datos de Seguridad (HDS) de los productos. Ventilar adecuadamente el área cuando se utilicen productos químicos. Conocer procedimientos ante derrames. Usar EPP adecuado (guantes, gafas, mascarilla) al manipular sustancias químicas. No fumar ni generar chispas cerca de productos inflamables.`;
    // ── Sección 9: Documentos ─────────────────────────────────────────────
    case "documentos_pts_lista":
      return [`PTS de Trabajo Seguro para el cargo ${ctx.cargo}`, "PTS de Uso Seguro de Equipos y Herramientas", "PTS de Orden y Aseo en Áreas de Trabajo", "PTS de Desplazamiento Seguro en la Empresa"];
    case "documentos_hds_lista":
      return ["Hojas de Datos de Seguridad de productos químicos presentes en el área de trabajo (si aplica).", "Hojas de Datos de Seguridad de productos de limpieza de uso general."];
    case "documentos_otros_lista":
      return ["Evaluación ergonómica del puesto de trabajo (TMERT/MMC u otra metodología aplicada).", "Resultados y registros del Protocolo de Riesgos Psicosociales CEAL-SM.", "Registros de pausas activas y capacitaciones en seguridad.", "Registros de inducción en seguridad y normas internas de la empresa."];
    default:
      return "";
  }
}

function generarValorCampoEpp(campoId: keyof DocumentoEppCampos, ctx: ContextoGeneracionCampoIA): DocumentoEppCampos[keyof DocumentoEppCampos] {
  const today = new Date().toISOString().slice(0, 10);

  switch (campoId) {
    case "trabajador_nombre":
      return ctx.trabajadorNombre;
    case "trabajador_rut":
      return ctx.trabajadorRut;
    case "area":
      return ctx.area;
    case "fecha":
      return today;
    case "epp_tabla":
      return generarTablaEppDesdeContexto(ctx);
    case "observaciones_generales":
      return "Entrega realizada con instrucción de uso, cuidado, reposición y almacenamiento de los elementos.";
    case "declaracion":
      return "Declaro haber recibido los EPP en buen estado y conocer su uso obligatorio durante la jornada laboral.";
    case "firma_trabajador":
      return ctx.trabajadorNombre;
    case "entregado_por":
      return "Encargado SST";
    default:
      return "";
  }
}

async function getContextoGeneracionCampoIA(
  empresaId: string,
  documentoId: string,
): Promise<ContextoGeneracionCampoIA> {
  const doc = await prisma.trabajadorDocumento.findFirst({
    where: { id: documentoId, empresaId },
    select: {
      id: true,
      tipo: true,
      nombre: true,
      observaciones: true,
      trabajador: {
        select: {
          nombres: true,
          apellidos: true,
          rut: true,
          jornada: true,
          cargo: { select: { nombre: true } },
          area: { select: { nombre: true } },
          centroTrabajo: { select: { nombre: true } },
        },
      },
      empresa: {
        select: { nombre: true, razonSocial: true },
      },
    },
  });

  if (!doc) {
    throw new Error("Documento de trabajador no encontrado");
  }

  const trabajadorNombre = `${doc.trabajador?.nombres ?? ""} ${doc.trabajador?.apellidos ?? ""}`.trim() || "(nombre no registrado)";
  const trabajadorRut = doc.trabajador?.rut ?? "";
  const cargo = doc.trabajador?.cargo?.nombre ?? "";
  const area = doc.trabajador?.area?.nombre ?? "";
  const centroTrabajo = doc.trabajador?.centroTrabajo?.nombre ?? "";
  const jornada = doc.trabajador?.jornada ?? "Diurna";
  const empresaNombre = doc.empresa?.razonSocial ?? doc.empresa?.nombre ?? "DICAPREV";

  const estructuraActual = parseDocumentoEstructurado(doc.observaciones ?? "");
  const plantilla = estructuraActual?.plantillaCodigo ?? plantillaDesdeTipoDocumento(doc.tipo, doc.nombre);
  const estructura = estructuraActual ?? (
    plantilla === "EPP"
      ? crearDocumentoEppEstructurado({
          tipoNombre: doc.nombre,
          trabajadorNombre,
          trabajadorRut,
          cargo,
          area,
          empresa: empresaNombre,
        })
      : crearDocumentoIrlEstructurado({
          tipoNombre: doc.nombre,
          trabajadorNombre,
          trabajadorRut,
          cargo,
          area,
          empresa: empresaNombre,
        })
  );

  const riesgos = detectarRiesgosContextuales(cargo, area);
  return {
    documentoId: doc.id,
    empresaNombre,
    trabajadorNombre,
    trabajadorRut,
    cargo,
    area,
    centroTrabajo,
    jornada,
    riesgos,
    estructura,
  };
}

function fieldsBySection(estructura: DocumentoEstructurado, seccionId: string): string[] {
  if (estructura.plantillaCodigo === "IRL") {
    const map: Record<string, Array<keyof DocumentoIrlCampos>> = {
      encabezado: [
        "empresa_nombre",
        "empresa_contratista",
        "empresa_mandante",
        "codigo_documento",
        "version",
        "cargo",
        "anio",
        "tipo_induccion",
        "modalidad",
        "tipo_actividad",
        "trabajador_nombre",
        "trabajador_rut",
        "trabajador_cargo",
        "trabajador_area",
        "fecha",
        "jornada",
        "turno",
        "hora_inicio",
        "hora_termino",
        "telefono_emergencia",
        "accidentes_anteriores",
        "capacitaciones_previas",
      ],
      lugar_trabajo: ["direccion_lugar_trabajo", "lugar_trabajo", "espacio_trabajo", "condiciones_ambientales", "orden_aseo", "prevencionista_nombre", "prevencionista_cargo"],
      riesgos_generales: ["riesgos_generales_tabla"],
      riesgos_maquinas: ["riesgos_maquinas_tabla"],
      riesgos_quimicos: ["riesgos_quimicos_tabla"],
      riesgos_psicosociales: ["riesgos_psicosociales_tabla"],
      riesgos_especificos: ["descripcion_actividad", "tareas_realiza", "lugares_trabajo_cargo", "herramientas_equipos", "epp_requerido_info", "riesgos_tareas_tabla", "riesgos_lugar_tabla"],
      normativa: ["normas_ley16744", "normas_mmc", "normas_emergencias_control", "normas_emergencias_actuacion", "normas_accidentes_graves", "normas_epp_info", "normas_ergonomia", "normas_extintores", "normas_senalizacion", "normas_pts_texto", "normas_protocolos_tabla", "normas_quimicos"],
      documentos_section: ["documentos_pts_lista", "documentos_hds_lista", "documentos_otros_lista"],
      epp_resumen: ["epp_induccion_tabla"],
      compromisos: ["compromisos_trabajador"],
      cierre: ["declaracion", "firma_trabajador", "firma_relator"],
    };
    return (map[seccionId] ?? []).map(String);
  }

  const map: Record<string, Array<keyof DocumentoEppCampos>> = {
    encabezado: ["trabajador_nombre", "trabajador_rut", "area", "fecha"],
    tabla_epp: ["epp_tabla"],
    cierre: ["observaciones_generales", "declaracion", "firma_trabajador", "entregado_por"],
  };
  return (map[seccionId] ?? []).map(String);
}

function normalizeOdiToken(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extraerRiesgosDesdePerfil(cargoPerfil: string | null, cargoDescripcion: string | null): string[] {
  const source = normalizeOdiToken(`${cargoPerfil ?? ""} ${cargoDescripcion ?? ""}`);
  const riesgos: string[] = [];
  if (source.includes("altura")) riesgos.push("Trabajos en altura");
  if (source.includes("elect")) riesgos.push("Riesgo eléctrico");
  if (source.includes("ruido")) riesgos.push("Exposición a ruido");
  if (source.includes("silice") || source.includes("silica")) riesgos.push("Exposición a sílice");
  if (source.includes("quimic")) riesgos.push("Exposición a agentes químicos");
  if (source.includes("psicosocial")) riesgos.push("Riesgos psicosociales");
  if (source.includes("tmert") || source.includes("ergonom")) riesgos.push("Riesgos ergonómicos");
  if (source.includes("mmc") || source.includes("carga")) riesgos.push("Manipulación manual de cargas");
  return riesgos;
}

function construirBorradorOdiLocal(input: {
  empresaNombre: string;
  trabajadorNombre: string;
  trabajadorRut: string;
  cargo: string;
  area: string;
  centroTrabajo: string;
  tipoContrato: string;
  riesgos: string[];
}): string {
  const fecha = new Date().toISOString().slice(0, 10);
  const riesgos = input.riesgos.length
    ? input.riesgos.map((riesgo) => `- ${riesgo}`).join("\n")
    : "- Riesgos generales del puesto por definir con equipo SST";

  return [
    "IRL - INFORME DE RIESGOS LABORALES - BORRADOR",
    "",
    `Fecha: ${fecha}`,
    `Empresa: ${input.empresaNombre}`,
    `Trabajador: ${input.trabajadorNombre}`,
    `RUT: ${input.trabajadorRut || "No informado"}`,
    `Cargo: ${input.cargo || "No informado"}`,
    `Area: ${input.area || "No informada"}`,
    `Centro de trabajo: ${input.centroTrabajo || "No informado"}`,
    `Tipo de contrato: ${input.tipoContrato || "No informado"}`,
    "",
    "1) Objetivo",
    "Informar a la persona trabajadora sobre los riesgos laborales del cargo, medidas preventivas, procedimientos seguros y protocolos de emergencia aplicables.",
    "",
    "2) Riesgos del cargo",
    riesgos,
    "",
    "3) Medidas preventivas",
    "- Uso obligatorio de EPP según tarea y exposición",
    "- Cumplimiento de procedimientos de trabajo seguro (PTS)",
    "- Reporte inmediato de incidentes y condiciones inseguras",
    "- Participación en inducciones y capacitaciones obligatorias",
    "",
    "4) Emergencias y reporte",
    "- Activar protocolo interno de emergencia ante incidente",
    "- Notificar a jefatura directa y al equipo de prevención",
    "- Mantener y respetar rutas de evacuación y punto de encuentro",
    "",
    "5) Declaración",
    `Declaro haber recibido la información de riesgos laborales para el cargo ${input.cargo || "asignado"}, comprender su contenido y comprometerme a cumplir las medidas preventivas definidas.`,
    "",
    "Firma trabajador: __________________________",
    "Firma relator SST: _________________________",
    "",
    "Documento generado como borrador y requiere revisión profesional antes de firma.",
  ].join("\n");
}

async function generarBorradorOdiConOpenAI(input: {
  empresaNombre: string;
  trabajadorNombre: string;
  trabajadorRut: string;
  cargo: string;
  area: string;
  centroTrabajo: string;
  tipoContrato: string;
  riesgos: string[];
}): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY no configurada");
  }

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const riesgos = input.riesgos.length ? input.riesgos.join(", ") : "No informados";
  const prompt = [
    "Genera un borrador profesional en espanol para un documento IRL (Informe de Riesgos Laborales) de Chile.",
    "No uses markdown.",
    "Incluye secciones: Objetivo, Identificacion del trabajador, Riesgos del cargo, Medidas preventivas, Emergencias, Declaracion.",
    "Datos:",
    `Empresa: ${input.empresaNombre}`,
    `Trabajador: ${input.trabajadorNombre}`,
    `RUT: ${input.trabajadorRut || "No informado"}`,
    `Cargo: ${input.cargo || "No informado"}`,
    `Area: ${input.area || "No informada"}`,
    `Centro de trabajo: ${input.centroTrabajo || "No informado"}`,
    `Tipo de contrato: ${input.tipoContrato || "No informado"}`,
    `Riesgos: ${riesgos}`,
    "Agrega al final exactamente esta leyenda: Documento generado como borrador y requiere revisión profesional antes de firma.",
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
            content: "Eres un especialista en documentacion SST en Chile. Redactas documentos IRL claros y auditables.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI HTTP ${response.status}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI sin contenido");
  }
  return content;
}

export async function generarContenidoDocumentoTrabajadorIA(
  documentoId: string,
): Promise<GeneracionContenidoOdiIAResult> {
  const { empresaId } = await requirePermission("canManageDocumentacion");

  const documento = await prisma.trabajadorDocumento.findFirst({
    where: {
      id: documentoId,
      empresaId,
      esVigente: true,
    },
    select: {
      id: true,
      tipo: true,
      nombre: true,
      trabajador: {
        select: {
          nombres: true,
          apellidos: true,
          rut: true,
          tipoContrato: true,
          cargo: {
            select: {
              nombre: true,
              perfilSST: true,
              descripcion: true,
            },
          },
          area: {
            select: {
              nombre: true,
            },
          },
          centroTrabajo: {
            select: {
              nombre: true,
            },
          },
        },
      },
      empresa: {
        select: {
          nombre: true,
          razonSocial: true,
        },
      },
    },
  });

  if (!documento) {
    throw new Error("Documento no encontrado para la empresa actual");
  }

  const trabajadorNombre = `${documento.trabajador?.nombres ?? ""} ${documento.trabajador?.apellidos ?? ""}`.trim();
  const trabajadorRut = documento.trabajador?.rut ?? "";
  const cargo = documento.trabajador?.cargo?.nombre ?? "";
  const area = documento.trabajador?.area?.nombre ?? "";
  const centroTrabajo = documento.trabajador?.centroTrabajo?.nombre ?? "";
  const tipoContrato = documento.trabajador?.tipoContrato ?? "";
  const empresaNombre = documento.empresa?.razonSocial ?? documento.empresa?.nombre ?? "DICAPREV";

  const riesgos = Array.from(
    new Set([
      ...detectarRiesgosContextuales(cargo, area),
      ...extraerRiesgosDesdePerfil(
        documento.trabajador?.cargo?.perfilSST ?? null,
        documento.trabajador?.cargo?.descripcion ?? null,
      ),
    ]),
  );

  let contenido = "";
  let fuente: "openai" | "fallback_local" = "fallback_local";

  try {
    contenido = await generarBorradorOdiConOpenAI({
      empresaNombre,
      trabajadorNombre,
      trabajadorRut,
      cargo,
      area,
      centroTrabajo,
      tipoContrato,
      riesgos,
    });
    fuente = "openai";
  } catch {
    contenido = construirBorradorOdiLocal({
      empresaNombre,
      trabajadorNombre,
      trabajadorRut,
      cargo,
      area,
      centroTrabajo,
      tipoContrato,
      riesgos,
    });
    fuente = "fallback_local";
  }

  return {
    documentoId: documento.id,
    contenido,
    fuente,
    advertencia: "Documento generado como borrador y requiere revisión profesional antes de firma.",
  };
}

function mapDocEstado(estado: string): DocEstado {
  const normalized = estado.toLowerCase();
  if (normalized === "aprobado") return "completo";
  if (normalized === "completo" || normalized === "vigente") return "completo";
  if (normalized === "validado") return "validado";
  if (normalized === "enviado_firma") return "enviado_firma";
  if (normalized === "firmado") return "firmado";
  if (normalized === "vencido") return "vencido";
  if (normalized === "no_aplica") return "no_aplica";
  if (normalized === "en_revision") return "en_revision";
  if (normalized === "rechazado") return "rechazado";
  return "pendiente";
}

function normalizeEstadoForStorage(estado: EstadoDocumentoTrabajadorInput): string {
  if (estado === "aprobado") return "completo";
  return estado;
}

function mapPendingWorkflowEstado(estado?: string): "pendiente" | "en_revision" {
  const value = (estado ?? "").trim().toLowerCase();
  if (value === "pendiente_validacion") return "en_revision";
  if (value === "pendiente_firma") return "pendiente";
  if (value === "pendiente_completar") return "pendiente";
  if (value === "pendiente_asignacion") return "pendiente";
  return "pendiente";
}

function mapEstadoInicialDocumentoTrabajador(estado?: string): string {
  const value = (estado ?? "").trim().toLowerCase();
  if (value === "no_aplica") return "no_aplica";
  if (value === "en_revision") return "en_revision";
  if (value === "vigente") return "completo";
  return mapPendingWorkflowEstado(value);
}

function mapEstadoInicialDocumentoEmpresa(estado?: string): string {
  const value = (estado ?? "").trim().toLowerCase();
  if (!value || value === "borrador") return "pendiente_configuracion";
  if (value === "no_aplica") return "No aplica";
  if (value === "vigente") return "Vigente";
  if (value === "en_revision") return "Pendiente de carga";
  return "Pendiente de carga";
}

function parseOptionalDate(value?: string | null): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value.trim() === "") return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error("Fecha invalida");
  return parsed;
}

function inferCategoria(nombre: string): TipoDocumento["categoria"] {
  const n = nombre.toLowerCase();
  if (n.includes("examen") || n.includes("medic")) return "Médico";
  if (n.includes("inducci") || n.includes("capacit")) return "Capacitación";
  if (n.includes("epp") || n.includes("odi") || n.includes("ds44") || n.includes("sst")) return "SST";
  if (n.includes("licencia") || n.includes("competencia") || n.includes("técn") || n.includes("tecn")) return "Técnico";
  return "Contratación";
}

function mapWorkerRow(row: {
  id: string;
  nombres: string;
  apellidos: string;
  rut: string | null;
  email: string | null;
  telefono: string | null;
  estado: string;
  fechaIngreso: Date | null;
  fechaNacimiento: Date | null;
  tipoContrato: string | null;
  cargo: { nombre: string } | null;
  area: { nombre: string } | null;
  centroTrabajo: { nombre: string } | null;
  posicionDotacionId: string | null;
  documentos: { estado: string }[];
}): Worker {
  const pendientes = row.documentos.filter((d) => mapDocEstado(d.estado) !== "completo").length;

  return {
    id: row.id,
    nombre: row.nombres,
    apellido: row.apellidos,
    rut: row.rut ?? "",
    cargo: row.cargo?.nombre ?? "Sin cargo",
    area: row.area?.nombre ?? "Sin área",
    centroTrabajo: row.centroTrabajo?.nombre ?? "Sin centro",
    email: row.email ?? "",
    telefono: row.telefono ?? "",
    estado:
      row.estado === "inactivo"
        ? "Inactivo"
        : row.estado === "licencia"
          ? "Licencia"
          : row.estado === "vacaciones"
            ? "Vacaciones"
            : "Activo",
    fechaIngreso: row.fechaIngreso ? row.fechaIngreso.toISOString().slice(0, 10) : "",
    fechaNacimiento: row.fechaNacimiento ? row.fechaNacimiento.toISOString().slice(0, 10) : "",
    tipoContrato:
      row.tipoContrato === "Plazo Fijo" || row.tipoContrato === "Por Obra" || row.tipoContrato === "Part Time"
        ? row.tipoContrato
        : "Indefinido",
    documentosPendientes: pendientes,
    capacitacionesPendientes: 0,
    dotacionId: row.posicionDotacionId ?? undefined,
  };
}

function buildReglaNombre(rule: {
  cargo?: { nombre: string } | null;
  area?: { nombre: string } | null;
  centroTrabajo?: { nombre: string } | null;
  tipoContrato?: string | null;
  obligatorio: boolean;
}) {
  const tags: string[] = [];
  if (rule.area?.nombre) tags.push(`Área ${rule.area.nombre}`);
  if (rule.cargo?.nombre) tags.push(`Cargo ${rule.cargo.nombre}`);
  if (rule.centroTrabajo?.nombre) tags.push(`Centro ${rule.centroTrabajo.nombre}`);
  if (rule.tipoContrato) tags.push(`Contrato ${rule.tipoContrato}`);
  if (tags.length === 0) return rule.obligatorio ? "Base universal" : "Base opcional";
  return tags.join(" · ");
}

type TrabajadorEvaluable = {
  id: string;
  estado?: string | null;
  nombreCompleto?: string | null;
  cargoId: string | null;
  areaId: string | null;
  centroTrabajoId: string | null;
  tipoContrato: string | null;
  cargo?: {
    perfilSST: string | null;
    descripcion: string | null;
  } | null;
};

type EmpresaEvaluable = {
  id: string;
  tipoEmpresa: string | null;
  giro: string | null;
  tamanoEmpresa: string | null;
  cantidadTrabajadores: number;
};

type ReglaTrabajadorResolvida = {
  codigo: string;
  nombre: string;
  requiereVencimiento: boolean;
  estadoInicial: string;
};

type ReglasTrabajadorContexto = {
  fuente: "bd" | "fallback";
  reglasEvaluadas: number;
  reglasDesdeBD: number;
  reglasDesdeFallback: number;
  reglasAplicables: ReglaTrabajadorResolvida[];
};

const DEBUG_REGLAS_DOCUMENTALES =
  process.env.NODE_ENV !== "production" && process.env.DEBUG_REGLAS_DOCUMENTALES === "1";

function normalizeDocName(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function detectarRiesgosDesdeContexto(
  empresa: EmpresaEvaluable,
  trabajador?: TrabajadorEvaluable,
): string[] {
  const source = normalizeDocName(
    `${empresa.tipoEmpresa ?? ""} ${empresa.giro ?? ""} ${trabajador?.cargo?.perfilSST ?? ""} ${trabajador?.cargo?.descripcion ?? ""}`,
  );

  const riesgos: string[] = [];
  if (source.includes("ruido")) riesgos.push("ruido");
  if (source.includes("silice") || source.includes("silica")) riesgos.push("silice");
  if (source.includes("uv") || source.includes("radiacion")) riesgos.push("uv");
  if (source.includes("psicosocial")) riesgos.push("psicosocial");
  if (source.includes("tmert")) riesgos.push("tmert");
  if (source.includes("mmc") || source.includes("manual de carga")) riesgos.push("mmc");

  return Array.from(new Set(riesgos));
}

function getIndustriaDebug(empresa: EmpresaEvaluable): string {
  const source = normalizeDocName(`${empresa.tipoEmpresa ?? ""} ${empresa.giro ?? ""}`);
  if (source.includes("constru")) return "construccion";
  if (source.includes("manufact")) return "manufactura";
  if (source.includes("miner")) return "mineria";
  if (source.includes("logist") || source.includes("transport")) return "logistica_transporte";
  if (source.includes("agro")) return "agroindustria";
  if (source.includes("alimento")) return "alimentos";
  if (source.includes("salud")) return "salud";
  if (source.includes("comerc")) return "comercio";
  return "servicios";
}

function filtrarReglasAplicables(
  empresa: EmpresaEvaluable,
  trabajador?: TrabajadorEvaluable,
): ReglaDocumentalNextPrev[] {
  const industriaEmpresa = getIndustriaDebug(empresa);
  const riesgosDetectados = detectarRiesgosDesdeContexto(empresa, trabajador);

  return REGLAS_DOCUMENTALES.filter((doc) => {
    const aplica = cumpleCondicionesDocumento(
      doc,
      {
        tipoEmpresa: empresa.tipoEmpresa,
        giro: empresa.giro,
        tamanoEmpresa: empresa.tamanoEmpresa,
        cantidadTrabajadores: empresa.cantidadTrabajadores,
      },
      trabajador
        ? {
            cargo: trabajador.cargo,
          }
        : undefined,
    );

    if (DEBUG_REGLAS_DOCUMENTALES) {
      console.debug("[documentacion][reglas]", {
        documento: doc.codigo,
        industriaEmpresa,
        riesgosDetectados,
        resultado: aplica,
        trabajadorId: trabajador?.id ?? null,
      });
    }

    return aplica;
  });
}

function matchesTipoContrato(regla: string | null, trabajador: string | null): boolean {
  if (!regla) return true;
  if (!trabajador) return false;
  return normalizeDocName(regla) === normalizeDocName(trabajador);
}

async function resolverReglasDocumentalesTrabajador(
  empresa: EmpresaEvaluable,
  trabajador: TrabajadorEvaluable,
): Promise<ReglasTrabajadorContexto> {
  const reglasBD = await prisma.reglaDocumentoTrabajador.findMany({
    where: {
      empresaId: empresa.id,
      activo: true,
      tipoDocumento: { activo: true },
    },
    include: {
      tipoDocumento: {
        select: {
          codigo: true,
          nombre: true,
          requiereVencimiento: true,
        },
      },
    },
    orderBy: [{ obligatorio: "desc" }, { createdAt: "asc" }],
  });

  if (reglasBD.length > 0) {
    const aplicables = reglasBD.filter((regla) => {
      if (regla.cargoId && regla.cargoId !== trabajador.cargoId) return false;
      if (regla.areaId && regla.areaId !== trabajador.areaId) return false;
      if (regla.centroTrabajoId && regla.centroTrabajoId !== trabajador.centroTrabajoId) return false;
      if (!matchesTipoContrato(regla.tipoContrato, trabajador.tipoContrato)) return false;
      return true;
    });

    const dedup = new Map<string, ReglaTrabajadorResolvida>();
    for (const regla of aplicables) {
      const key = normalizeDocName(regla.tipoDocumento.codigo);
      if (dedup.has(key)) continue;
      dedup.set(key, {
        codigo: regla.tipoDocumento.codigo,
        nombre: regla.tipoDocumento.nombre,
        requiereVencimiento: regla.tipoDocumento.requiereVencimiento,
        estadoInicial: regla.obligatorio ? "pendiente" : "no_aplica",
      });
    }

    return {
      fuente: "bd",
      reglasEvaluadas: reglasBD.length,
      reglasDesdeBD: reglasBD.length,
      reglasDesdeFallback: 0,
      reglasAplicables: Array.from(dedup.values()),
    };
  }

  // Fallback temporal de compatibilidad para empresas aun no sembradas en BD.
  const fallbackAplicables = filtrarReglasAplicables(empresa, trabajador)
    .filter((regla) => normalizeDocName(regla.entidadAplicable) === "trabajador")
    .map((regla) => ({
      codigo: regla.codigo,
      nombre: regla.nombre,
      requiereVencimiento: Boolean(regla.workflow.frecuenciaVigencia),
      estadoInicial: mapEstadoInicialDocumentoTrabajador(regla.workflow.estadoInicialSugerido),
    }));

  const dedupFallback = new Map<string, ReglaTrabajadorResolvida>();
  for (const regla of fallbackAplicables) {
    const key = normalizeDocName(regla.codigo);
    if (dedupFallback.has(key)) continue;
    dedupFallback.set(key, regla);
  }

  return {
    fuente: "fallback",
    reglasEvaluadas: REGLAS_DOCUMENTALES.filter(
      (regla) => normalizeDocName(regla.entidadAplicable) === "trabajador",
    ).length,
    reglasDesdeBD: 0,
    reglasDesdeFallback: dedupFallback.size,
    reglasAplicables: Array.from(dedupFallback.values()),
  };
}

async function evaluarReglasDocumentalesTrabajadorInternal(
  context: { empresaId: string; usuarioId: string; email: string },
  trabajador: TrabajadorEvaluable,
  reglasContexto: ReglasTrabajadorContexto,
): Promise<EvaluacionReglasTrabajadorResult> {
  const existentes = await prisma.trabajadorDocumento.findMany({
    where: { empresaId: context.empresaId, trabajadorId: trabajador.id, esVigente: true },
    select: { tipo: true, nombre: true },
  });

  const existentesKeys = new Set<string>();
  existentes.forEach((doc) => {
    existentesKeys.add(doc.tipo.toLowerCase());
    existentesKeys.add(doc.nombre.toLowerCase());
  });

  const tiposPendientes = new Map<string, ReglaTrabajadorResolvida>();

  for (const regla of reglasContexto.reglasAplicables) {
    const codigoKey = regla.codigo.toLowerCase();
    const nombreKey = regla.nombre.toLowerCase();
    if (existentesKeys.has(codigoKey) || existentesKeys.has(nombreKey)) continue;

    tiposPendientes.set(codigoKey, regla);
  }

  const documentosGeneradosIds: string[] = [];

  for (const regla of tiposPendientes.values()) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const documento = await tx.trabajadorDocumento.create({
          data: {
            trabajadorId: trabajador.id,
            empresaId: context.empresaId,
            nombre: regla.nombre,
            tipo: regla.codigo,
            categoria: "trabajador",
            estado: regla.estadoInicial,
            version: "1.0",
            esVigente: true,
            versionNumero: 1,
            origen: "sistema",
            tieneVencimiento: regla.requiereVencimiento,
            observaciones: "Generado automáticamente por regla documental.",
            subidoPorId: context.usuarioId,
            creadoPorEmail: context.email,
          },
          select: { id: true, version: true },
        });

        await tx.trabajadorDocumentoHistorial.create({
          data: {
            documentoId: documento.id,
            usuarioId: context.usuarioId,
            accion: "DOCUMENTO_GENERADO_POR_REGLA",
            detalle: "Documento generado automáticamente por regla documental",
            version: documento.version,
          },
        });

        return documento;
      });

      documentosGeneradosIds.push(created.id);
      existentesKeys.add(regla.codigo.toLowerCase());
      existentesKeys.add(regla.nombre.toLowerCase());
    } catch {
      // Evita fallar toda la evaluación si otra ejecución creó el mismo documento en paralelo.
    }
  }

  return {
    trabajadorId: trabajador.id,
    reglasEvaluadas: reglasContexto.reglasEvaluadas,
    reglasAplicables: reglasContexto.reglasAplicables.length,
    pendientesGenerados: documentosGeneradosIds.length,
    documentosGeneradosIds,
    fuenteReglas: reglasContexto.fuente,
    reglasDesdeBD: reglasContexto.reglasDesdeBD,
    reglasDesdeFallback: reglasContexto.reglasDesdeFallback,
  };
}

async function generarDocumentosBaseEmpresa(context: {
  empresaId: string;
  usuarioId: string;
  email: string;
  reglasAplicables: ReglaDocumentalNextPrev[];
}): Promise<number> {
  const [requeridos, existentes] = await Promise.all([
    prisma.documentoRequeridoEmpresa.findMany({
      where: { obligatorio: true, activo: true },
      orderBy: [{ orden: "asc" }, { nombre: "asc" }],
      select: {
        id: true,
        nombre: true,
        categoria: true,
        requiereVencimiento: true,
      },
    }),
    prisma.documentoEmpresa.findMany({
      where: { empresaId: context.empresaId },
      select: { id: true, nombre: true, documentoRequeridoId: true },
    }),
  ]);

  const existentesPorRequerido = new Set<string>(
    existentes.map((doc) => doc.documentoRequeridoId).filter(Boolean) as string[],
  );
  const existentesPorNombre = new Set<string>(existentes.map((doc) => normalizeDocName(doc.nombre)));

  const requeridoPorNombre = new Map(requeridos.map((item) => [normalizeDocName(item.nombre), item]));

  const reglasEmpresa = context.reglasAplicables.filter(
    (regla) => normalizeDocName(regla.entidadAplicable) === "empresa",
  );

  let generated = 0;

  for (const regla of reglasEmpresa) {
    const requerido = requeridoPorNombre.get(normalizeDocName(regla.nombre));
    const target = {
      documentoRequeridoId: requerido?.id ?? null,
      nombre: requerido?.nombre ?? regla.nombre,
      categoria: requerido?.categoria ?? regla.categoria,
      requiereVencimiento: requerido?.requiereVencimiento ?? Boolean(regla.workflow.frecuenciaVigencia),
      estadoInicial: mapEstadoInicialDocumentoEmpresa(regla.workflow.estadoInicialSugerido),
      tipo: regla.codigo,
    };

    const duplicateByReq = Boolean(target.documentoRequeridoId && existentesPorRequerido.has(target.documentoRequeridoId));
    const duplicateByName = existentesPorNombre.has(normalizeDocName(target.nombre));
    if (duplicateByReq || duplicateByName) continue;

    if (target.documentoRequeridoId) {
      const existenteEnBd = await findDocumentoEmpresaCanonicoPorRequerido({
        empresaId: context.empresaId,
        documentoRequeridoId: target.documentoRequeridoId,
      });

      if (existenteEnBd) {
        existentesPorRequerido.add(target.documentoRequeridoId);
        existentesPorNombre.add(normalizeDocName(existenteEnBd.nombre));
        continue;
      }
    }

    try {
      const created = await prisma.documentoEmpresa.create({
        data: {
          empresaId: context.empresaId,
          nombre: target.nombre,
          categoria: target.categoria,
          tipo: target.tipo,
          estado: target.estadoInicial,
          version: "1.0",
          tieneVencimiento: target.requiereVencimiento,
          observaciones: "Generado automáticamente por regla documental.",
          subidoPorId: context.usuarioId,
          creadoPorEmail: context.email,
          documentoRequeridoId: target.documentoRequeridoId,
        },
        select: { id: true, version: true },
      });

      await prisma.documentoEmpresaHistorial.create({
        data: {
          documentoId: created.id,
          usuarioId: context.usuarioId,
          accion: "DOCUMENTO_GENERADO_POR_REGLA",
          detalle: "Documento generado automáticamente por regla documental",
          version: created.version,
        },
      });

      generated += 1;
      if (target.documentoRequeridoId) existentesPorRequerido.add(target.documentoRequeridoId);
      existentesPorNombre.add(normalizeDocName(target.nombre));
    } catch {
      // Evita colisión por concurrencia.
    }
  }

  return generated;
}

export async function evaluarDocumentosPendientesPorEvento(
  input: EvaluacionDocumentosPorEventoInput,
): Promise<EvaluacionDocumentosPorEventoResult> {
  const context = {
    empresaId: input.empresaId,
    usuarioId: input.usuarioId,
    email: input.email,
  };

  if (!context.usuarioId || !context.email) {
    const fallbackUsuario = await prisma.usuario.findFirst({
      where: { empresaId: input.empresaId },
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true },
    });
    if (!fallbackUsuario) {
      return {
        evento: input.evento,
        trabajadorId: input.trabajadorId,
        trabajadoresEvaluados: 0,
        documentosTrabajadorGenerados: 0,
        documentosEmpresaGenerados: 0,
      };
    }
    context.usuarioId = fallbackUsuario.id;
    context.email = fallbackUsuario.email;
  }

  const runtimeContext = {
    empresaId: context.empresaId,
    usuarioId: context.usuarioId,
    email: context.email,
  } as { empresaId: string; usuarioId: string; email: string };

  const result: EvaluacionDocumentosPorEventoResult = {
    evento: input.evento,
    trabajadorId: input.trabajadorId,
    trabajadoresEvaluados: 0,
    documentosTrabajadorGenerados: 0,
    documentosEmpresaGenerados: 0,
  };

  const empresa = await prisma.empresa.findFirst({
    where: { id: input.empresaId },
    select: {
      id: true,
      tipoEmpresa: true,
      giro: true,
      tamanoEmpresa: true,
      cantidadTrabajadores: true,
    },
  });

  if (!empresa) {
    return result;
  }

  if (input.evento === "empresa_actualizada") {
    const reglasAplicables = filtrarReglasAplicables(empresa);
    result.documentosEmpresaGenerados = await generarDocumentosBaseEmpresa({
      ...runtimeContext,
      reglasAplicables,
    });
    return result;
  }

  if (input.evento === "trabajador_creado" || input.evento === "trabajador_actualizado") {
    if (!input.trabajadorId) return result;

    const trabajador = await prisma.trabajador.findFirst({
      where: {
        id: input.trabajadorId,
        empresaId: input.empresaId,
        estado: { not: "inactivo" },
      },
      select: {
        id: true,
        cargoId: true,
        areaId: true,
        centroTrabajoId: true,
        tipoContrato: true,
        cargo: {
          select: {
            perfilSST: true,
            descripcion: true,
          },
        },
      },
    });

    if (!trabajador) return result;

    const reglasContexto = await resolverReglasDocumentalesTrabajador(empresa, trabajador);
    const evalResult = await evaluarReglasDocumentalesTrabajadorInternal(runtimeContext, trabajador, reglasContexto);
    result.trabajadoresEvaluados = 1;
    result.documentosTrabajadorGenerados = evalResult.pendientesGenerados;
    result.fuenteReglasTrabajador = evalResult.fuenteReglas;
    result.reglasTrabajadorDesdeBD = evalResult.reglasDesdeBD;
    result.reglasTrabajadorDesdeFallback = evalResult.reglasDesdeFallback;
    return result;
  }

  const trabajadores = await prisma.trabajador.findMany({
    where: { empresaId: input.empresaId, estado: { not: "inactivo" } },
    select: {
      id: true,
      cargoId: true,
      areaId: true,
      centroTrabajoId: true,
      tipoContrato: true,
      cargo: {
        select: {
          perfilSST: true,
          descripcion: true,
        },
      },
    },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
  });

  for (const trabajador of trabajadores) {
    const reglasContexto = await resolverReglasDocumentalesTrabajador(empresa, trabajador);
    const evalResult = await evaluarReglasDocumentalesTrabajadorInternal(runtimeContext, trabajador, reglasContexto);
    result.documentosTrabajadorGenerados += evalResult.pendientesGenerados;
    result.fuenteReglasTrabajador = evalResult.fuenteReglas;
    result.reglasTrabajadorDesdeBD = (result.reglasTrabajadorDesdeBD ?? 0) + (evalResult.reglasDesdeBD ?? 0);
    result.reglasTrabajadorDesdeFallback = (result.reglasTrabajadorDesdeFallback ?? 0) + (evalResult.reglasDesdeFallback ?? 0);
  }
  result.trabajadoresEvaluados = trabajadores.length;

  if (
    input.evento === "estructura_empresa_actualizada" ||
    input.evento === "reglas_documentales_actualizadas"
  ) {
    const reglasAplicables = filtrarReglasAplicables(empresa);
    result.documentosEmpresaGenerados = await generarDocumentosBaseEmpresa({
      ...runtimeContext,
      reglasAplicables,
    });
  }

  return result;
}

export async function getTiposDocumentoTrabajador(): Promise<TipoDocumento[]> {
  const { empresaId } = await requirePermission("canReadTrabajadores");

  const rows = await prisma.documentoTipoTrabajador.findMany({
    where: { empresaId, activo: true },
    orderBy: [{ nombre: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    categoria: inferCategoria(row.nombre),
    descripcion: row.descripcion ?? "Documento configurable por empresa.",
    requiereVencimiento: row.requiereVencimiento,
    vencimientoMeses: row.vigenciaDias ? Math.max(1, Math.round(row.vigenciaDias / 30)) : null,
    esCritico: row.requiereArchivo || row.requiereVencimiento,
  }));
}

export async function getReglasDocumentoTrabajador(): Promise<ReglaDocumental[]> {
  const { empresaId } = await requirePermission("canReadTrabajadores");

  const rows = await prisma.reglaDocumentoTrabajador.findMany({
    where: { empresaId, activo: true },
    include: {
      tipoDocumento: { select: { id: true } },
      cargo: { select: { nombre: true } },
      area: { select: { nombre: true } },
      centroTrabajo: { select: { nombre: true } },
    },
    orderBy: [{ createdAt: "asc" }],
  });

  return rows.map((row) => ({
    id: row.id,
    nombre: buildReglaNombre(row),
    descripcion: row.obligatorio
      ? "Regla automática obligatoria"
      : "Regla automática opcional",
    condicion: {
      cargo: row.cargo?.nombre,
      area: row.area?.nombre,
      tipoContrato: row.tipoContrato ?? undefined,
      centroTrabajo: row.centroTrabajo?.nombre,
    },
    tiposDocumentoIds: [row.tipoDocumento.id],
    activa: row.activo,
  }));
}

export async function getControlDocumentalTrabajadores(includeInactivos = false): Promise<ControlDocumentalTrabajadoresPayload> {
  const { empresaId } = await requirePermission("canReadTrabajadores");

  const [trabajadoresRows, tiposRows, reglasRows] = await Promise.all([
    prisma.trabajador.findMany({
      where: includeInactivos
        ? { empresaId }
        : {
            empresaId,
            estado: {
              not: "inactivo",
            },
          },
      include: {
        cargo: { select: { nombre: true } },
        area: { select: { nombre: true } },
        centroTrabajo: { select: { nombre: true } },
        documentos: { select: { estado: true } },
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
    prisma.documentoTipoTrabajador.findMany({
      where: { empresaId, activo: true },
      orderBy: [{ nombre: "asc" }],
    }),
    prisma.reglaDocumentoTrabajador.findMany({
      where: { empresaId, activo: true },
      include: {
        tipoDocumento: { select: { id: true } },
        cargo: { select: { nombre: true } },
        area: { select: { nombre: true } },
        centroTrabajo: { select: { nombre: true } },
      },
      orderBy: [{ createdAt: "asc" }],
    }),
  ]);

  const workerIds = trabajadoresRows.map((w) => w.id);
  const docsRows = workerIds.length
    ? await prisma.trabajadorDocumento.findMany({
        where: { empresaId, trabajadorId: { in: workerIds }, esVigente: true },
        select: {
          id: true,
          trabajadorId: true,
          tipo: true,
          estado: true,
          createdAt: true,
          fechaVencimiento: true,
          creadoPorEmail: true,
          observaciones: true,
          archivoNombre: true,
          archivoNombreOriginal: true,
          archivoUrl: true,
          firmadoPor: true,
          firmadoEn: true,
          esVigente: true,
          versionNumero: true,
          origen: true,
          reemplazadoPorId: true,
        },
        orderBy: [{ createdAt: "desc" }],
      })
    : [];

  const documentosInduccionRows = workerIds.length
    ? await prisma.documentoInduccionGenerado.findMany({
        where: { empresaId, trabajadorId: { in: workerIds } },
        select: {
          id: true,
          trabajadorId: true,
          tipo: true,
          titulo: true,
          contenidoMarkdown: true,
          estado: true,
          firmadoPor: true,
          firmadoEn: true,
          createdAt: true,
        },
        orderBy: [{ createdAt: "desc" }],
      })
    : [];

  // Contar versiones históricas por trabajadorId+tipo para mostrar el badge "Historial N versiones"
  const versionCountRows = workerIds.length
    ? await prisma.trabajadorDocumento.groupBy({
        by: ["trabajadorId", "tipo"],
        where: { empresaId, trabajadorId: { in: workerIds } },
        _count: { id: true },
      })
    : [];

  const versionCountMap = new Map<string, number>();
  for (const row of versionCountRows) {
    versionCountMap.set(`${row.trabajadorId}::${row.tipo}`, row._count.id);
  }

  const tipos = tiposRows.map((row) => ({
    id: row.id,
    nombre: row.nombre,
    categoria: inferCategoria(row.nombre),
    descripcion: row.descripcion ?? "Documento configurable por empresa.",
    requiereVencimiento: row.requiereVencimiento,
    vencimientoMeses: row.vigenciaDias ? Math.max(1, Math.round(row.vigenciaDias / 30)) : null,
    esCritico: row.requiereArchivo || row.requiereVencimiento,
  })) satisfies TipoDocumento[];

  const reglas = reglasRows.map((row) => ({
    id: row.id,
    nombre: buildReglaNombre(row),
    descripcion: row.obligatorio ? "Regla automática obligatoria" : "Regla automática opcional",
    condicion: {
      cargo: row.cargo?.nombre,
      area: row.area?.nombre,
      tipoContrato: row.tipoContrato ?? undefined,
      centroTrabajo: row.centroTrabajo?.nombre,
    },
    tiposDocumentoIds: [row.tipoDocumento.id],
    activa: row.activo,
  })) satisfies ReglaDocumental[];

  const tipoByCodigo = new Map(tiposRows.map((t) => [t.codigo.toLowerCase(), t.id]));
  const tipoByNombre = new Map(tiposRows.map((t) => [t.nombre.toLowerCase(), t.id]));

  const documentos = docsRows
    .map((row) => {
      const tipoRaw = row.tipo.toLowerCase();
      const tipoDocumentoId = tipoByCodigo.get(tipoRaw) ?? tipoByNombre.get(tipoRaw);
      if (!tipoDocumentoId) {
        // TODO(Fase 15.5): migrar catálogo legacy en TrabajadorDocumento.tipo para eliminar descartes por no mapeo.
        return null;
      }

      const totalVersiones = versionCountMap.get(`${row.trabajadorId}::${row.tipo}`) ?? 1;

      return {
        id: row.id,
        workerId: row.trabajadorId,
        tipoDocumentoId,
        tipoCodigo: row.tipo,
        estado: mapDocEstado(row.estado),
        createdAt: row.createdAt.toISOString(),
        fechaCarga: row.createdAt.toISOString().slice(0, 10),
        fechaVencimiento: row.fechaVencimiento ? row.fechaVencimiento.toISOString().slice(0, 10) : undefined,
        cargadoPor: row.creadoPorEmail ?? undefined,
        observacion: row.observaciones ?? undefined,
        archivoNombre: row.archivoNombre ?? undefined,
        archivoNombreOriginal: row.archivoNombreOriginal ?? undefined,
        archivoUrl: row.archivoUrl ?? undefined,
        firmadoPor: row.firmadoPor ?? undefined,
        firmadoEn: row.firmadoEn ? row.firmadoEn.toISOString() : undefined,
        esVigente: row.esVigente,
        versionNumero: row.versionNumero,
        origen: (row.origen as "ia" | "manual" | "sistema") ?? "manual",
        reemplazadoPorId: row.reemplazadoPorId ?? undefined,
        totalVersiones,
      } satisfies DocumentoTrabajador;
    })
    .filter(Boolean) as DocumentoTrabajador[];

  const documentosInduccion = documentosInduccionRows
    .map((row) => {
      const codigoControl = mapCodigoDocumentoInduccionACodigoControl(row.tipo);
      if (!codigoControl) return null;

      const tipoDocumentoId = tipoByCodigo.get(codigoControl.toLowerCase());
      if (!tipoDocumentoId) return null;

      return {
        id: row.id,
        workerId: row.trabajadorId,
        tipoDocumentoId,
        tipoCodigo: codigoControl,
        estado: mapDocEstado(row.estado),
        createdAt: row.createdAt.toISOString(),
        fechaCarga: row.createdAt.toISOString().slice(0, 10),
        cargadoPor: row.firmadoPor ?? "Sistema",
        observacion: row.titulo,
        contenidoMarkdown: row.contenidoMarkdown,
        firmadoPor: row.firmadoPor ?? undefined,
        firmadoEn: row.firmadoEn ? row.firmadoEn.toISOString() : undefined,
        origen: "induccion",
        totalVersiones: 1,
      } satisfies DocumentoTrabajador;
    })
    .filter(Boolean) as DocumentoTrabajador[];

  const documentosOrdenados = [...documentos, ...documentosInduccion].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return {
    workers: trabajadoresRows.map(mapWorkerRow),
    tipos,
    reglas,
    documentos: documentosOrdenados,
  };
}

export async function getEmpresaDocumentoMeta(): Promise<EmpresaDocumentoMeta> {
  const { empresaId } = await requirePermission("canReadTrabajadores");

  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      nombre: true,
      razonSocial: true,
      rut: true,
      direccion: true,
      logoUrl: true,
    },
  });

  if (!empresa) {
    throw new Error("Empresa no encontrada");
  }

  return empresa;
}

export async function createTipoDocumentoTrabajador(
  data: TipoDocumentoTrabajadorInput,
): Promise<{ id: string }> {
  const { empresaId } = await requirePermission("canManageDocumentacion");

  const created = await prisma.documentoTipoTrabajador.create({
    data: {
      empresaId,
      nombre: data.nombre.trim(),
      codigo: data.codigo.trim(),
      descripcion: data.descripcion?.trim() || null,
      vigenciaDias: data.vigenciaDias ?? null,
      requiereVencimiento: data.requiereVencimiento,
      requiereArchivo: data.requiereArchivo,
      activo: data.activo ?? true,
    },
    select: { id: true },
  });

  return created;
}

export async function updateTipoDocumentoTrabajador(
  id: string,
  data: Partial<TipoDocumentoTrabajadorInput>,
): Promise<{ id: string }> {
  const { empresaId } = await requirePermission("canManageDocumentacion");

  const updated = await prisma.documentoTipoTrabajador.updateMany({
    where: { id, empresaId },
    data: {
      nombre: data.nombre?.trim(),
      codigo: data.codigo?.trim(),
      descripcion: data.descripcion === undefined ? undefined : data.descripcion?.trim() || null,
      vigenciaDias: data.vigenciaDias,
      requiereVencimiento: data.requiereVencimiento,
      requiereArchivo: data.requiereArchivo,
      activo: data.activo,
    },
  });

  if (updated.count === 0) throw new Error("Tipo de documento no encontrado");
  return { id };
}

async function getTrabajadorDocumentoInEmpresa(empresaId: string, documentoId: string) {
  const documento = await prisma.trabajadorDocumento.findFirst({
    where: { id: documentoId, empresaId },
    select: {
      id: true,
      trabajadorId: true,
      empresaId: true,
      estado: true,
      version: true,
      tipo: true,
      nombre: true,
    },
  });

  if (!documento) {
    throw new Error("Documento de trabajador no encontrado");
  }

  return documento;
}

async function getTrabajadorAndTipoInEmpresa(empresaId: string, trabajadorId: string, tipoDocumentoId: string) {
  const [trabajador, tipoDocumento] = await Promise.all([
    prisma.trabajador.findFirst({
      where: { id: trabajadorId, empresaId },
      select: { id: true },
    }),
    prisma.documentoTipoTrabajador.findFirst({
      where: { id: tipoDocumentoId, empresaId, activo: true },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        requiereVencimiento: true,
      },
    }),
  ]);

  if (!trabajador) {
    throw new Error("Trabajador no encontrado en la empresa actual");
  }

  if (!tipoDocumento) {
    throw new Error("Tipo de documento no encontrado en la empresa actual");
  }

  return { trabajador, tipoDocumento };
}

async function validateDocumentoReferencesInEmpresa(
  empresaId: string,
  documento: { trabajadorId: string; tipo: string; nombre: string },
) {
  const [trabajador, tipoDocumento] = await Promise.all([
    prisma.trabajador.findFirst({
      where: { id: documento.trabajadorId, empresaId },
      select: { id: true },
    }),
    prisma.documentoTipoTrabajador.findFirst({
      where: {
        empresaId,
        OR: [
          { codigo: documento.tipo },
          { nombre: documento.nombre },
        ],
      },
      select: { id: true },
    }),
  ]);

  if (!trabajador) {
    throw new Error("Trabajador no encontrado en la empresa actual");
  }

  if (!tipoDocumento) {
    throw new Error("Tipo de documento no encontrado en la empresa actual");
  }
}

export async function registrarHistorialDocumentoTrabajador(
  documentoId: string,
  data: HistorialDocumentoTrabajadorInput,
): Promise<{ id: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");

  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, documentoId);
  await validateDocumentoReferencesInEmpresa(empresaId, documento);

  const historial = await prisma.trabajadorDocumentoHistorial.create({
    data: {
      documentoId: documento.id,
      usuarioId,
      accion: data.accion,
      detalle: data.detalle?.trim() || null,
      version: data.version?.trim() || null,
      archivoNombre: data.archivoNombre?.trim() || null,
      archivoNombreOriginal: data.archivoNombreOriginal?.trim() || null,
      archivoUrl: data.archivoUrl?.trim() || null,
      archivoTipo: data.archivoTipo?.trim() || null,
      archivoPeso: data.archivoPeso ?? null,
    },
    select: { id: true },
  });

  return historial;
}

export type HistorialEntryView = {
  id: string;
  accion: string;
  detalle: string | null;
  version: string | null;
  archivoNombre: string | null;
  archivoNombreOriginal: string | null;
  archivoUrl: string | null;
  archivoTipo: string | null;
  archivoPeso: number | null;
  usuarioNombre: string | null;
  usuarioEmail: string | null;
  createdAt: string;
};

export async function getHistorialDocumentoTrabajador(
  documentoId: string,
): Promise<HistorialEntryView[]> {
  const { empresaId } = await requirePermission("canReadTrabajadores");
  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, documentoId);

  const entries = await prisma.trabajadorDocumentoHistorial.findMany({
    where: { documentoId: documento.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      accion: true,
      detalle: true,
      version: true,
      archivoNombre: true,
      archivoNombreOriginal: true,
      archivoUrl: true,
      archivoTipo: true,
      archivoPeso: true,
      createdAt: true,
      usuario: {
        select: { nombre: true, email: true },
      },
    },
  });

  return entries.map((e) => ({
    id: e.id,
    accion: e.accion,
    detalle: e.detalle,
    version: e.version,
    archivoNombre: e.archivoNombre,
    archivoNombreOriginal: e.archivoNombreOriginal,
    archivoUrl: e.archivoUrl,
    archivoTipo: e.archivoTipo,
    archivoPeso: e.archivoPeso,
    usuarioNombre: e.usuario?.nombre ?? null,
    usuarioEmail: e.usuario?.email ?? null,
    createdAt: e.createdAt.toISOString(),
  }));
}

// ─── Versionado: tipos y acciones ────────────────────────────────────────────

export type VersionDocumentoView = {
  id: string;
  versionNumero: number;
  esVigente: boolean;
  estado: string;
  origen: string;
  fechaCarga: string;
  fechaVencimiento: string | null;
  cargadoPor: string | null;
  motivoReemplazo: string | null;
  observacion: string | null;
  contenidoMarkdown: string | null;
  archivoNombre: string | null;
  archivoNombreOriginal: string | null;
  archivoUrl: string | null;
  firmadoPor: string | null;
  firmadoEn: string | null;
  historial: HistorialEntryView[];
};

/**
 * Devuelve todas las versiones (vigente + históricas) de un tipo de documento
 * para un trabajador específico, ordenadas de la más reciente a la más antigua.
 */
export async function getVersionesTrabajadorDocumento(
  trabajadorId: string,
  tipoDocumentoCodigo: string,
): Promise<VersionDocumentoView[]> {
  const { empresaId } = await requirePermission("canReadTrabajadores");

  const rows = await prisma.trabajadorDocumento.findMany({
    where: { trabajadorId, empresaId, tipo: tipoDocumentoCodigo },
    orderBy: [{ versionNumero: "desc" }],
    select: {
      id: true,
      versionNumero: true,
      esVigente: true,
      estado: true,
      origen: true,
      createdAt: true,
      fechaVencimiento: true,
      creadoPorEmail: true,
      motivoReemplazo: true,
      observaciones: true,
      archivoNombre: true,
      archivoNombreOriginal: true,
      archivoUrl: true,
      firmadoPor: true,
      firmadoEn: true,
      historial: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          accion: true,
          detalle: true,
          version: true,
          origen: true,
          archivoNombre: true,
          archivoNombreOriginal: true,
          archivoUrl: true,
          archivoTipo: true,
          archivoPeso: true,
          createdAt: true,
          usuario: { select: { nombre: true, email: true } },
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    versionNumero: row.versionNumero,
    esVigente: row.esVigente,
    estado: mapDocEstado(row.estado),
    origen: row.origen ?? "manual",
    fechaCarga: row.createdAt.toISOString().slice(0, 10),
    fechaVencimiento: row.fechaVencimiento ? row.fechaVencimiento.toISOString().slice(0, 10) : null,
    cargadoPor: row.creadoPorEmail ?? null,
    motivoReemplazo: row.motivoReemplazo ?? null,
    observacion: row.observaciones ?? null,
    contenidoMarkdown: null,
    archivoNombre: row.archivoNombre ?? null,
    archivoNombreOriginal: row.archivoNombreOriginal ?? null,
    archivoUrl: row.archivoUrl ?? null,
    firmadoPor: row.firmadoPor ?? null,
    firmadoEn: row.firmadoEn ? row.firmadoEn.toISOString() : null,
    historial: row.historial.map((e) => ({
      id: e.id,
      accion: e.accion,
      detalle: e.detalle,
      version: e.version,
      archivoNombre: e.archivoNombre,
      archivoNombreOriginal: e.archivoNombreOriginal,
      archivoUrl: e.archivoUrl,
      archivoTipo: e.archivoTipo,
      archivoPeso: e.archivoPeso,
      usuarioNombre: e.usuario?.nombre ?? null,
      usuarioEmail: e.usuario?.email ?? null,
      createdAt: e.createdAt.toISOString(),
    })),
  }));
}

export async function createTrabajadorDocumento(
  data: CreateTrabajadorDocumentoInput,
): Promise<{ id: string }> {
  const { empresaId, usuarioId, email } = await requirePermission("canManageDocumentacion");

  const estado = normalizeEstadoForStorage(data.estado);
  const { tipoDocumento } = await getTrabajadorAndTipoInEmpresa(
    empresaId,
    data.trabajadorId,
    data.tipoDocumentoId,
  );

  // Buscar documento vigente previo para el mismo trabajador+tipo
  const vigente = await prisma.trabajadorDocumento.findFirst({
    where: {
      trabajadorId: data.trabajadorId,
      tipo: tipoDocumento.codigo,
      esVigente: true,
    },
    select: { id: true, versionNumero: true, observaciones: true },
  });

  const nuevaVersion = (vigente?.versionNumero ?? 0) + 1;

  return prisma.$transaction(async (tx) => {
    // Archivar versión vigente si existe
    if (vigente) {
      await tx.trabajadorDocumento.update({
        where: { id: vigente.id },
        data: { esVigente: false, motivoReemplazo: data.motivoReemplazo?.trim() || "Reemplazado por nueva versión" },
      });
      await tx.trabajadorDocumentoHistorial.create({
        data: {
          documentoId: vigente.id,
          usuarioId,
          accion: "DOCUMENTO_ARCHIVADO",
          detalle: `Versión ${vigente.versionNumero ?? 1} archivada — reemplazada por versión ${nuevaVersion}`,
          version: String(vigente.versionNumero ?? 1),
          contenidoSnapshot: vigente.observaciones,
          origen: "sistema",
        },
      });
    }

    const created = await tx.trabajadorDocumento.create({
      data: {
        trabajadorId: data.trabajadorId,
        empresaId,
        nombre: tipoDocumento.nombre,
        tipo: tipoDocumento.codigo,
        categoria: "trabajador",
        estado,
        version: `${nuevaVersion}.0`,
        esVigente: true,
        versionNumero: nuevaVersion,
        origen: "manual",
        archivoNombre: data.archivoNombre?.trim() || null,
        archivoNombreOriginal: data.archivoNombreOriginal?.trim() || null,
        archivoUrl: null,
        archivoTipo: data.archivoTipo?.trim() || null,
        archivoPeso: data.archivoPeso ?? null,
        tieneVencimiento: tipoDocumento.requiereVencimiento,
        fechaEmision: parseOptionalDate(data.fechaEmision) ?? null,
        fechaVencimiento: parseOptionalDate(data.fechaVencimiento) ?? null,
        observaciones: data.observaciones?.trim() || null,
        subidoPorId: usuarioId,
        creadoPorEmail: data.cargadoPor?.trim() || email,
      },
      select: { id: true, version: true },
    });

    await tx.trabajadorDocumentoHistorial.create({
      data: {
        documentoId: created.id,
        usuarioId,
        accion: vigente ? "DOCUMENTO_REEMPLAZADO" : "DOCUMENTO_CREADO",
        detalle: vigente
          ? `Documento reemplazado por nueva carga manual (versión ${nuevaVersion})`
          : `Documento creado con estado ${estado}`,
        version: created.version,
        origen: "manual",
        archivoNombre: data.archivoNombre?.trim() || null,
        archivoNombreOriginal: data.archivoNombreOriginal?.trim() || null,
        archivoTipo: data.archivoTipo?.trim() || null,
        archivoPeso: data.archivoPeso ?? null,
      },
    });

    return { id: created.id };
  });
}

/**
 * Guarda el contenido textual (generado o editado por el usuario) de un documento.
 * Usa el campo `observaciones` como almacén del contenido IA hasta que exista
 * una columna dedicada. Registra historial "CONTENIDO_EDITADO".
 */
export async function guardarContenidoIADocumento(
  documentoId: string,
  contenido: string,
): Promise<{ id: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");
  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, documentoId);
  await validateDocumentoReferencesInEmpresa(empresaId, documento);

  const updated = await prisma.trabajadorDocumento.update({
    where: { id: documento.id },
    data: {
      observaciones: contenido.trim() || null,
      subidoPorId: usuarioId,
    },
    select: { id: true, version: true },
  });

  await prisma.trabajadorDocumentoHistorial.create({
    data: {
      documentoId: updated.id,
      usuarioId,
      accion: "CONTENIDO_EDITADO",
      detalle: "Documento editado por usuario",
      version: updated.version,
    },
  });

  return { id: updated.id };
}

/**
 * Genera contenido IA para un documento y persiste el contenido + cambio de estado.
 * Usado cuando el usuario hace click en "Generar con IA":
 * - Si el documento existe con placeholder, actualiza contenido y cambia estado a en_revision
 * - Si el documento es nuevo, crea el documento con contenido real
 *
 * @param documentoId - ID del documento a generar (puede ser null para crear nuevo)
 * @param generatedContent - Contenido generado por la plantilla IA
 * @param trabajadorId - ID del trabajador (para crear nuevo documento)
 * @param tipoDocumentoId - ID del tipo de documento (para crear nuevo)
 * @returns ID del documento generado
 */
export async function generarContenidoIATrabajadorDocumento(
  documentoId: string | null,
  generatedContent: string,
  trabajadorId?: string,
  tipoDocumentoId?: string,
): Promise<{ id: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");

  if (documentoId) {
    const documento = await getTrabajadorDocumentoInEmpresa(empresaId, documentoId);
    await validateDocumentoReferencesInEmpresa(empresaId, documento);

    // Si el documento ya tiene contenido real (no es placeholder/pendiente inicial),
    // verificar si debe crear nueva versión o actualizar en lugar
    const docActual = await prisma.trabajadorDocumento.findUnique({
      where: { id: documento.id },
      select: {
        id: true,
        version: true,
        versionNumero: true,
        observaciones: true,
        estado: true,
        esVigente: true,
        origen: true,
      },
    });

    if (!docActual) throw new Error("Documento no encontrado");

    const tieneContenidoReal = Boolean(
      docActual.observaciones && docActual.observaciones.trim().length > 50,
    );
    const estadoActual = docActual.estado ?? "";
    const esEstadoFinal = ["validado", "enviado_firma", "firmado"].includes(estadoActual);

    if (tieneContenidoReal && esEstadoFinal) {
      // Crear nueva versión IA — documento previo queda archivado
      const nuevaVersion = (docActual.versionNumero ?? 1) + 1;

      return prisma.$transaction(async (tx) => {
        await tx.trabajadorDocumento.update({
          where: { id: docActual.id },
          data: {
            esVigente: false,
            motivoReemplazo: "Nueva versión generada con IA",
          },
        });
        await tx.trabajadorDocumentoHistorial.create({
          data: {
            documentoId: docActual.id,
            usuarioId,
            accion: "DOCUMENTO_ARCHIVADO",
            detalle: `Versión ${docActual.versionNumero ?? 1} archivada — nueva versión IA creada`,
            version: docActual.version,
            contenidoSnapshot: docActual.observaciones,
            origen: "sistema",
          },
        });

        const newDoc = await tx.trabajadorDocumento.create({
          data: {
            trabajadorId: documento.trabajadorId,
            empresaId,
            nombre: documento.nombre,
            tipo: documento.tipo,
            categoria: "trabajador",
            estado: "en_revision",
            version: `${nuevaVersion}.0`,
            esVigente: true,
            versionNumero: nuevaVersion,
            origen: "ia",
            observaciones: generatedContent.trim() || null,
            subidoPorId: usuarioId,
            tieneVencimiento: false,
          },
          select: { id: true, version: true },
        });

        await tx.trabajadorDocumentoHistorial.create({
          data: {
            documentoId: newDoc.id,
            usuarioId,
            accion: "CONTENIDO_GENERADO_IA",
            detalle: `Nueva versión ${nuevaVersion} generada con IA`,
            version: newDoc.version,
            contenidoSnapshot: generatedContent.trim() || null,
            origen: "ia",
          },
        });

        return { id: newDoc.id };
      });
    }

    // Actualizar en lugar (doc en borrador o primera generación)
    const updated = await prisma.trabajadorDocumento.update({
      where: { id: documento.id },
      data: {
        observaciones: generatedContent.trim() || null,
        estado: "en_revision",
        origen: "ia",
        subidoPorId: usuarioId,
      },
      select: { id: true, version: true, versionNumero: true },
    });

    await prisma.trabajadorDocumentoHistorial.create({
      data: {
        documentoId: updated.id,
        usuarioId,
        accion: "CONTENIDO_GENERADO_IA",
        detalle: `Contenido generado/actualizado con IA (versión ${updated.versionNumero ?? 1})`,
        version: updated.version,
        contenidoSnapshot: generatedContent.trim() || null,
        origen: "ia",
      },
    });

    return { id: updated.id };
  }

  // Crear nuevo documento con contenido IA
  if (!trabajadorId || !tipoDocumentoId) {
    throw new Error(
      "Para crear nuevo documento se requieren trabajadorId y tipoDocumentoId",
    );
  }

  const { tipoDocumento: tipo } = await getTrabajadorAndTipoInEmpresa(empresaId, trabajadorId, tipoDocumentoId);

  // Verificar si ya existe vigente para este tipo
  const vigenteExistente = await prisma.trabajadorDocumento.findFirst({
    where: { trabajadorId, tipo: tipo.codigo, esVigente: true },
    select: { id: true, versionNumero: true, observaciones: true, version: true },
  });

  if (vigenteExistente) {
    // Archivar vigente y crear nueva versión IA
    const nuevaVersion = (vigenteExistente.versionNumero ?? 1) + 1;
    return prisma.$transaction(async (tx) => {
      await tx.trabajadorDocumento.update({
        where: { id: vigenteExistente.id },
        data: { esVigente: false, motivoReemplazo: "Nueva versión generada con IA" },
      });
      await tx.trabajadorDocumentoHistorial.create({
        data: {
          documentoId: vigenteExistente.id,
          usuarioId,
          accion: "DOCUMENTO_ARCHIVADO",
          detalle: `Versión ${vigenteExistente.versionNumero ?? 1} archivada — nueva versión IA`,
          version: vigenteExistente.version,
          contenidoSnapshot: vigenteExistente.observaciones,
          origen: "sistema",
        },
      });
      const newDoc = await tx.trabajadorDocumento.create({
        data: {
          trabajadorId,
          empresaId,
          nombre: tipo.nombre,
          tipo: tipo.codigo,
          categoria: "trabajador",
          estado: "en_revision",
          version: `${nuevaVersion}.0`,
          esVigente: true,
          versionNumero: nuevaVersion,
          origen: "ia",
          observaciones: generatedContent,
          subidoPorId: usuarioId,
          tieneVencimiento: tipo.requiereVencimiento,
        },
        select: { id: true, version: true },
      });
      await tx.trabajadorDocumentoHistorial.create({
        data: {
          documentoId: newDoc.id,
          usuarioId,
          accion: "CONTENIDO_GENERADO_IA",
          detalle: `Nueva versión ${nuevaVersion} generada con IA`,
          version: newDoc.version,
          contenidoSnapshot: generatedContent,
          origen: "ia",
        },
      });
      return { id: newDoc.id };
    });
  }

  // Primer documento: crear directo con origen IA
  const { email } = await requirePermission("canManageDocumentacion");
  const created = await prisma.$transaction(async (tx) => {
    const doc = await tx.trabajadorDocumento.create({
      data: {
        trabajadorId,
        empresaId,
        nombre: tipo.nombre,
        tipo: tipo.codigo,
        categoria: "trabajador",
        estado: "en_revision",
        version: "1.0",
        esVigente: true,
        versionNumero: 1,
        origen: "ia",
        observaciones: generatedContent,
        subidoPorId: usuarioId,
        creadoPorEmail: email,
        tieneVencimiento: tipo.requiereVencimiento,
      },
      select: { id: true, version: true },
    });
    await tx.trabajadorDocumentoHistorial.create({
      data: {
        documentoId: doc.id,
        usuarioId,
        accion: "CONTENIDO_GENERADO_IA",
        detalle: "Contenido generado automáticamente con IA (versión 1)",
        version: doc.version,
        contenidoSnapshot: generatedContent,
        origen: "ia",
      },
    });
    return doc;
  });

  return { id: created.id };
}

export async function generarCampoIATrabajadorDocumento(
  documentoId: string,
  campoId: string,
): Promise<{ id: string; campoId: string; contenido: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");
  const contexto = await getContextoGeneracionCampoIA(empresaId, documentoId);
  let contenido = "";

  if (contexto.estructura.plantillaCodigo === "IRL") {
    const estructura = {
      ...contexto.estructura,
      campos: { ...contexto.estructura.campos },
    } as Extract<DocumentoEstructurado, { plantillaCodigo: "IRL" }>;
    const key = campoId as keyof DocumentoIrlCampos;
    if (!(key in estructura.campos)) {
      throw new Error(`Campo IRL no soportado: ${campoId}`);
    }
    (estructura.campos as Record<string, unknown>)[key] = generarValorCampoIrl(key, contexto);
    contenido = serializarDocumentoEstructurado(estructura);
  } else {
    const estructura = {
      ...contexto.estructura,
      campos: { ...contexto.estructura.campos },
    } as Extract<DocumentoEstructurado, { plantillaCodigo: "EPP" }>;
    const key = campoId as keyof DocumentoEppCampos;
    if (!(key in estructura.campos)) {
      throw new Error(`Campo EPP no soportado: ${campoId}`);
    }
    (estructura.campos as Record<string, unknown>)[key] = generarValorCampoEpp(key, contexto);
    contenido = serializarDocumentoEstructurado(estructura);
  }

  const updated = await prisma.trabajadorDocumento.update({
    where: { id: contexto.documentoId },
    data: {
      observaciones: contenido,
      estado: "en_revision",
      subidoPorId: usuarioId,
    },
    select: { id: true, version: true },
  });

  await prisma.trabajadorDocumentoHistorial.create({
    data: {
      documentoId: updated.id,
      usuarioId,
      accion: "CONTENIDO_EDITADO",
      detalle: `Campo ${campoId} generado con IA por contexto`,
      version: updated.version,
    },
  });

  return { id: updated.id, campoId, contenido };
}

export async function regenerarSeccionIATrabajadorDocumento(
  documentoId: string,
  seccionId: string,
): Promise<{ id: string; seccionId: string; contenido: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");
  const contexto = await getContextoGeneracionCampoIA(empresaId, documentoId);

  const fields = fieldsBySection(contexto.estructura, seccionId);
  if (!fields.length) {
    throw new Error(`Sección no soportada: ${seccionId}`);
  }

  let contenido = "";

  if (contexto.estructura.plantillaCodigo === "IRL") {
    const estructura = {
      ...contexto.estructura,
      campos: { ...contexto.estructura.campos },
    } as Extract<DocumentoEstructurado, { plantillaCodigo: "IRL" }>;
    for (const field of fields) {
      const key = field as keyof DocumentoIrlCampos;
      (estructura.campos as Record<string, unknown>)[key] = generarValorCampoIrl(key, contexto);
    }
    contenido = serializarDocumentoEstructurado(estructura);
  } else {
    const estructura = {
      ...contexto.estructura,
      campos: { ...contexto.estructura.campos },
    } as Extract<DocumentoEstructurado, { plantillaCodigo: "EPP" }>;
    for (const field of fields) {
      const key = field as keyof DocumentoEppCampos;
      (estructura.campos as Record<string, unknown>)[key] = generarValorCampoEpp(key, contexto);
    }
    contenido = serializarDocumentoEstructurado(estructura);
  }

  const updated = await prisma.trabajadorDocumento.update({
    where: { id: contexto.documentoId },
    data: {
      observaciones: contenido,
      estado: "en_revision",
      subidoPorId: usuarioId,
    },
    select: { id: true, version: true },
  });

  await prisma.trabajadorDocumentoHistorial.create({
    data: {
      documentoId: updated.id,
      usuarioId,
      accion: "CONTENIDO_EDITADO",
      detalle: `Sección ${seccionId} regenerada con IA por contexto`,
      version: updated.version,
    },
  });

  return { id: updated.id, seccionId, contenido };
}

export async function updateTrabajadorDocumento(
  data: UpdateTrabajadorDocumentoInput,
): Promise<{ id: string }> {
  const { empresaId, usuarioId, email } = await requirePermission("canManageDocumentacion");

  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, data.documentoId);
  await validateDocumentoReferencesInEmpresa(empresaId, documento);

  const normalizedEstado = data.estado ? normalizeEstadoForStorage(data.estado) : undefined;
  const updated = await prisma.trabajadorDocumento.update({
    where: { id: documento.id },
    data: {
      estado: normalizedEstado,
      fechaEmision: parseOptionalDate(data.fechaEmision),
      fechaVencimiento: parseOptionalDate(data.fechaVencimiento),
      observaciones: data.observaciones === undefined ? undefined : data.observaciones?.trim() || null,
      creadoPorEmail: data.cargadoPor === undefined ? undefined : data.cargadoPor?.trim() || email,
      archivoNombre: data.archivoNombre === undefined ? undefined : data.archivoNombre?.trim() || null,
      archivoNombreOriginal:
        data.archivoNombreOriginal === undefined
          ? undefined
          : data.archivoNombreOriginal?.trim() || null,
      // TODO(Fase 15.8): actualizar archivoUrl cuando exista integración de storage.
      archivoTipo: data.archivoTipo === undefined ? undefined : data.archivoTipo?.trim() || null,
      archivoPeso: data.archivoPeso,
      subidoPorId: usuarioId,
    },
    select: { id: true, estado: true, version: true },
  });

  if (normalizedEstado && normalizedEstado !== documento.estado) {
    await prisma.trabajadorDocumentoHistorial.create({
      data: {
        documentoId: updated.id,
        usuarioId,
        accion: "ESTADO_ACTUALIZADO",
        detalle: `Estado ${documento.estado} -> ${normalizedEstado}`,
        version: updated.version,
      },
    });
  }

  return { id: updated.id };
}

export async function cambiarEstadoTrabajadorDocumento(
  documentoId: string,
  estado: EstadoDocumentoTrabajadorInput,
  detalle?: string,
): Promise<{ id: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");
  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, documentoId);
  await validateDocumentoReferencesInEmpresa(empresaId, documento);
  const normalizedEstado = normalizeEstadoForStorage(estado);

  const updated = await prisma.trabajadorDocumento.update({
    where: { id: documento.id },
    data: {
      estado: normalizedEstado,
      subidoPorId: usuarioId,
    },
    select: { id: true, version: true },
  });

  await prisma.trabajadorDocumentoHistorial.create({
    data: {
      documentoId: updated.id,
      usuarioId,
      accion: "ESTADO_ACTUALIZADO",
      detalle: detalle?.trim() || `Estado ${documento.estado} -> ${normalizedEstado}`,
      version: updated.version,
    },
  });

  return { id: updated.id };
}

export async function validarTrabajadorDocumento(
  documentoId: string,
  detalle?: string,
): Promise<{ id: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");
  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, documentoId);
  await validateDocumentoReferencesInEmpresa(empresaId, documento);

  const estadoActual = (documento.estado ?? "").trim().toLowerCase();
  if (estadoActual !== "en_revision") {
    throw new Error("Solo se puede validar un documento en revisión");
  }

  const updated = await prisma.trabajadorDocumento.update({
    where: { id: documento.id },
    data: {
      estado: "validado",
      subidoPorId: usuarioId,
    },
    select: { id: true, version: true },
  });

  await prisma.trabajadorDocumentoHistorial.create({
    data: {
      documentoId: updated.id,
      usuarioId,
      accion: "DOCUMENTO_VALIDADO",
      detalle: detalle?.trim() || "Documento validado",
      version: updated.version,
    },
  });

  // Aplica firma automática del prevencionista si tiene perfil activo
  const perfilFirma = await prisma.firmaUsuarioPerfil.findFirst({
    where: { empresaId, usuarioId, activa: true },
    select: { nombre: true, rut: true },
  });

  if (perfilFirma) {
    const token = generarTokenFirma();
    const timestamp = new Date().toISOString();
    const hash = generarHashFirma({
      documentoId: updated.id,
      token,
      timestamp,
      firmante: perfilFirma.nombre,
      rut: perfilFirma.rut,
    });
    await prisma.firmaDocumento.create({
      data: {
        empresaId,
        usuarioPrevencionistaId: usuarioId,
        documentoId: updated.id,
        documentoOrigen: "documento_trabajador",
        token,
        tipoFirmante: "prevencionista",
        tipoFirma: "automatica",
        estado: "firmado",
        tituloDocumento: documento.nombre,
        descripcion: "Firma automática del prevencionista al validar el documento",
        nombreFirmante: perfilFirma.nombre,
        rutFirmante: perfilFirma.rut,
        tokenTrazabilidad: token,
        hashDocumento: hash,
        aceptoLectura: true,
        firmadoAt: new Date(),
      },
    });
  }

  return { id: updated.id };
}

export async function enviarTrabajadorDocumentoAFirma(
  documentoId: string,
  detalle?: string,
): Promise<{ id: string; linkFirma: string }> {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");
  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, documentoId);
  await validateDocumentoReferencesInEmpresa(empresaId, documento);

  const estadoActual = (documento.estado ?? "").trim().toLowerCase();
  if (estadoActual !== "validado") {
    throw new Error("Solo se puede enviar a firma un documento validado");
  }

  const trabajador = await prisma.trabajador.findFirst({
    where: { id: documento.trabajadorId, empresaId },
    select: {
      id: true,
      nombres: true,
      apellidos: true,
      rut: true,
      email: true,
    },
  });

  if (!trabajador) {
    throw new Error("Trabajador no encontrado para enviar documento a firma");
  }

  const firma = await crearFirmaDocumento({
    empresaId,
    trabajadorId: trabajador.id,
    documentoId: documento.id,
    documentoOrigen: "documento_trabajador",
    tituloDocumento: documento.nombre,
    descripcion: detalle?.trim() || `Firma del documento ${documento.nombre}`,
    nombreFirmante: `${trabajador.nombres} ${trabajador.apellidos}`.trim(),
    emailFirmante: trabajador.email,
    rutFirmante: trabajador.rut,
  });

  await prisma.trabajadorDocumento.update({
    where: { id: documento.id },
    data: { subidoPorId: usuarioId },
  });

  return { id: documento.id, linkFirma: firma.link };
}

export async function firmarTrabajadorDocumento(
  documentoId: string,
): Promise<{ id: string; firmadoPor: string; firmadoEn: Date }> {
  const { empresaId, usuarioId } = await requirePermission("canManageDocumentacion");
  const documento = await getTrabajadorDocumentoInEmpresa(empresaId, documentoId);
  await validateDocumentoReferencesInEmpresa(empresaId, documento);

  const estadoActual = (documento.estado ?? "").trim().toLowerCase();
  if (estadoActual !== "enviado_firma") {
    throw new Error("Solo se puede firmar un documento enviado a firma");
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { nombre: true, email: true },
  });

  const firmadoEn = new Date();
  const firmadoPor = usuario?.nombre ?? usuario?.email ?? usuarioId;

  // Marcar documentos anteriores del mismo tipo como no vigentes
  await prisma.trabajadorDocumento.updateMany({
    where: {
      trabajadorId: documento.trabajadorId,
      tipo: documento.tipo,
      id: { not: documento.id },
      esVigente: true,
    },
    data: {
      esVigente: false,
      reemplazadoPorId: documento.id,
      motivoReemplazo: "Reemplazado por documento firmado",
    },
  });

  const updated = await prisma.trabajadorDocumento.update({
    where: { id: documento.id },
    data: {
      estado: "firmado",
      firmado: true,
      firmadoPor,
      firmadoEn,
      esVigente: true,
      subidoPorId: usuarioId,
    },
    select: { id: true, version: true },
  });

  await prisma.trabajadorDocumentoHistorial.create({
    data: {
      documentoId: updated.id,
      usuarioId,
      accion: "DOCUMENTO_FIRMADO",
      detalle: `Documento firmado por ${firmadoPor}`,
      version: updated.version,
    },
  });

  return { id: updated.id, firmadoPor, firmadoEn };
}

export async function evaluarReglasDocumentalesTrabajador(
  trabajadorId: string,
): Promise<EvaluacionReglasTrabajadorResult> {
  const { empresaId, usuarioId, email } = await requirePermission("canManageDocumentacion");

  const [empresa, trabajador] = await Promise.all([
    prisma.empresa.findFirst({
      where: { id: empresaId },
      select: {
        id: true,
        tipoEmpresa: true,
        giro: true,
        tamanoEmpresa: true,
        cantidadTrabajadores: true,
      },
    }),
    prisma.trabajador.findFirst({
      where: { id: trabajadorId, empresaId },
      select: {
        id: true,
        estado: true,
        cargoId: true,
        areaId: true,
        centroTrabajoId: true,
        tipoContrato: true,
        cargo: {
          select: {
            perfilSST: true,
            descripcion: true,
          },
        },
      },
    }),
  ]);

  if (!empresa) {
    throw new Error("Empresa no encontrada");
  }

  if (!trabajador) {
    throw new Error("Trabajador no encontrado en la empresa actual");
  }

  if (trabajador.estado === "inactivo") {
    return {
      trabajadorId,
      reglasEvaluadas: REGLAS_DOCUMENTALES.length,
      reglasAplicables: 0,
      pendientesGenerados: 0,
      documentosGeneradosIds: [],
    };
  }

  const reglasContexto = await resolverReglasDocumentalesTrabajador(empresa, trabajador);

  return evaluarReglasDocumentalesTrabajadorInternal(
    { empresaId, usuarioId, email },
    trabajador,
    reglasContexto,
  );
}

export async function evaluarReglasDocumentalesEmpresa(): Promise<EvaluacionReglasEmpresaResult> {
  const { empresaId, usuarioId, email } = await requirePermission("canManageDocumentacion");

  const [empresa, trabajadores] = await Promise.all([
    prisma.empresa.findFirst({
      where: { id: empresaId },
      select: {
        id: true,
        tipoEmpresa: true,
        giro: true,
        tamanoEmpresa: true,
        cantidadTrabajadores: true,
      },
    }),
    prisma.trabajador.findMany({
      where: { empresaId, estado: { not: "inactivo" } },
      select: {
        id: true,
        cargoId: true,
        areaId: true,
        centroTrabajoId: true,
        tipoContrato: true,
        cargo: {
          select: {
            perfilSST: true,
            descripcion: true,
          },
        },
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
  ]);

  if (!empresa) {
    throw new Error("Empresa no encontrada");
  }

  const detalles: EvaluacionReglasTrabajadorResult[] = [];

  for (const trabajador of trabajadores) {
    const reglasContexto = await resolverReglasDocumentalesTrabajador(empresa, trabajador);
    const result = await evaluarReglasDocumentalesTrabajadorInternal(
      { empresaId, usuarioId, email },
      trabajador,
      reglasContexto,
    );
    detalles.push(result);
  }

  const pendientesGenerados = detalles.reduce((sum, item) => sum + item.pendientesGenerados, 0);

  return {
    trabajadoresEvaluados: detalles.length,
    trabajadoresConPendientesNuevos: detalles.filter((item) => item.pendientesGenerados > 0).length,
    pendientesGenerados,
    detalles,
  };
}

export async function createReglaDocumentoTrabajador(
  data: ReglaDocumentoTrabajadorInput,
): Promise<{ id: string }> {
  const { empresaId } = await requirePermission("canManageDocumentacion");

  const created = await prisma.reglaDocumentoTrabajador.create({
    data: {
      empresaId,
      tipoDocumentoId: data.tipoDocumentoId,
      cargoId: data.cargoId ?? null,
      areaId: data.areaId ?? null,
      centroTrabajoId: data.centroTrabajoId ?? null,
      tipoContrato: data.tipoContrato ?? null,
      obligatorio: data.obligatorio,
      activo: data.activo ?? true,
    },
    select: { id: true },
  });

  return created;
}

export async function updateReglaDocumentoTrabajador(
  id: string,
  data: Partial<ReglaDocumentoTrabajadorInput>,
): Promise<{ id: string }> {
  const { empresaId } = await requirePermission("canManageDocumentacion");

  const updated = await prisma.reglaDocumentoTrabajador.updateMany({
    where: { id, empresaId },
    data: {
      tipoDocumentoId: data.tipoDocumentoId,
      cargoId: data.cargoId === undefined ? undefined : data.cargoId ?? null,
      areaId: data.areaId === undefined ? undefined : data.areaId ?? null,
      centroTrabajoId: data.centroTrabajoId === undefined ? undefined : data.centroTrabajoId ?? null,
      tipoContrato: data.tipoContrato === undefined ? undefined : data.tipoContrato ?? null,
      obligatorio: data.obligatorio,
      activo: data.activo,
    },
  });

  if (updated.count === 0) throw new Error("Regla documental no encontrada");
  return { id };
}
