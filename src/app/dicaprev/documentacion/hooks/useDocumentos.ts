"use client";

import { useMemo, useState } from "react";
import { Documento, DocumentStatus, DocumentosFiltros } from "../types";

export type UseDocumentosResult = {
  documentos: Documento[];
  setDocumentos: (data: Documento[]) => void;
  filtros: DocumentosFiltros;
  setFiltros: (f: DocumentosFiltros) => void;
  filtrados: Documento[];
};

// Mock data
const MOCK_DOCUMENTOS: Documento[] = [
  {
    id: "1",
    nombre: "Reglamento Interno de Seguridad",
    tipo: "reglamento",
    status: "vigente",
    fechaVencimiento: "2026-12-31",
    responsable: "Juan Pérez",
    obra: "Central Hidroeléctrica",
  },
  {
    id: "2",
    nombre: "Certificado de Capacitación EPP",
    tipo: "certificado",
    status: "pendiente",
    fechaVencimiento: "2025-06-15",
    responsable: "María González",
    obra: "Planta Solar",
  },
  {
    id: "3",
    nombre: "Manual de Procedimientos de Emergencia",
    tipo: "manual",
    status: "vencido",
    fechaVencimiento: "2024-03-01",
    responsable: "Carlos Rodríguez",
  },
  {
    id: "4",
    nombre: "Contrato de Subcontratista",
    tipo: "contrato",
    status: "vigente",
    fechaVencimiento: "2027-01-15",
    responsable: "Ana López",
    obra: "Obra Vial Norte",
  },
];

const FILTROS_POR_DEFECTO: DocumentosFiltros = {
  status: "todos",
  search: "",
};

export function useDocumentos(inicial: Documento[] = MOCK_DOCUMENTOS): UseDocumentosResult {
  const [documentos, setDocumentos] = useState<Documento[]>(inicial);
  const [filtros, setFiltros] = useState<DocumentosFiltros>(FILTROS_POR_DEFECTO);

  const filtrados = useMemo(() => {
    return documentos.filter((doc) => {
      // Filter by status
      if (filtros.status !== "todos" && doc.status !== filtros.status) {
        return false;
      }
      // Filter by search (name)
      if (filtros.search && !doc.nombre.toLowerCase().includes(filtros.search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [documentos, filtros]);

  return {
    documentos,
    setDocumentos,
    filtros,
    setFiltros,
    filtrados,
  };
}