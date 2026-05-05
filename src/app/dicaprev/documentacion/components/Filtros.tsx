"use client";

import { DocumentosFiltros } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FiltrosProps = {
  filtros: DocumentosFiltros;
  onChangeFiltros: (f: DocumentosFiltros) => void;
};

export default function Filtros({ filtros, onChangeFiltros }: FiltrosProps) {
  function update<K extends keyof DocumentosFiltros>(key: K, value: DocumentosFiltros[K]) {
    onChangeFiltros({ ...filtros, [key]: value });
  }

  const hasFilters =
    filtros.categoria !== "todas" ||
    filtros.estado !== "todos" ||
    filtros.vigencia !== "todas" ||
    filtros.search.trim() !== "" ||
    filtros.subidoPor.trim() !== "" ||
    filtros.fechaSubida.trim() !== "";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        <div className="space-y-1">
          <Label htmlFor="categoria-filter">Categoría</Label>
          <Select value={filtros.categoria} onValueChange={(value) => update("categoria", value as DocumentosFiltros["categoria"])}>
            <SelectTrigger id="categoria-filter">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="legales_empresa">Legales empresa</SelectItem>
              <SelectItem value="laborales_previsionales">Laborales y previsionales</SelectItem>
              <SelectItem value="sst">Seguridad y salud en el trabajo</SelectItem>
              <SelectItem value="mutualidad_ley_16744">Mutualidad / Ley 16.744</SelectItem>
              <SelectItem value="protocolos">Protocolos</SelectItem>
              <SelectItem value="plantillas_formatos">Plantillas y formatos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="estado-filter">Estado</Label>
          <Select value={filtros.estado} onValueChange={(value) => update("estado", value as DocumentosFiltros["estado"])}>
            <SelectTrigger id="estado-filter">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Vigente">Vigente</SelectItem>
              <SelectItem value="Por vencer">Por vencer</SelectItem>
              <SelectItem value="Vencido">Vencido</SelectItem>
              <SelectItem value="Pendiente de carga">Pendiente de carga</SelectItem>
              <SelectItem value="En revisión">En revisión</SelectItem>
              <SelectItem value="Reemplazado">Reemplazado</SelectItem>
              <SelectItem value="No aplica">No aplica</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="vigencia-filter">Vigencia</Label>
          <Select value={filtros.vigencia} onValueChange={(value) => update("vigencia", value as DocumentosFiltros["vigencia"])}>
            <SelectTrigger id="vigencia-filter">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="vigente">Vigente</SelectItem>
              <SelectItem value="por_vencer">Por vencer</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="sin_vencimiento">Sin vencimiento</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="search">Buscar por nombre</Label>
          <Input
            id="search"
            placeholder="Ej: Matriz IPER"
            value={filtros.search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("search", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="subido-por">Subido por</Label>
          <Input
            id="subido-por"
            placeholder="Usuario o correo"
            value={filtros.subidoPor}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("subidoPor", e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="fecha-subida">Fecha de subida</Label>
          <Input
            id="fecha-subida"
            type="date"
            value={filtros.fechaSubida}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("fechaSubida", e.target.value)}
          />
        </div>
      </div>

      {hasFilters ? (
        <Button
          variant="outline"
          onClick={() =>
            onChangeFiltros({
              categoria: "todas",
              estado: "todos",
              vigencia: "todas",
              search: "",
              subidoPor: "",
              fechaSubida: "",
            })
          }
        >
          Limpiar filtros
        </Button>
      ) : null}
    </div>
  );
}