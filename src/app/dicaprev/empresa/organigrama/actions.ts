"use server";

import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/server/auth/permissions";
import type { Worker, WorkerContrato, WorkerEstado } from "@/components/trabajadores-v2/types";
import type { EmpresaArea, EmpresaCargo, CargoTipoUI } from "@/lib/empresa/empresa-store";
import type { CentroAdmin, DotacionCargo, TrabajadorAsociado } from "@/lib/centros/centros-store";

const EMPRESA_ID = "1b3f9c7e-8c2a-4f6a-9d1e-123456789abc";

type HierarchyTrabajador = {
  id: string;
  nombres: string;
  apellidos: string;
  estado: string;
  centroTrabajoId: string | null;
  areaId: string | null;
  cargoId: string | null;
  posicionDotacionId: string | null;
};

type HierarchyCargo = {
  id: string;
  nombre: string;
  dotacionRequerida: number;
  trabajadores: HierarchyTrabajador[];
};

type HierarchyArea = {
  id: string;
  nombre: string;
  cargos: HierarchyCargo[];
};

type HierarchyCentro = {
  id: string;
  nombre: string;
  areas: HierarchyArea[];
};

type HierarchyEmpresa = {
  id: string;
  nombre: string;
  centros: HierarchyCentro[];
};

export type OrganigramaEmpresaData = {
  empresaNombre: string;
  areas: EmpresaArea[];
  cargos: EmpresaCargo[];
  centros: CentroAdmin[];
  trabajadores: Worker[];
  posicionesDotacion: {
    id: string;
    centroTrabajoId: string;
    cargoId: string;
    cantidad: number;
    estado: string;
    esCritica: boolean;
  }[];
  hierarchy: HierarchyEmpresa;
};

function normalizeText(value?: string | null) {
  return (value ?? "").trim();
}

function mapEstado(estado?: string | null): WorkerEstado {
  const v = normalizeText(estado).toLowerCase();
  if (v === "inactivo" || v === "baja") return "Inactivo";
  if (v === "licencia") return "Licencia";
  if (v === "vacaciones") return "Vacaciones";
  return "Activo";
}

function mapContrato(contrato?: string | null): WorkerContrato {
  const v = normalizeText(contrato).toLowerCase();
  if (v === "plazo fijo") return "Plazo Fijo";
  if (v === "por obra") return "Por Obra";
  if (v === "part time") return "Part Time";
  return "Indefinido";
}

function mapCargoTipo(nombre: string): CargoTipoUI {
  const v = nombre.toLowerCase();
  if (v.includes("supervisor") || v.includes("jefe")) return "Supervisión";
  if (v.includes("admin")) return "Administración";
  if (v.includes("prevencion")) return "Prevención";
  if (v.includes("tecnico") || v.includes("maestro")) return "Técnico";
  return "Operativo";
}

function makeCode(prefix: string, value: string) {
  return `${prefix}-${value.slice(0, 4).toUpperCase()}`;
}

export async function getOrganigramaEmpresa(): Promise<OrganigramaEmpresaData> {
  await requirePermission("canReadOrganigrama");

  const empresa =
    (await prisma.empresa.findFirst({ where: { id: EMPRESA_ID } })) ||
    (await prisma.empresa.findFirst({ orderBy: { createdAt: "asc" } }));

  if (!empresa) {
    throw new Error("No existe empresa configurada para construir organigrama");
  }

  const [centrosRows, areasRows, cargosRows, trabajadoresRows, posicionesRows] = await Promise.all([
    prisma.centroTrabajo.findMany({
      where: { empresaId: empresa.id },
      orderBy: { nombre: "asc" },
    }),
    prisma.area.findMany({
      where: { empresaId: empresa.id },
      orderBy: { nombre: "asc" },
    }),
    prisma.cargo.findMany({
      where: { empresaId: empresa.id },
      orderBy: { nombre: "asc" },
    }),
    prisma.trabajador.findMany({
      where: { empresaId: empresa.id },
      include: {
        centroTrabajo: { select: { id: true, nombre: true } },
        area: { select: { id: true, nombre: true } },
        cargo: { select: { id: true, nombre: true } },
      },
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    }),
    prisma.posicionDotacion.findMany({
      where: { empresaId: empresa.id },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const areaById = new Map(areasRows.map((row) => [row.id, row]));
  const cargoById = new Map(cargosRows.map((row) => [row.id, row]));
  const centroById = new Map(centrosRows.map((row) => [row.id, row]));

  const trabajadores: Worker[] = trabajadoresRows.map((row) => {
    const nombres = normalizeText(row.nombres);
    const apellidos = normalizeText(row.apellidos);
    const cargo = row.cargo?.nombre ?? "Sin cargo";
    const area = row.area?.nombre ?? "Sin área";
    const centro = row.centroTrabajo?.nombre ?? "Sin centro";

    return {
      id: row.id,
      nombre: nombres || "Sin nombre",
      apellido: apellidos || "Sin apellido",
      rut: row.rut ?? "",
      cargo,
      area,
      centroTrabajo: centro,
      email: row.email ?? "",
      telefono: row.telefono ?? "",
      estado: mapEstado(row.estado),
      fechaIngreso: row.fechaIngreso ? row.fechaIngreso.toISOString().slice(0, 10) : "2024-01-01",
      fechaNacimiento: "1990-01-01",
      tipoContrato: mapContrato(row.tipoContrato),
      documentosPendientes: 0,
      capacitacionesPendientes: 0,
      dotacionId: row.posicionDotacionId ?? undefined,
    };
  });

  const posicionesDotacion = posicionesRows.map((row) => ({
    id: row.id,
    centroTrabajoId: row.centroTrabajoId,
    cargoId: row.cargoId,
    cantidad: row.cantidad,
    estado: row.estado,
    esCritica: row.esCritica,
  }));

  const areas: EmpresaArea[] = areasRows.map((row) => {
    const areaWorkers = trabajadoresRows.filter((w) => w.areaId === row.id);
    const areaCargos = cargosRows.filter((c) => c.areaId === row.id);
    const areaCargoIds = new Set(areaCargos.map((c) => c.id));
    const areaPosiciones = posicionesRows.filter((p) => areaCargoIds.has(p.cargoId));

    const dotacionTotal = areaPosiciones.reduce((acc, p) => acc + p.cantidad, 0);
    const asignadosTotal = areaWorkers.length;
    const vacantesTotal = Math.max(dotacionTotal - asignadosTotal, 0);
    const responsable = areaWorkers[0];

    return {
      id: row.id,
      nombre: row.nombre,
      codigo: makeCode("ARE", row.id),
      descripcion: row.descripcion ?? "",
      responsable: responsable ? `${responsable.nombres} ${responsable.apellidos}`.trim() : "Sin responsable",
      correoResponsable: responsable?.email ?? "",
      telefonoResponsable: responsable?.telefono ?? "",
      cargosNombres: areaCargos.map((c) => c.nombre),
      cargosIds: areaCargos.map((c) => c.id),
      dotacionTotal,
      asignadosTotal,
      vacantesTotal,
      trabajadores: asignadosTotal,
      cumplimientoPromedio: 100,
      tieneDs44: areaCargos.some((c) => c.esCritico),
      estado: row.estado === "inactiva" ? "inactiva" : "activa",
      creadaEl: row.createdAt.toISOString().slice(0, 10),
    };
  });

  const cargos: EmpresaCargo[] = cargosRows.map((row) => {
    const cargoWorkers = trabajadoresRows.filter((w) => w.cargoId === row.id);
    const centrosSet = new Set(
      cargoWorkers.map((w) => {
        const centro = w.centroTrabajoId ? centroById.get(w.centroTrabajoId) : null;
        return centro?.nombre ?? "Sin centro";
      }),
    );

    const areaName = row.areaId ? areaById.get(row.areaId)?.nombre ?? "Sin área" : "Sin área";

    return {
      id: row.id,
      nombre: row.nombre,
      codigo: makeCode("CAR", row.id),
      areaId: row.areaId ?? "",
      areaNombre: areaName,
      tipo: mapCargoTipo(row.nombre),
      descripcion: row.descripcion ?? "",
      perfilSST: row.perfilSST ?? "",
      riesgosClave: row.perfilSST ?? row.descripcion ?? "",
      requiereDS44: row.esCritico,
      documentosBase: [],
      capacitacionesBase: [],
      trabajadores: cargoWorkers.length,
      centros: Array.from(centrosSet),
      estado: row.estado === "inactivo" ? "inactivo" : "activo",
      creadoEl: row.createdAt.toISOString().slice(0, 10),
    };
  });

  const centros: CentroAdmin[] = centrosRows.map((row) => {
    const centroWorkers = trabajadoresRows.filter((w) => w.centroTrabajoId === row.id);
    const centroPosiciones = posicionesRows.filter((p) => p.centroTrabajoId === row.id);

    const dotacionPorCargoMap = new Map<string, DotacionCargo>();
    for (const pos of centroPosiciones) {
      const cargo = cargoById.get(pos.cargoId);
      const cargoNombre = cargo?.nombre ?? "Sin cargo";
      const asignados = trabajadoresRows.filter(
        (w) =>
          w.centroTrabajoId === row.id &&
          (w.posicionDotacionId === pos.id || w.cargoId === pos.cargoId),
      ).length;

      const prev = dotacionPorCargoMap.get(cargoNombre);
      if (prev) {
        prev.dotacion += pos.cantidad;
        prev.asignados += asignados;
      } else {
        dotacionPorCargoMap.set(cargoNombre, {
          cargo: cargoNombre,
          dotacion: pos.cantidad,
          asignados,
        });
      }
    }

    const dotacionPorCargo = Array.from(dotacionPorCargoMap.values());
    const trabajadoresAsociados: TrabajadorAsociado[] = centroWorkers.map((w) => ({
      id: w.id,
      nombre: `${w.nombres} ${w.apellidos}`.trim(),
      cargo: w.cargoId ? cargoById.get(w.cargoId)?.nombre ?? "Sin cargo" : "Sin cargo",
      estadoDoc: "al-dia",
    }));

    const dotacionTotal = dotacionPorCargo.reduce((acc, item) => acc + item.dotacion, 0);

    return {
      id: row.id,
      nombre: row.nombre,
      codigo: makeCode("CTR", row.id),
      tipo: (row.tipo as CentroAdmin["tipo"]) || "Otro",
      direccion: row.direccion,
      ciudad: row.comuna,
      estado: (row.estado as CentroAdmin["estado"]) || "activo",
      aplicaDs44:
        centroPosiciones.some((p) => p.esCritica) ||
        centroPosiciones.some((p) => cargoById.get(p.cargoId)?.esCritico),
      observaciones: "",
      trabajadoresTotal: centroWorkers.length,
      dotacionTotal,
      cumplimientoDocPct: 100,
      capacitacionesPendientes: 0,
      vencimientos: 0,
      alertasDs44: centroPosiciones.filter((p) => p.esCritica).length,
      dotacionPorCargo,
      trabajadoresAsociados,
      creadoEl: row.createdAt.toISOString().slice(0, 10),
    };
  });

  const hierarchy: HierarchyEmpresa = {
    id: empresa.id,
    nombre: empresa.nombre,
    centros: centrosRows.map((centro) => {
      const centroWorkers = trabajadoresRows.filter((w) => w.centroTrabajoId === centro.id);
      const areaIds = new Set(
        centroWorkers.map((w) => w.areaId ?? "sin-area"),
      );

      const areasHierarchy: HierarchyArea[] = Array.from(areaIds).map((areaId) => {
        const areaWorkers = centroWorkers.filter((w) => (w.areaId ?? "sin-area") === areaId);
        const areaEntity = areaById.get(areaId);

        const cargoIds = new Set(areaWorkers.map((w) => w.cargoId ?? "sin-cargo"));
        const cargosHierarchy: HierarchyCargo[] = Array.from(cargoIds).map((cargoId) => {
          const cargoWorkers = areaWorkers.filter((w) => (w.cargoId ?? "sin-cargo") === cargoId);
          const cargoEntity = cargoById.get(cargoId);

          const dotacionRequerida = posicionesRows
            .filter((p) => p.centroTrabajoId === centro.id && p.cargoId === cargoId)
            .reduce((acc, p) => acc + p.cantidad, 0);

          return {
            id: cargoId,
            nombre: cargoEntity?.nombre ?? "Sin cargo",
            dotacionRequerida,
            trabajadores: cargoWorkers.map((w) => ({
              id: w.id,
              nombres: w.nombres,
              apellidos: w.apellidos,
              estado: w.estado,
              centroTrabajoId: w.centroTrabajoId,
              areaId: w.areaId,
              cargoId: w.cargoId,
              posicionDotacionId: w.posicionDotacionId,
            })),
          };
        });

        return {
          id: areaId,
          nombre: areaEntity?.nombre ?? "Sin área",
          cargos: cargosHierarchy,
        };
      });

      return {
        id: centro.id,
        nombre: centro.nombre,
        areas: areasHierarchy,
      };
    }),
  };

  return {
    empresaNombre: empresa.nombre,
    areas,
    cargos,
    centros,
    trabajadores,
    posicionesDotacion,
    hierarchy,
  };
}
