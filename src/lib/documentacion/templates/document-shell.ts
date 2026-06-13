import type {
  DocumentShellData,
  DocumentoBloque,
  DocumentoPlantillaRenderizada,
  DocumentoSeccion,
} from "@/lib/documentacion/templates/types";

const LEYENDA_FOOTER_DEFAULT = "Generado por NextPrev";

export function crearDocumentShell(data: Omit<DocumentShellData, "pieDocumento"> & { pieDocumento?: string }): DocumentShellData {
  return {
    ...data,
    pieDocumento: data.pieDocumento?.trim() || LEYENDA_FOOTER_DEFAULT,
  };
}

export function crearSeccionDocumento(params: {
  id: string;
  titulo: string;
  descripcion?: string;
  requerida?: boolean;
  bloques?: DocumentoBloque[];
}): DocumentoSeccion {
  return {
    id: params.id,
    titulo: params.titulo,
    descripcion: params.descripcion,
    requerida: params.requerida ?? true,
    bloques: params.bloques ?? [],
  };
}

export function construirDocumentoPlantilla(shell: DocumentShellData, secciones: DocumentoSeccion[]): DocumentoPlantillaRenderizada {
  return {
    shell,
    secciones,
  };
}

function renderBloque(bloque: DocumentoBloque): string[] {
  if (bloque.tipo === "texto") {
    return [bloque.texto];
  }

  if (bloque.tipo === "campos") {
    return bloque.campos.map((campo) => `- ${campo.etiqueta}: ${campo.valor}`);
  }

  if (bloque.tipo === "lista") {
    if (bloque.ordenada) {
      return bloque.items.map((item, index) => `${index + 1}. ${item}`);
    }
    return bloque.items.map((item) => `- ${item}`);
  }

  const header = `| ${bloque.columnas.join(" | ")} |`;
  const separator = `| ${bloque.columnas.map(() => "---").join(" | ")} |`;
  const rows = bloque.filas.map((fila) => {
    const cells = bloque.columnas.map((columna) => {
      const value = fila[columna];
      if (value === null || value === undefined || value === "") return "-";
      if (typeof value === "boolean") return value ? "Si" : "No";
      return String(value);
    });
    return `| ${cells.join(" | ")} |`;
  });

  return [header, separator, ...rows];
}

export function renderDocumentoComoMarkdown(documento: DocumentoPlantillaRenderizada): string {
  const encabezado = [
    `# ${documento.shell.titulo}`,
    "",
    `- Codigo: ${documento.shell.codigoDocumento}`,
    `- Version: ${documento.shell.version}`,
    `- Fecha emision: ${documento.shell.fechaEmision}`,
    `- Empresa: ${documento.shell.empresaPrincipal}`,
    `- RUT empresa: ${documento.shell.empresaRut ?? "-"}`,
    `- Contratista: ${documento.shell.empresaContratista ?? "-"}`,
    `- Mandante: ${documento.shell.empresaMandante ?? "-"}`,
    `- Centro de trabajo: ${documento.shell.centroTrabajo ?? "-"}`,
    "",
    "## Identificacion del Trabajador",
    "",
    `- Nombre: ${documento.shell.trabajador.nombre}`,
    `- RUT: ${documento.shell.trabajador.rut}`,
    `- Cargo: ${documento.shell.trabajador.cargo}`,
    `- Area: ${documento.shell.trabajador.area}`,
    "",
  ];

  const cuerpo: string[] = [];

  for (const seccion of documento.secciones) {
    cuerpo.push(`## ${seccion.titulo}`);
    cuerpo.push("");
    if (seccion.descripcion) {
      cuerpo.push(seccion.descripcion);
      cuerpo.push("");
    }

    for (const bloque of seccion.bloques) {
      cuerpo.push(...renderBloque(bloque));
      cuerpo.push("");
    }
  }

  const firmas = [
    "## Declaracion",
    "",
    documento.shell.declaracionFinal,
    "",
    "## Firmas",
    "",
    ...documento.shell.firmas.map((firma) => {
      const fecha = firma.fecha ? ` | Fecha: ${firma.fecha}` : "";
      const rut = firma.rut ? ` | RUT: ${firma.rut}` : "";
      return `- ${firma.rol}: ${firma.nombre}${rut}${fecha}`;
    }),
    "",
    "## Trazabilidad",
    "",
    `- Generado en: ${documento.shell.trazabilidad.generadoEn}`,
    `- Generado por: ${documento.shell.trazabilidad.generadoPor}`,
    `- Fuente: ${documento.shell.trazabilidad.fuente}`,
    `- Referencia: ${documento.shell.trazabilidad.idReferencia ?? "-"}`,
    "",
    documento.shell.pieDocumento ?? LEYENDA_FOOTER_DEFAULT,
  ];

  return [...encabezado, ...cuerpo, ...firmas].join("\n").trim();
}
