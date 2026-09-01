import { prisma } from "@/lib/prisma";
import { COMPANY_MODULES } from "@/lib/company-modules";
import { AREA_REFS, CARGO_REFS } from "@/lib/empresa/domain";

type BootstrapOptions = {
  forceDefaultCenterName?: string;
};

export type BootstrapEmpresaOperativaResult = {
  empresaId: string;
  modulosCreados: number;
  areasCreadas: number;
  cargosCreados: number;
  centrosCreados: number;
  documentosEmpresaCreados: number;
  documentosTrabajadorCreados: number;
  reglasTrabajadorCreadas: number;
  documentosVehiculoCreados: number;
  capacitacionesCreadas: number;
  municipalidadesCreadas: number;
};

type AreaTemplate = {
  nombre: string;
  descripcion?: string;
};

type CargoTemplate = {
  nombre: string;
  areaNombre: string;
  descripcion?: string;
  esCritico?: boolean;
};

type WorkerDocTemplate = {
  codigo: string;
  nombre: string;
  descripcion: string;
  requiereVencimiento: boolean;
  vigenciaDias: number | null;
};

type VehicleDocTemplate = {
  codigo: string;
  nombre: string;
  descripcion: string;
  requiereVencimiento: boolean;
  vigenciaDias: number | null;
};

const DOCUMENTOS_EMPRESA_BASE = [
  { nombre: "RUT Empresa", categoria: "empresa", descripcion: "Documento base de identificacion tributaria.", requiereVencimiento: false },
  { nombre: "Certificado Vigencia Empresa", categoria: "empresa", descripcion: "Vigencia legal de la empresa.", requiereVencimiento: true },
  { nombre: "Certificado Mutual", categoria: "empresa", descripcion: "Certificado de mutualidad vigente.", requiereVencimiento: true },
  { nombre: "RIOHS", categoria: "sst", descripcion: "Reglamento interno de orden, higiene y seguridad.", requiereVencimiento: false },
  { nombre: "Matriz IPER / MIPER", categoria: "sst", descripcion: "Matriz de identificacion de peligros y evaluacion de riesgos.", requiereVencimiento: true },
] as const;

const DOCUMENTOS_TRABAJADOR_BASE: WorkerDocTemplate[] = [
  {
    codigo: "CONTRATO_TRABAJO",
    nombre: "Contrato de trabajo",
    descripcion: "Contrato laboral firmado por trabajador y empleador.",
    requiereVencimiento: false,
    vigenciaDias: null,
  },
  {
    codigo: "CEDULA_IDENTIDAD",
    nombre: "Cedula de identidad",
    descripcion: "Copia vigente de la cedula de identidad del trabajador.",
    requiereVencimiento: true,
    vigenciaDias: 3650,
  },
  {
    codigo: "REGLAMENTO_INTERNO_RECIBIDO",
    nombre: "Reglamento interno recibido",
    descripcion: "Constancia de recepcion del reglamento interno.",
    requiereVencimiento: false,
    vigenciaDias: null,
  },
  {
    codigo: "IRL_RIESGOS",
    nombre: "IRL - Informe de Riesgos Laborales",
    descripcion: "Constancia de informacion de riesgos y medidas preventivas laborales.",
    requiereVencimiento: false,
    vigenciaDias: null,
  },
  {
    codigo: "ENTREGA_EPP",
    nombre: "Entrega de EPP",
    descripcion: "Registro de entrega de elementos de proteccion personal.",
    requiereVencimiento: false,
    vigenciaDias: null,
  },
  {
    codigo: "CAPACITACION_INICIAL",
    nombre: "Registro de capacitacion inicial",
    descripcion: "Evidencia de induccion o capacitacion inicial.",
    requiereVencimiento: true,
    vigenciaDias: 365,
  },
  {
    codigo: "EXAMEN_OCUPACIONAL",
    nombre: "Examen ocupacional",
    descripcion: "Examen ocupacional o preocupacional vigente.",
    requiereVencimiento: true,
    vigenciaDias: 365,
  },
  {
    codigo: "LICENCIA_HABILITANTE",
    nombre: "Licencia o certificacion habilitante",
    descripcion: "Licencia o certificacion vigente segun cargo.",
    requiereVencimiento: true,
    vigenciaDias: 1825,
  },
  {
    codigo: "PTS_TRABAJO_SEGURO",
    nombre: "Procedimiento de Trabajo Seguro (PTS)",
    descripcion: "Procedimiento de trabajo seguro aplicable al cargo o actividad.",
    requiereVencimiento: false,
    vigenciaDias: null,
  },
  {
    codigo: "COBERTURA_ACCIDENTE",
    nombre: "Cobertura en caso de accidentes",
    descripcion: "Informacion sobre cobertura y procedimiento ante accidentes laborales.",
    requiereVencimiento: false,
    vigenciaDias: null,
  },
  {
    codigo: "HDS_SUSTANCIAS",
    nombre: "Hojas de Datos de Seguridad (HDS)",
    descripcion: "Fichas de seguridad de productos y sustancias a manipular.",
    requiereVencimiento: false,
    vigenciaDias: null,
  },
];

const DOCUMENTOS_VEHICULO_BASE: VehicleDocTemplate[] = [
  {
    codigo: "PERMISO_CIRCULACION",
    nombre: "Permiso de circulacion",
    descripcion: "Permiso de circulacion vigente.",
    requiereVencimiento: true,
    vigenciaDias: 365,
  },
  {
    codigo: "SOAP",
    nombre: "SOAP vigente",
    descripcion: "Seguro obligatorio vigente.",
    requiereVencimiento: true,
    vigenciaDias: 365,
  },
  {
    codigo: "REVISION_TECNICA",
    nombre: "Revision tecnica",
    descripcion: "Revision tecnica vigente.",
    requiereVencimiento: true,
    vigenciaDias: 365,
  },
  {
    codigo: "GASES",
    nombre: "Certificado de gases",
    descripcion: "Certificado de gases vigente.",
    requiereVencimiento: true,
    vigenciaDias: 365,
  },
  {
    codigo: "PADRON",
    nombre: "Padron del vehiculo",
    descripcion: "Padron vigente del vehiculo.",
    requiereVencimiento: false,
    vigenciaDias: null,
  },
  {
    codigo: "CHECKLIST_VEHICULO",
    nombre: "Check list vehiculo",
    descripcion: "Checklist operativo del vehiculo.",
    requiereVencimiento: true,
    vigenciaDias: 365,
  },
  {
    codigo: "SEGURO_VEHICULO",
    nombre: "Seguro vehiculo",
    descripcion: "Poliza de seguro del vehiculo.",
    requiereVencimiento: true,
    vigenciaDias: 365,
  },
  {
    codigo: "CERTIFICADO_MANTENCION",
    nombre: "Certificado de mantencion",
    descripcion: "Registro de mantencion vigente.",
    requiereVencimiento: true,
    vigenciaDias: 365,
  },
  {
    codigo: "AUTORIZACION_USO_VEHICULO",
    nombre: "Autorizacion uso vehiculo",
    descripcion: "Autorizacion de uso del vehiculo.",
    requiereVencimiento: false,
    vigenciaDias: null,
  },
];

function getEstructuraTemplates(input: { tipoEmpresa: string | null; giro: string | null }): {
  areas: AreaTemplate[];
  cargos: CargoTemplate[];
} {
  const hasRubro = Boolean(input.tipoEmpresa?.trim() || input.giro?.trim());

  if (!hasRubro) {
    return {
      areas: [{ nombre: "Administracion", descripcion: "Gestion administrativa base" }],
      cargos: [{ nombre: "Administrativo", areaNombre: "Administracion", descripcion: "Rol administrativo base" }],
    };
  }

  const areaMap = new Map<string, AreaTemplate>();
  for (const area of AREA_REFS) {
    areaMap.set(area.nombre, { nombre: area.nombre });
  }

  const cargos: CargoTemplate[] = CARGO_REFS.map((cargo) => {
    const area = AREA_REFS.find((a) => a.id === cargo.areaId);
    const areaNombre = area?.nombre ?? "Administracion";
    return {
      nombre: cargo.nombre,
      areaNombre,
      descripcion: cargo.riesgos,
      esCritico: cargo.requiereDS44,
    };
  });

  if (!areaMap.has("Administracion")) {
    areaMap.set("Administracion", { nombre: "Administracion", descripcion: "Gestion administrativa base" });
  }

  return {
    areas: Array.from(areaMap.values()),
    cargos,
  };
}

async function ensureEmpresaModules(empresaId: string): Promise<number> {
  let created = 0;
  for (const modulo of COMPANY_MODULES) {
    const existing = await prisma.empresaModulo.findUnique({
      where: { empresaId_modulo: { empresaId, modulo } },
      select: { id: true },
    });

    if (!existing) {
      await prisma.empresaModulo.create({
        data: {
          empresaId,
          modulo,
          activo: true,
        },
      });
      created += 1;
    }
  }
  return created;
}

async function ensureCentroDefault(empresaId: string, centerName: string): Promise<number> {
  const centrosCount = await prisma.centroTrabajo.count({ where: { empresaId } });
  if (centrosCount > 0) {
    return 0;
  }

  await prisma.centroTrabajo.create({
    data: {
      empresaId,
      nombre: centerName,
      tipo: "Casa Matriz",
      estado: "activo",
      direccion: "Por definir",
      comuna: "Por definir",
      region: "Por definir",
    },
  });

  return 1;
}

async function ensureAreas(empresaId: string, areas: AreaTemplate[]): Promise<{ created: number; areaByName: Map<string, string> }> {
  let created = 0;
  const areaByName = new Map<string, string>();

  for (const area of areas) {
    const existing = await prisma.area.findFirst({
      where: { empresaId, nombre: area.nombre },
      select: { id: true },
    });

    if (existing) {
      areaByName.set(area.nombre, existing.id);
      continue;
    }

    const newArea = await prisma.area.create({
      data: {
        empresaId,
        nombre: area.nombre,
        descripcion: area.descripcion ?? null,
        estado: "activa",
      },
      select: { id: true },
    });

    areaByName.set(area.nombre, newArea.id);
    created += 1;
  }

  return { created, areaByName };
}

async function ensureCargos(empresaId: string, cargos: CargoTemplate[], areaByName: Map<string, string>): Promise<number> {
  let created = 0;

  for (const cargo of cargos) {
    const existing = await prisma.cargo.findFirst({
      where: { empresaId, nombre: cargo.nombre },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    await prisma.cargo.create({
      data: {
        empresaId,
        nombre: cargo.nombre,
        areaId: areaByName.get(cargo.areaNombre) ?? null,
        descripcion: cargo.descripcion ?? null,
        estado: "activo",
        esCritico: Boolean(cargo.esCritico),
      },
    });
    created += 1;
  }

  return created;
}

async function ensureDocumentoRequeridoEmpresaBase(): Promise<number> {
  let created = 0;

  for (let i = 0; i < DOCUMENTOS_EMPRESA_BASE.length; i += 1) {
    const doc = DOCUMENTOS_EMPRESA_BASE[i];
    const existing = await prisma.documentoRequeridoEmpresa.findUnique({
      where: { nombre_categoria: { nombre: doc.nombre, categoria: doc.categoria } },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    await prisma.documentoRequeridoEmpresa.create({
      data: {
        nombre: doc.nombre,
        categoria: doc.categoria,
        descripcion: doc.descripcion,
        obligatorio: true,
        requiereVencimiento: doc.requiereVencimiento,
        periodicidadMeses: doc.requiereVencimiento ? 12 : null,
        orden: i + 1,
        activo: true,
      },
    });

    created += 1;
  }

  return created;
}

async function ensureDocumentoTipoTrabajadorBase(empresaId: string): Promise<number> {
  let created = 0;

  for (const doc of DOCUMENTOS_TRABAJADOR_BASE) {
    const existing = await prisma.documentoTipoTrabajador.findUnique({
      where: { empresaId_codigo: { empresaId, codigo: doc.codigo } },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    await prisma.documentoTipoTrabajador.create({
      data: {
        empresaId,
        codigo: doc.codigo,
        nombre: doc.nombre,
        descripcion: doc.descripcion,
        vigenciaDias: doc.vigenciaDias,
        requiereVencimiento: doc.requiereVencimiento,
        requiereArchivo: true,
        activo: true,
      },
    });

    created += 1;
  }

  return created;
}

async function ensureDocumentoTipoVehiculoBase(empresaId: string): Promise<number> {
  let created = 0;

  for (const doc of DOCUMENTOS_VEHICULO_BASE) {
    const existing = await prisma.documentoTipoVehiculo.findUnique({
      where: { empresaId_codigo: { empresaId, codigo: doc.codigo } },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    await prisma.documentoTipoVehiculo.create({
      data: {
        empresaId,
        codigo: doc.codigo,
        nombre: doc.nombre,
        descripcion: doc.descripcion,
        vigenciaDias: doc.vigenciaDias,
        requiereVencimiento: doc.requiereVencimiento,
        requiereArchivo: true,
        activo: true,
      },
    });

    created += 1;
  }

  return created;
}

async function ensureReglaDocumentoTrabajadorBase(empresaId: string): Promise<number> {
  const codigosBase = [
    "CONTRATO_TRABAJO",
    "CEDULA_IDENTIDAD",
    "REGLAMENTO_INTERNO_RECIBIDO",
    "IRL_RIESGOS",
    "ENTREGA_EPP",
    "CAPACITACION_INICIAL",
    "PTS_TRABAJO_SEGURO",
    "COBERTURA_ACCIDENTE",
    "HDS_SUSTANCIAS",
  ];

  const tipos = await prisma.documentoTipoTrabajador.findMany({
    where: { empresaId, codigo: { in: codigosBase } },
    select: { id: true, codigo: true },
  });

  let created = 0;
  for (const tipo of tipos) {
    const existing = await prisma.reglaDocumentoTrabajador.findFirst({
      where: {
        empresaId,
        tipoDocumentoId: tipo.id,
        cargoId: null,
        areaId: null,
        centroTrabajoId: null,
        tipoContrato: null,
      },
      select: { id: true },
    });

    if (existing) {
      continue;
    }

    await prisma.reglaDocumentoTrabajador.create({
      data: {
        empresaId,
        tipoDocumentoId: tipo.id,
        cargoId: null,
        areaId: null,
        centroTrabajoId: null,
        tipoContrato: null,
        obligatorio: true,
        activo: true,
      },
    });

    created += 1;
  }

  return created;
}

const CAPACITACIONES_CATALOGO_BASE = [
  {
    codigo: "CAP-IRL-001",
    nombre: "Informacion de Riesgos Laborales (IRL)",
    descripcion: "Capacitacion sobre riesgos especificos del puesto de trabajo e IRL.",
    categoria: "sst",
    modalidad: "presencial",
    duracionHoras: 2,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
  },
  {
    codigo: "CAP-EPP-001",
    nombre: "Uso correcto de EPP",
    descripcion: "Uso, mantenimiento y reposicion de elementos de proteccion personal.",
    categoria: "sst",
    modalidad: "presencial",
    duracionHoras: 2,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
  },
  {
    codigo: "CAP-MMC-001",
    nombre: "Manejo manual de cargas",
    descripcion: "Tecnicas seguras para manipulacion manual de cargas y prevencion de lesiones.",
    categoria: "sst",
    modalidad: "presencial",
    duracionHoras: 2,
    vigenciaMeses: 24,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
  },
  {
    codigo: "CAP-ALT-001",
    nombre: "Prevencion de caidas",
    descripcion: "Controles preventivos para trabajo en altura y prevencion de caidas a distinto nivel.",
    categoria: "sst",
    modalidad: "presencial",
    duracionHoras: 4,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
  },
  {
    codigo: "CAP-EME-001",
    nombre: "Emergencias y evacuacion",
    descripcion: "Procedimientos de respuesta ante emergencia y rutas de evacuacion.",
    categoria: "emergencia",
    modalidad: "presencial",
    duracionHoras: 2,
    vigenciaMeses: 12,
    requiereEvaluacion: false,
    requiereFirma: true,
    generaCertificado: false,
    esObligatoria: true,
  },
  {
    codigo: "CAP-EXT-001",
    nombre: "Uso de extintores",
    descripcion: "Uso practico y seguro de extintores segun tipo de fuego.",
    categoria: "emergencia",
    modalidad: "presencial",
    duracionHoras: 2,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
  },
  {
    codigo: "CAP-PAU-001",
    nombre: "Primeros auxilios basicos",
    descripcion: "Conceptos y tecnicas basicas de primeros auxilios en faena.",
    categoria: "salud_ocupacional",
    modalidad: "presencial",
    duracionHoras: 4,
    vigenciaMeses: 24,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: false,
  },
  {
    codigo: "CAP-IND-001",
    nombre: "Induccion trabajador nuevo",
    descripcion: "Induccion inicial para nuevos ingresos sobre normas, riesgos y procedimientos.",
    categoria: "induccion",
    modalidad: "presencial",
    duracionHoras: 4,
    vigenciaMeses: 12,
    requiereEvaluacion: true,
    requiereFirma: true,
    generaCertificado: true,
    esObligatoria: true,
  },
  {
    codigo: "CAP-RPS-001",
    nombre: "Riesgos psicosociales",
    descripcion: "Sensibilizacion sobre factores de riesgo psicosocial y medidas preventivas.",
    categoria: "psicosocial",
    modalidad: "online",
    duracionHoras: 2,
    vigenciaMeses: null as number | null,
    requiereEvaluacion: false,
    requiereFirma: false,
    generaCertificado: false,
    esObligatoria: false,
  },
  {
    codigo: "CAP-OYA-001",
    nombre: "Orden y aseo en el lugar de trabajo",
    descripcion: "Buenas practicas de orden, limpieza y estandar 5S en areas de trabajo.",
    categoria: "sst",
    modalidad: "online",
    duracionHoras: 1,
    vigenciaMeses: null as number | null,
    requiereEvaluacion: false,
    requiereFirma: false,
    generaCertificado: false,
    esObligatoria: true,
  },
] as const;

async function ensureCapacitacionesBase(empresaId: string): Promise<number> {
  let created = 0;
  for (const cap of CAPACITACIONES_CATALOGO_BASE) {
    const existing = await prisma.capacitacion.findUnique({
      where: { empresaId_codigo: { empresaId, codigo: cap.codigo } },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.capacitacion.create({
      data: {
        empresaId,
        codigo: cap.codigo,
        nombre: cap.nombre,
        descripcion: cap.descripcion,
        categoria: cap.categoria,
        modalidad: cap.modalidad,
        duracionHoras: cap.duracionHoras,
        vigenciaMeses: cap.vigenciaMeses ?? null,
        requiereEvaluacion: cap.requiereEvaluacion,
        requiereFirma: cap.requiereFirma,
        generaCertificado: cap.generaCertificado,
        esObligatoria: cap.esObligatoria,
        activa: true,
      },
    });
    created += 1;
  }
  return created;
}

async function ensureMunicipalidadesBase(empresaId: string): Promise<number> {
  const empresasConCatalogo = await prisma.empresa.findMany({
    where: { id: { not: empresaId } },
    select: {
      id: true,
      _count: { select: { permisoOrganismos: true } },
    },
  });
  const fuente = empresasConCatalogo.find((empresa) => empresa._count.permisoOrganismos >= 300);
  if (!fuente) return 0;

  const municipalidades = await prisma.permisoOrganismo.findMany({
    where: { empresaId: fuente.id },
    select: {
      codigoCUT: true,
      region: true,
      provincia: true,
      comuna: true,
      nombre: true,
      nombreOficial: true,
      unidad: true,
      tipoTramite: true,
      descripcionTramite: true,
      modalidad: true,
      plazoDias: true,
      tipoPlazo: true,
      direccion: true,
      horario: true,
      urlTramite: true,
      urlInstitucional: true,
      documentosRequeridos: true,
      costo: true,
      fuente: true,
      fechaVerificacion: true,
      observaciones: true,
      activo: true,
    },
  });

  const result = await prisma.permisoOrganismo.createMany({
    data: municipalidades.map((municipalidad) => ({
      ...municipalidad,
      empresaId,
      tipo: "MUNICIPAL",
    })),
    skipDuplicates: true,
  });

  return result.count;
}

export async function bootstrapEmpresaOperativa(
  empresaId: string,
  opciones: BootstrapOptions = {},
): Promise<BootstrapEmpresaOperativaResult> {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    select: {
      id: true,
      tipoEmpresa: true,
      giro: true,
    },
  });

  if (!empresa) {
    throw new Error("Empresa no encontrada para bootstrap operativo");
  }

  const { areas, cargos } = getEstructuraTemplates({
    tipoEmpresa: empresa.tipoEmpresa,
    giro: empresa.giro,
  });

  const modulosCreados = await ensureEmpresaModules(empresa.id);
  const centrosCreados = await ensureCentroDefault(
    empresa.id,
    opciones.forceDefaultCenterName ?? "Casa matriz / Principal",
  );
  const { created: areasCreadas, areaByName } = await ensureAreas(empresa.id, areas);
  const cargosCreados = await ensureCargos(empresa.id, cargos, areaByName);
  const documentosEmpresaCreados = await ensureDocumentoRequeridoEmpresaBase();
  const documentosTrabajadorCreados = await ensureDocumentoTipoTrabajadorBase(empresa.id);
  const reglasTrabajadorCreadas = await ensureReglaDocumentoTrabajadorBase(empresa.id);
  const documentosVehiculoCreados = await ensureDocumentoTipoVehiculoBase(empresa.id);
  const capacitacionesCreadas = await ensureCapacitacionesBase(empresa.id);
  const municipalidadesCreadas = await ensureMunicipalidadesBase(empresa.id);

  return {
    empresaId: empresa.id,
    modulosCreados,
    areasCreadas,
    cargosCreados,
    centrosCreados,
    documentosEmpresaCreados,
    documentosTrabajadorCreados,
    reglasTrabajadorCreadas,
    documentosVehiculoCreados,
    capacitacionesCreadas,
    municipalidadesCreadas,
  };
}
