"use client";

import { DocumentosFiltros, DocumentStatus } from "../types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FiltrosProps = {
  filtros: DocumentosFiltros;
  onChangeFiltros: (f: DocumentosFiltros) => void;
};

export default function Filtros({ filtros, onChangeFiltros }: FiltrosProps) {
  const handleStatusChange = (status: string) => {
    onChangeFiltros({ ...filtros, status: status as DocumentStatus | "todos" });
  };

  const handleSearchChange = (search: string) => {
    onChangeFiltros({ ...filtros, search });
  };

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end">
      <div className="space-y-2">
        <Label htmlFor="status-filter">Filtrar por estado</Label>
        <Select value={filtros.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Seleccionar estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="vigente">Vigente</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="search">Buscar por nombre</Label>
        <Input
          id="search"
          placeholder="Buscar documento..."
          value={filtros.search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearchChange(e.target.value)}
          className="w-64"
        />
      </div>

      {(filtros.status !== "todos" || filtros.search) && (
        <Button
          variant="outline"
          onClick={() => onChangeFiltros({ status: "todos", search: "" })}
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}