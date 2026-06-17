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
    codigo: "IRL_RIESGOS",
    nombre: "Informacion de Riesgos Laborales (IRL)",
    descripcion: "Acta de informacion sobre riesgos laborales firmada por el trabajador.",
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
    "ODI_OBLIGACION_INFORMAR",
    "IRL_RIESGOS",
    "ENTREGA_EPP",
    "CAPACITACION_INICIAL",
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
  };
}
