"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronDown,
  Users,
  Network,
  Building2,
  Layers,
  UserCircle,
  ShieldAlert,
  Download,
  X,
  MapPin,
  Briefcase,
  AlertTriangle,
  FileText,
  GraduationCap,
  Mail,
  Phone,
  ChevronsUpDown,
  ChevronsDownUp,
} from "lucide-react";
import { empresaStore, type EmpresaArea, type EmpresaCargo } from "@/lib/empresa/empresa-store";
import {
  getCentros,
  subscribe as subscribeCentros,
  type CentroAdmin,
} from "@/lib/centros/centros-store";
import {
  MOCK_WORKERS,
  type Worker,
  type WorkerEstado,
  getInitials,
  antiguedad,
} from "@/components/trabajadores-v2/types";

// ─── Domain types ─────────────────────────────────────────────────────── //

type NodeType = "empresa" | "area" | "centro" | "cargo" | "trabajador";
type ViewMode = "areas" | "centros";

interface OrgNode {
  id: string;
  type: NodeType;
  label: string;
  subtitle?: string;
  workerCount: number;
  ds44: boolean;
  dotacionRequerida?: number;
  children: OrgNode[];
  areaData?: EmpresaArea;
  centroData?: CentroAdmin;
  cargoData?: EmpresaCargo;
  workerData?: Worker;
}

// ─── Visual configuration ─────────────────────────────────────────────── //

interface NodeCfg {
  icon: React.ElementType;
  iconBg: string;
  iconText: string;
  cardBg: string;
  cardBorder: string;
  labelColor: string;
  subtitleColor: string;
  badgeBg: string;
  badgeText: string;
}

const NODE_CONFIG: Record<NodeType, NodeCfg> = {
  empresa: {
    icon: Building2,
    iconBg: "bg-slate-800",
    iconText: "text-white",
    cardBg: "bg-slate-900",
    cardBorder: "border-slate-700",
    labelColor: "text-white",
    subtitleColor: "text-slate-400",
    badgeBg: "bg-slate-700",
    badgeText: "text-slate-200",
  },
  area: {
    icon: Layers,
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-700",
    cardBg: "bg-white",
    cardBorder: "border-emerald-200",
    labelColor: "text-slate-900",
    subtitleColor: "text-slate-500",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-700",
  },
  centro: {
    icon: MapPin,
    iconBg: "bg-blue-100",
    iconText: "text-blue-700",
    cardBg: "bg-white",
    cardBorder: "border-blue-200",
    labelColor: "text-slate-900",
    subtitleColor: "text-slate-500",
    badgeBg: "bg-blue-50",
    badgeText: "text-blue-700",
  },
  cargo: {
    icon: Briefcase,
    iconBg: "bg-violet-100",
    iconText: "text-violet-700",
    cardBg: "bg-white",
    cardBorder: "border-violet-200",
    labelColor: "text-slate-900",
    subtitleColor: "text-slate-500",
    badgeBg: "bg-violet-50",
    badgeText: "text-violet-700",
  },
  trabajador: {
    icon: UserCircle,
    iconBg: "bg-slate-100",
    iconText: "text-slate-600",
    cardBg: "bg-white",
    cardBorder: "border-slate-200",
    labelColor: "text-slate-800",
    subtitleColor: "text-slate-400",
    badgeBg: "bg-slate-50",
    badgeText: "text-slate-500",
  },
};

const NODE_TYPE_LABEL: Record<NodeType, string> = {
  empresa: "Empresa",
  area: "Área",
  centro: "Centro de trabajo",
  cargo: "Cargo",
  trabajador: "Trabajador",
};

const ESTADO_BADGE: Record<WorkerEstado, string> = {
  Activo: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Inactivo: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  Licencia: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Vacaciones: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
};

// ─── Tree builders ────────────────────────────────────────────────────── //

function buildAreaTree(
  areas: EmpresaArea[],
  cargos: EmpresaCargo[],
  workers: Worker[],
): OrgNode {
  const workersByArea = new Map<string, Worker[]>();
  workers.forEach((w) => {
    const list = workersByArea.get(w.area) ?? [];
    list.push(w);
    workersByArea.set(w.area, list);
  });

  // Collect all area names (from store + workers for completeness)
  const areaNames = new Set([
    ...areas.map((a) => a.nombre),
    ...workers.map((w) => w.area),
  ]);

  const areaNodes: OrgNode[] = [];

  for (const areaName of areaNames) {
    const areaWorkers = workersByArea.get(areaName) ?? [];
    const areaRef = areas.find((a) => a.nombre === areaName);
    // Skip unmapped areas with no workers
    if (areaWorkers.length === 0 && !areaRef) continue;

    const cargoMap = new Map<string, Worker[]>();
    areaWorkers.forEach((w) => {
      const list = cargoMap.get(w.cargo) ?? [];
      list.push(w);
      cargoMap.set(w.cargo, list);
    });

    const cargoNodes: OrgNode[] = [];
    for (const [cargoName, cargoWorkers] of cargoMap) {
      const cargoRef = cargos.find((c) => c.nombre === cargoName);
      const workerNodes: OrgNode[] = cargoWorkers.map((w) => ({
        id: `w-area-${w.id}`,
        type: "trabajador" as const,
        label: `${w.nombre} ${w.apellido}`,
        subtitle: w.estado,
        workerCount: 1,
        ds44: false,
        children: [],
        workerData: w,
      }));
      cargoNodes.push({
        id: `cargo-area-${areaName}-${cargoName}`,
        type: "cargo" as const,
        label: cargoName,
        workerCount: cargoWorkers.length,
        ds44: cargoRef?.requiereDS44 ?? false,
        children: workerNodes,
        cargoData: cargoRef,
      });
    }

    cargoNodes.sort((a, b) => Number(b.ds44) - Number(a.ds44));

    areaNodes.push({
      id: `area-${areaName}`,
      type: "area" as const,
      label: areaName,
      subtitle: areaRef?.responsable,
      workerCount: areaWorkers.length,
      ds44: areaRef?.tieneDs44 ?? false,
      dotacionRequerida: areaRef?.dotacionTotal,
      children: cargoNodes,
      areaData: areaRef,
    });
  }

  areaNodes.sort((a, b) => b.workerCount - a.workerCount);

  return {
    id: "empresa-root",
    type: "empresa",
    label: "DICAPREV",
    subtitle: "Vista por áreas funcionales",
    workerCount: workers.length,
    ds44: false,
    children: areaNodes,
  };
}

function buildCentroTree(
  centros: CentroAdmin[],
  cargos: EmpresaCargo[],
  workers: Worker[],
): OrgNode {
  const workersByCentro = new Map<string, Worker[]>();
  workers.forEach((w) => {
    const list = workersByCentro.get(w.centroTrabajo) ?? [];
    list.push(w);
    workersByCentro.set(w.centroTrabajo, list);
  });

  const centroNames = new Set([
    ...centros.map((c) => c.nombre),
    ...workers.map((w) => w.centroTrabajo),
  ]);

  const centroNodes: OrgNode[] = [];

  for (const centroName of centroNames) {
    const centroWorkers = workersByCentro.get(centroName) ?? [];
    const centroRef = centros.find((c) => c.nombre === centroName);
    if (centroWorkers.length === 0 && !centroRef) continue;

    const cargoMap = new Map<string, Worker[]>();
    centroWorkers.forEach((w) => {
      const list = cargoMap.get(w.cargo) ?? [];
      list.push(w);
      cargoMap.set(w.cargo, list);
    });

    const cargoNodes: OrgNode[] = [];
    for (const [cargoName, cargoWorkers] of cargoMap) {
      const cargoRef = cargos.find((c) => c.nombre === cargoName);
      const workerNodes: OrgNode[] = cargoWorkers.map((w) => ({
        id: `w-centro-${w.id}`,
        type: "trabajador" as const,
        label: `${w.nombre} ${w.apellido}`,
        subtitle: w.estado,
        workerCount: 1,
        ds44: false,
        children: [],
        workerData: w,
      }));
      const cargoDotRef = centroRef?.dotacionPorCargo.find((d) => d.cargo === cargoName);
      cargoNodes.push({
        id: `cargo-centro-${centroName}-${cargoName}`,
        type: "cargo" as const,
        label: cargoName,
        workerCount: cargoWorkers.length,
        ds44: cargoRef?.requiereDS44 ?? false,
        dotacionRequerida: cargoDotRef?.dotacion,
        children: workerNodes,
        cargoData: cargoRef,
      });
    }

    cargoNodes.sort((a, b) => Number(b.ds44) - Number(a.ds44));

    centroNodes.push({
      id: `centro-${centroName}`,
      type: "centro" as const,
      label: centroName,
      subtitle: centroRef ? `${centroRef.ciudad} · ${centroRef.tipo}` : undefined,
      workerCount: centroWorkers.length,
      ds44: centroRef?.aplicaDs44 ?? false,
      dotacionRequerida: centroRef?.dotacionTotal,
      children: cargoNodes,
      centroData: centroRef,
    });
  }

  centroNodes.sort((a, b) => b.workerCount - a.workerCount);

  return {
    id: "empresa-root",
    type: "empresa",
    label: "DICAPREV",
    subtitle: "Vista por centros de trabajo",
    workerCount: workers.length,
    ds44: false,
    children: centroNodes,
  };
}

function collectAllIds(node: OrgNode): string[] {
  return [node.id, ...node.children.flatMap(collectAllIds)];
}

// ─── Worker estado badge ──────────────────────────────────────────────── //

function WorkerEstadoBadge({ estado }: { estado: WorkerEstado }) {
  return (
    <span
      className={cn(
        "text-xs font-medium px-1.5 py-0.5 rounded-md",
        ESTADO_BADGE[estado] ?? "bg-slate-100 text-slate-600",
      )}
    >
      {estado}
    </span>
  );
}

// ─── OrgTreeNode ──────────────────────────────────────────────────────── //

interface OrgTreeNodeProps {
  node: OrgNode;
  depth: number;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (node: OrgNode) => void;
  selectedId: string | null;
}

// ─── Node cards per type ──────────────────────────────────────────────── //

function DotacionBadge({
  dotacionRequerida,
  workerCount,
}: {
  dotacionRequerida?: number;
  workerCount: number;
}) {
  if (!dotacionRequerida) return null;
  const delta = workerCount - dotacionRequerida;
  if (delta < 0) {
    const vac = -delta;
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 ring-1 ring-sky-200">
        {vac} vacante{vac !== 1 ? "s" : ""}
      </span>
    );
  }
  if (delta > 0) {
    return (
      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 ring-1 ring-purple-200">
        +{delta} sobredotado
      </span>
    );
  }
  return null;
}

function NodeCard({
  node,
  isSelected,
  isExpanded,
  hasChildren,
  onSelect,
  onToggle,
}: {
  node: OrgNode;
  isSelected: boolean;
  isExpanded: boolean;
  hasChildren: boolean;
  onSelect: () => void;
  onToggle: (e: React.MouseEvent) => void;
}) {
  if (node.type === "empresa") {
    return (
      <div
        onClick={onSelect}
        className={cn(
          "cursor-pointer select-none min-w-[260px] rounded-2xl px-6 py-5 shadow-lg transition-all",
          "bg-slate-900 border border-slate-700 hover:shadow-xl",
          isSelected && "ring-2 ring-emerald-400",
        )}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-white leading-tight">{node.label}</p>
            {node.subtitle && <p className="text-sm text-slate-400 mt-0.5">{node.subtitle}</p>}
          </div>
          <div className="flex items-center gap-1.5 bg-slate-700 rounded-full px-3 py-1.5 flex-shrink-0">
            <Users className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-sm font-bold text-white">{node.workerCount}</span>
          </div>
        </div>
        {hasChildren && (
          <button
            type="button"
            onClick={onToggle}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl py-2 bg-slate-800 hover:bg-slate-700 transition text-slate-300 text-xs font-semibold"
          >
            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            {isExpanded
              ? "Contraer estructura"
              : `Ver ${node.children.length} ${node.children[0]?.type === "area" ? "áreas" : "centros"}`}
          </button>
        )}
      </div>
    );
  }

  if (node.type === "area" || node.type === "centro") {
    const isArea = node.type === "area";
    return (
      <div
        onClick={onSelect}
        className={cn(
          "cursor-pointer select-none min-w-[200px] max-w-[240px] rounded-2xl px-4 py-4 shadow-sm transition-all",
          "bg-white",
          isArea
            ? "border-2 border-emerald-200 hover:border-emerald-300"
            : "border-2 border-blue-200 hover:border-blue-300",
          "hover:shadow-md",
          isSelected && "ring-2 ring-emerald-400 shadow-md",
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
              isArea ? "bg-emerald-100" : "bg-blue-100",
            )}
          >
            {isArea ? (
              <Layers size={16} className="text-emerald-600" />
            ) : (
              <MapPin size={16} className="text-blue-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-900 leading-snug">{node.label}</p>
            {node.subtitle && (
              <p className="text-xs text-slate-500 mt-0.5 truncate">{node.subtitle}</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-1">
          <span className={cn("text-xs font-bold shrink-0", isArea ? "text-emerald-700" : "text-blue-700")}>
            {node.workerCount} persona{node.workerCount !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            <DotacionBadge dotacionRequerida={node.dotacionRequerida} workerCount={node.workerCount} />
            {node.ds44 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                DS44
              </span>
            )}
          </div>
        </div>
        {hasChildren && (
          <button
            type="button"
            onClick={onToggle}
            className={cn(
              "mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-semibold transition",
              isArea
                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100",
            )}
          >
            {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            {isExpanded
              ? "Contraer"
              : `${node.children.length} cargo${node.children.length !== 1 ? "s" : ""}`}
          </button>
        )}
      </div>
    );
  }

  if (node.type === "cargo") {
    return (
      <div
        onClick={onSelect}
        className={cn(
          "cursor-pointer select-none min-w-[175px] max-w-[215px] rounded-xl px-4 py-3 shadow-sm transition-all",
          "bg-white border border-violet-200 hover:border-violet-300 hover:shadow-md",
          isSelected && "ring-2 ring-emerald-400 shadow-md",
        )}
      >
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
            <Briefcase size={14} className="text-violet-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 leading-snug">{node.label}</p>
          </div>
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-1">
          <span className="text-xs font-bold text-violet-700 shrink-0">
            {node.workerCount} persona{node.workerCount !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            <DotacionBadge dotacionRequerida={node.dotacionRequerida} workerCount={node.workerCount} />
            {node.ds44 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 ring-1 ring-amber-200">
                DS44
              </span>
            )}
          </div>
        </div>
        {hasChildren && (
          <button
            type="button"
            onClick={onToggle}
            className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold bg-violet-50 text-violet-700 hover:bg-violet-100 transition"
          >
            {isExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            {isExpanded
              ? "Contraer"
              : `${node.children.length} trabajador${node.children.length !== 1 ? "es" : ""}`}
          </button>
        )}
      </div>
    );
  }

  // Trabajador (leaf)
  return (
    <div
      onClick={onSelect}
      className={cn(
        "cursor-pointer select-none min-w-[155px] max-w-[190px] rounded-xl px-3 py-2.5 shadow-sm transition-all",
        "bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md",
        isSelected && "ring-2 ring-emerald-400 shadow-md",
      )}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0">
          {node.workerData
            ? getInitials(node.workerData.nombre, node.workerData.apellido)
            : "??"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-800 truncate leading-snug">{node.label}</p>
          {node.workerData && (
            <div className="mt-1">
              <WorkerEstadoBadge estado={node.workerData.estado} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tree layout with T-connectors ───────────────────────────────────── //

function OrgTreeNode({
  node,
  expandedIds,
  onToggle,
  onSelect,
  selectedId,
}: OrgTreeNodeProps) {
  const isExpanded = expandedIds.has(node.id);
  const visibleChildren = isExpanded ? node.children : [];
  const hasChildren = node.children.length > 0;
  const isSelected = selectedId === node.id;

  return (
    <div className="flex flex-col items-center">
      <NodeCard
        node={node}
        isSelected={isSelected}
        isExpanded={isExpanded}
        hasChildren={hasChildren}
        onSelect={() => onSelect(node)}
        onToggle={(e) => {
          e.stopPropagation();
          if (hasChildren) onToggle(node.id);
        }}
      />

      {visibleChildren.length > 0 && (
        <>
          {/* Vertical stem from card down to children */}
          <div className="w-px h-7 bg-slate-200 flex-shrink-0" />

          {/* Children row — padding-based spacing, no gap */}
          <div className="flex items-start">
            {visibleChildren.map((child, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === visibleChildren.length - 1;
              const isOnly = visibleChildren.length === 1;
              return (
                <div
                  key={child.id}
                  className="relative flex flex-col items-center px-3"
                >
                  {/* Horizontal connector segment at top of column */}
                  {!isOnly && (
                    <div
                      className={cn(
                        "absolute top-0 h-px bg-slate-200",
                        isFirst ? "left-1/2 right-0" :
                        isLast  ? "left-0 right-1/2" :
                        "inset-x-0",
                      )}
                    />
                  )}

                  {/* Vertical drop: horizontal bar → child card */}
                  <div className="w-px h-7 bg-slate-200 flex-shrink-0" />

                  {/* Recursive child subtree */}
                  <OrgTreeNode
                    node={child}
                    depth={0}
                    expandedIds={expandedIds}
                    onToggle={onToggle}
                    onSelect={onSelect}
                    selectedId={selectedId}
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Drawer sub-components ────────────────────────────────────────────── //

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

function KpiGrid({
  items,
}: {
  items: { label: string; value: string | number; icon: React.ElementType; color?: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map(({ label, value, icon: I, color }) => (
        <div key={label} className="bg-slate-50 rounded-xl p-3">
          <I size={14} className={cn("mb-1.5", color ?? "text-slate-500")} />
          <p className="text-xl font-bold text-slate-900 leading-none">{value}</p>
          <p className="text-xs text-slate-500 mt-1">{label}</p>
        </div>
      ))}
    </div>
  );
}

function CumplimientoBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 90 ? "bg-emerald-500" : pct >= 70 ? "bg-amber-500" : "bg-red-500",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={cn(
          "text-sm font-bold w-10 text-right",
          pct >= 90 ? "text-emerald-700" : pct >= 70 ? "text-amber-600" : "text-red-600",
        )}
      >
        {pct}%
      </span>
    </div>
  );
}

function WorkerRow({ worker }: { worker: Worker }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 border-b border-slate-50 last:border-0">
      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
        {getInitials(worker.nombre, worker.apellido)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">
          {worker.nombre} {worker.apellido}
        </p>
        <p className="text-xs text-slate-500">{worker.cargo}</p>
      </div>
      <WorkerEstadoBadge estado={worker.estado} />
    </div>
  );
}

// Detail panels per node type

function EmpresaDetail({ node }: { node: OrgNode }) {
  const activeWorkers = MOCK_WORKERS.filter((w) => w.estado === "Activo").length;
  const withPending = MOCK_WORKERS.filter(
    (w) => w.documentosPendientes + w.capacitacionesPendientes > 0,
  ).length;
  return (
    <div className="space-y-5">
      <KpiGrid
        items={[
          { label: "Total trabajadores", value: MOCK_WORKERS.length, icon: Users, color: "text-slate-700" },
          { label: "Activos", value: activeWorkers, icon: Users, color: "text-emerald-600" },
          { label: node.children[0]?.type === "area" ? "Áreas" : "Centros", value: node.children.length, icon: Layers, color: "text-emerald-600" },
          { label: "Con pendientes", value: withPending, icon: AlertTriangle, color: withPending > 0 ? "text-amber-500" : "text-emerald-600" },
        ]}
      />
      <Section title="Distribución">
        <div className="space-y-2">
          {node.children.map((child) => (
            <div key={child.id} className="flex items-center justify-between text-sm py-1">
              <span className="text-slate-700 truncate mr-2">{child.label}</span>
              <span className="flex-shrink-0 text-slate-500">
                <span className="font-bold text-slate-800">{child.workerCount}</span> personas
              </span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function AreaDetail({ area, workers }: { area: EmpresaArea; workers: Worker[] }) {
  const areaWorkers = workers.filter((w) => w.area === area.nombre);
  const docPend = areaWorkers.reduce((s, w) => s + w.documentosPendientes, 0);
  const capPend = areaWorkers.reduce((s, w) => s + w.capacitacionesPendientes, 0);

  return (
    <div className="space-y-5">
      <KpiGrid
        items={[
          { label: "Trabajadores", value: areaWorkers.length, icon: Users, color: "text-slate-700" },
          { label: "Dotación", value: `${area.asignadosTotal}/${area.dotacionTotal}`, icon: Briefcase, color: "text-violet-600" },
          { label: "Doc. pendientes", value: docPend, icon: FileText, color: docPend > 0 ? "text-amber-500" : "text-emerald-600" },
          { label: "Cap. pendientes", value: capPend, icon: GraduationCap, color: capPend > 0 ? "text-amber-500" : "text-emerald-600" },
        ]}
      />

      <Section title="Responsable">
        <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
          <p className="text-sm font-semibold text-slate-800">{area.responsable}</p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Mail size={11} /> {area.correoResponsable}
          </div>
          {area.telefonoResponsable && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Phone size={11} /> {area.telefonoResponsable}
            </div>
          )}
        </div>
      </Section>

      <Section title="Cargos asociados">
        <div className="flex flex-wrap gap-1.5">
          {area.cargosNombres.map((c) => (
            <span
              key={c}
              className="text-xs px-2 py-1 rounded-lg bg-violet-50 text-violet-700 ring-1 ring-violet-200"
            >
              {c}
            </span>
          ))}
        </div>
      </Section>

      <Section title="Cumplimiento documental">
        <CumplimientoBar pct={area.cumplimientoPromedio} />
      </Section>

      {areaWorkers.length > 0 && (
        <Section title={`Trabajadores (${areaWorkers.length})`}>
          <div className="space-y-0">
            {areaWorkers.map((w) => (
              <WorkerRow key={w.id} worker={w} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function CentroDetail({ centro }: { centro: CentroAdmin }) {
  const vacantes = centro.dotacionTotal - centro.trabajadoresTotal;

  return (
    <div className="space-y-5">
      {/* Location info */}
      <div className="bg-slate-50 rounded-xl p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <MapPin size={13} className="text-slate-400 flex-shrink-0" />
          <span>
            {centro.direccion}, {centro.ciudad}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-200">
            {centro.tipo}
          </span>
          {centro.aplicaDs44 && (
            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 ring-1 ring-amber-200">
              Aplica DS44
            </span>
          )}
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded-md ring-1",
              centro.estado === "activo"
                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                : centro.estado === "en-riesgo"
                  ? "bg-amber-50 text-amber-700 ring-amber-200"
                  : "bg-slate-100 text-slate-600 ring-slate-200",
            )}
          >
            {centro.estado}
          </span>
        </div>
      </div>

      <KpiGrid
        items={[
          { label: "Trabajadores", value: centro.trabajadoresTotal, icon: Users, color: "text-slate-700" },
          { label: "Dotación", value: centro.dotacionTotal, icon: Briefcase, color: "text-violet-600" },
          { label: "Vacantes", value: vacantes, icon: AlertTriangle, color: vacantes > 0 ? "text-amber-500" : "text-emerald-600" },
          { label: "Cap. pendientes", value: centro.capacitacionesPendientes, icon: GraduationCap, color: centro.capacitacionesPendientes > 0 ? "text-amber-500" : "text-emerald-600" },
        ]}
      />

      <Section title="Cumplimiento documental">
        <CumplimientoBar pct={centro.cumplimientoDocPct} />
      </Section>

      {centro.alertasDs44 > 0 && (
        <Section title="Alertas DS44">
          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200">
            <ShieldAlert size={16} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-bold">{centro.alertasDs44}</span> alerta
              {centro.alertasDs44 !== 1 ? "s" : ""} de cumplimiento DS44
            </p>
          </div>
        </Section>
      )}

      {centro.dotacionPorCargo.length > 0 && (
        <Section title="Dotación por cargo">
          <div className="space-y-2">
            {centro.dotacionPorCargo.map((d) => (
              <div key={d.cargo} className="flex items-center justify-between text-sm">
                <span className="text-slate-700 truncate mr-2">{d.cargo}</span>
                <span className="flex-shrink-0 text-xs">
                  <span
                    className={cn(
                      "font-bold",
                      d.asignados < d.dotacion ? "text-amber-600" : "text-emerald-600",
                    )}
                  >
                    {d.asignados}
                  </span>
                  <span className="text-slate-400">/{d.dotacion}</span>
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {centro.observaciones && (
        <Section title="Observaciones">
          <p className="text-sm text-slate-600 leading-relaxed">{centro.observaciones}</p>
        </Section>
      )}
    </div>
  );
}

function CargoDetail({
  cargo,
  workers,
}: {
  cargo: EmpresaCargo | undefined;
  workers: Worker[];
}) {
  const cargoWorkers = cargo ? workers.filter((w) => w.cargo === cargo.nombre) : [];

  if (!cargo) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">
          Sin información detallada en catálogo para este cargo.
        </p>
        {cargoWorkers.length > 0 && (
          <Section title="Trabajadores">
            {cargoWorkers.map((w) => (
              <WorkerRow key={w.id} worker={w} />
            ))}
          </Section>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs px-2 py-1 rounded-lg bg-violet-50 text-violet-700 ring-1 ring-violet-200">
          {cargo.tipo}
        </span>
        <span className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-200">
          {cargo.areaNombre}
        </span>
        {cargo.requiereDS44 && (
          <span className="text-xs px-2 py-1 rounded-lg bg-amber-50 text-amber-700 ring-1 ring-amber-200">
            DS44
          </span>
        )}
        <span className="text-xs px-2 py-1 rounded-lg bg-slate-50 text-slate-600 ring-1 ring-slate-200">
          {cargoWorkers.length} trabajador{cargoWorkers.length !== 1 ? "es" : ""}
        </span>
      </div>

      {cargo.descripcion && (
        <Section title="Descripción del cargo">
          <p className="text-sm text-slate-600 leading-relaxed">{cargo.descripcion}</p>
        </Section>
      )}

      {cargo.riesgosClave && (
        <Section title="Riesgos clave SST">
          <div className="flex items-start gap-2 p-3 bg-red-50 rounded-xl border border-red-200">
            <AlertTriangle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700 leading-relaxed">{cargo.riesgosClave}</p>
          </div>
        </Section>
      )}

      {cargo.documentosBase && cargo.documentosBase.length > 0 && (
        <Section title="Documentos requeridos">
          <div className="space-y-1.5">
            {cargo.documentosBase.map((d) => (
              <div key={d} className="flex items-center gap-2 text-sm text-slate-700">
                <FileText size={12} className="text-slate-400 flex-shrink-0" />
                {d}
              </div>
            ))}
          </div>
        </Section>
      )}

      {cargo.capacitacionesBase && cargo.capacitacionesBase.length > 0 && (
        <Section title="Capacitaciones requeridas">
          <div className="space-y-1.5">
            {cargo.capacitacionesBase.map((c) => (
              <div key={c} className="flex items-center gap-2 text-sm text-slate-700">
                <GraduationCap size={12} className="text-slate-400 flex-shrink-0" />
                {c}
              </div>
            ))}
          </div>
        </Section>
      )}

      {cargoWorkers.length > 0 && (
        <Section title={`Trabajadores (${cargoWorkers.length})`}>
          <div className="space-y-0">
            {cargoWorkers.map((w) => (
              <WorkerRow key={w.id} worker={w} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function WorkerDetail({ worker }: { worker: Worker }) {
  const docStatus =
    worker.documentosPendientes === 0
      ? "al-dia"
      : worker.documentosPendientes <= 2
        ? "pendiente"
        : "critico";
  const capStatus =
    worker.capacitacionesPendientes === 0
      ? "al-dia"
      : worker.capacitacionesPendientes <= 2
        ? "pendiente"
        : "critico";

  const statusStyle = {
    "al-dia": { bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-600" },
    pendiente: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-600" },
    critico: { bg: "bg-red-50", text: "text-red-700", icon: "text-red-600" },
  };

  return (
    <div className="space-y-5">
      {/* Avatar card */}
      <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-900 flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
          {getInitials(worker.nombre, worker.apellido)}
        </div>
        <div className="min-w-0">
          <p className="text-base font-bold text-slate-900 truncate">
            {worker.nombre} {worker.apellido}
          </p>
          <p className="text-sm text-slate-500">{worker.rut}</p>
          <div className="mt-1">
            <WorkerEstadoBadge estado={worker.estado} />
          </div>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-0 divide-y divide-slate-50">
        {(
          [
            { label: "Cargo", value: worker.cargo, icon: Briefcase },
            { label: "Área", value: worker.area, icon: Layers },
            { label: "Centro de trabajo", value: worker.centroTrabajo, icon: MapPin },
            { label: "Contrato", value: worker.tipoContrato, icon: FileText },
            { label: "Email", value: worker.email, icon: Mail },
            { label: "Teléfono", value: worker.telefono, icon: Phone },
          ] as { label: string; value: string; icon: React.ElementType }[]
        ).map(({ label, value, icon: I }) => (
          <div key={label} className="flex items-start gap-3 py-2">
            <I size={13} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-slate-400">{label}</p>
              <p className="text-sm font-medium text-slate-800">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Compliance */}
      <Section title="Estado de cumplimiento">
        <div className="grid grid-cols-2 gap-2.5">
          <div className={cn("rounded-xl p-3 text-center", statusStyle[docStatus].bg)}>
            <FileText
              size={16}
              className={cn("mx-auto mb-1.5", statusStyle[docStatus].icon)}
            />
            <p className={cn("text-2xl font-bold", statusStyle[docStatus].text)}>
              {worker.documentosPendientes}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Doc. pendientes</p>
          </div>
          <div className={cn("rounded-xl p-3 text-center", statusStyle[capStatus].bg)}>
            <GraduationCap
              size={16}
              className={cn("mx-auto mb-1.5", statusStyle[capStatus].icon)}
            />
            <p className={cn("text-2xl font-bold", statusStyle[capStatus].text)}>
              {worker.capacitacionesPendientes}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Cap. pendientes</p>
          </div>
        </div>
      </Section>

      {/* Antigüedad */}
      <Section title="Datos de ingreso">
        <div className="bg-slate-50 rounded-xl p-3 space-y-1">
          <p className="text-xs text-slate-500">
            Desde{" "}
            {new Date(worker.fechaIngreso).toLocaleDateString("es-CL", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="text-sm font-semibold text-slate-800">{antiguedad(worker.fechaIngreso)}</p>
        </div>
      </Section>
    </div>
  );
}

// ─── Node Drawer ──────────────────────────────────────────────────────── //

function NodeDrawer({
  node,
  onClose,
  allWorkers,
}: {
  node: OrgNode | null;
  onClose: () => void;
  allWorkers: Worker[];
}) {
  if (!node) return null;

  const cfg = NODE_CONFIG[node.type];
  const Icon = cfg.icon;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* Drawer panel */}
      <aside className="fixed right-0 top-0 h-full w-[420px] bg-white border-l border-slate-200 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="border-b border-slate-100 px-6 py-5 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                  cfg.iconBg,
                  cfg.iconText,
                )}
              >
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {NODE_TYPE_LABEL[node.type]}
                </p>
                <p className="text-lg font-bold text-slate-900 leading-tight truncate">
                  {node.label}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">
          {node.type === "empresa" && <EmpresaDetail node={node} />}
          {node.type === "area" &&
            (node.areaData ? (
              <AreaDetail area={node.areaData} workers={allWorkers} />
            ) : (
              <p className="text-sm text-slate-500">Sin información detallada.</p>
            ))}
          {node.type === "centro" &&
            (node.centroData ? (
              <CentroDetail centro={node.centroData} />
            ) : (
              <p className="text-sm text-slate-500">Sin información detallada.</p>
            ))}
          {node.type === "cargo" && (
            <CargoDetail cargo={node.cargoData} workers={allWorkers} />
          )}
          {node.type === "trabajador" && node.workerData && (
            <WorkerDetail worker={node.workerData} />
          )}
        </div>
      </aside>
    </>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────── //

function Legend() {
  const entries: { type: NodeType; label: string }[] = [
    { type: "area", label: "Área" },
    { type: "centro", label: "Centro" },
    { type: "cargo", label: "Cargo" },
    { type: "trabajador", label: "Trabajador" },
  ];

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {entries.map(({ type, label }) => {
        const cfg = NODE_CONFIG[type];
        const I = cfg.icon;
        return (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className={cn(
                "w-5 h-5 rounded-md flex items-center justify-center",
                cfg.iconBg,
                cfg.iconText,
              )}
            >
              <I size={10} />
            </div>
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        );
      })}
      <div className="flex items-center gap-1.5">
        <span className="text-xs px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 ring-1 ring-amber-200 font-semibold">
          DS44
        </span>
        <span className="text-xs text-slate-500">Requiere DS44</span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────── //

export default function OrganigramaPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("areas");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["empresa-root"]));
  const [selectedNode, setSelectedNode] = useState<OrgNode | null>(null);

  const [areas, setAreas] = useState<EmpresaArea[]>([]);
  const [cargos, setCargos] = useState<EmpresaCargo[]>([]);
  const [centros, setCentros] = useState<CentroAdmin[]>([]);

  useEffect(() => {
    empresaStore.init();
    setAreas(empresaStore.getAreas());
    setCargos(empresaStore.getCargos());
    setCentros(getCentros());

    const unsub = subscribeCentros(() => {
      setCentros(getCentros());
    });
    return unsub;
  }, []);

  const tree = useMemo(() => {
    return viewMode === "areas"
      ? buildAreaTree(areas, cargos, MOCK_WORKERS)
      : buildCentroTree(centros, cargos, MOCK_WORKERS);
  }, [viewMode, areas, cargos, centros]);

  const allIds = useMemo(() => collectAllIds(tree), [tree]);

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    setExpandedIds(new Set(allIds));
  }, [allIds]);

  const handleCollapseAll = useCallback(() => {
    setExpandedIds(new Set(["empresa-root"]));
  }, []);

  const handleSelect = useCallback((node: OrgNode) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node));
  }, []);

  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    setSelectedNode(null);
    setExpandedIds(new Set(["empresa-root"]));
  };

  return (
    <div className="w-full min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-8 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Network size={20} className="text-emerald-600" />
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Organigrama</h1>
            </div>
            <p className="text-sm text-slate-500 max-w-xl">
              Generado automáticamente a partir de áreas, cargos, centros y trabajadores del
              sistema. Refleja los cambios en tiempo real.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-slate-200 text-slate-600 gap-2 flex-shrink-0"
            onClick={() => {}}
          >
            <Download size={14} />
            Exportar
          </Button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {/* View mode selector */}
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            {(["areas", "centros"] as const).map((mode) => (
              <button
                key={mode}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  viewMode === mode
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700",
                )}
                onClick={() => switchView(mode)}
              >
                {mode === "areas" ? "Por áreas" : "Por centros"}
              </button>
            ))}
          </div>

          <div className="h-5 w-px bg-slate-200" />

          <button
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-emerald-600 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
            onClick={handleExpandAll}
          >
            <ChevronsUpDown size={13} />
            Expandir todo
          </button>
          <button
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={handleCollapseAll}
          >
            <ChevronsDownUp size={13} />
            Contraer todo
          </button>
        </div>
      </div>

      {/* ── Tree area ── */}
      <div
        className={cn(
          "p-8 transition-[margin] duration-300",
          selectedNode ? "mr-[420px]" : "",
        )}
      >
        {/* Legend */}
        <div className="mb-6">
          <Legend />
        </div>

        {/* Tree — horizontally scrollable for wide structures */}
        <div className="overflow-x-auto -mx-8 px-8">
          <div className="min-w-max pb-8">
            <OrgTreeNode
              node={tree}
              depth={0}
              expandedIds={expandedIds}
              onToggle={handleToggle}
              onSelect={handleSelect}
              selectedId={selectedNode?.id ?? null}
            />
          </div>
        </div>
      </div>

      {/* ── Drawer ── */}
      <NodeDrawer
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        allWorkers={MOCK_WORKERS}
      />
    </div>
  );
}
