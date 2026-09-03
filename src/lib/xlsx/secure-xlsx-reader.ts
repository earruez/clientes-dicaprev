import JSZip from "jszip";

const MAX_ARCHIVOS_ZIP = 100;
const MAX_ENTRADA_DESCOMPRIMIDA = 15 * 1024 * 1024;
const MAX_TOTAL_DESCOMPRIMIDO = 25 * 1024 * 1024;
const MAX_XML_CHARS = 15 * 1024 * 1024;

function findEndOfCentralDirectory(bytes: Uint8Array): number {
  const min = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= min; i -= 1) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) return i;
  }
  return -1;
}

function validarExpansionZip(bytes: Uint8Array) {
  const eocd = findEndOfCentralDirectory(bytes);
  if (eocd < 0) throw new Error("El archivo XLSX no contiene una estructura ZIP válida.");

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const totalEntradas = view.getUint16(eocd + 10, true);
  const centralOffset = view.getUint32(eocd + 16, true);

  if (totalEntradas === 0xffff || centralOffset === 0xffffffff) {
    throw new Error("No se admiten archivos XLSX con formato ZIP64.");
  }
  if (totalEntradas > MAX_ARCHIVOS_ZIP) {
    throw new Error("El archivo XLSX contiene demasiados elementos internos.");
  }

  let offset = centralOffset;
  let totalDescomprimido = 0;
  for (let i = 0; i < totalEntradas; i += 1) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error("La estructura interna del XLSX no es válida.");
    }

    const size = view.getUint32(offset + 24, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);

    if (size > MAX_ENTRADA_DESCOMPRIMIDA) {
      throw new Error("El XLSX contiene un elemento interno demasiado grande.");
    }
    totalDescomprimido += size;
    if (totalDescomprimido > MAX_TOTAL_DESCOMPRIMIDO) {
      throw new Error("El XLSX supera el máximo de contenido descomprimido permitido.");
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&amp;/g, "&");
}

function getAttr(attrs: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = attrs.match(new RegExp(`(?:^|\\s)${escaped}=["']([^"']*)["']`, "i"));
  return match ? decodeXml(match[1]) : null;
}

function columnaDesdeReferencia(ref: string): number {
  const letters = ref.match(/^[A-Z]+/i)?.[0]?.toUpperCase();
  if (!letters) return -1;
  let result = 0;
  for (const char of letters) result = result * 26 + char.charCodeAt(0) - 64;
  return result - 1;
}

function filaDesdeReferencia(ref: string): number {
  const raw = ref.match(/(\d+)$/)?.[1];
  return raw ? Number(raw) : -1;
}

function textosT(xml: string): string {
  return Array.from(xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/gi))
    .map((match) => decodeXml(match[1]))
    .join("");
}

function parseSharedStrings(xml: string): string[] {
  return Array.from(xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/gi)).map((match) => textosT(match[1]));
}

function valorCelda(attrs: string, body: string, sharedStrings: string[]): unknown {
  const type = getAttr(attrs, "t");
  if (type === "inlineStr") return textosT(body);

  const raw = body.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i)?.[1];
  if (raw === undefined) return "";
  const decoded = decodeXml(raw).trim();

  if (type === "s") {
    const index = Number(decoded);
    return Number.isInteger(index) && index >= 0 ? sharedStrings[index] ?? "" : "";
  }
  if (type === "str" || type === "e") return decoded;
  if (type === "b") return decoded === "1";

  const numeric = Number(decoded);
  return decoded !== "" && Number.isFinite(numeric) ? numeric : decoded;
}

async function readXml(zip: JSZip, path: string, required = true): Promise<string> {
  const file = zip.file(path);
  if (!file) {
    if (!required) return "";
    throw new Error(`El XLSX no contiene ${path}.`);
  }
  const xml = await file.async("string");
  if (xml.length > MAX_XML_CHARS) throw new Error("El XLSX contiene XML interno demasiado grande.");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error("El XLSX contiene declaraciones XML no permitidas.");
  return xml;
}

function resolverRutaHoja(workbookXml: string, relsXml: string, sheetName: string): string {
  const sheet = Array.from(workbookXml.matchAll(/<sheet\b([^>]*)\/?\s*>/gi)).find(
    (match) => getAttr(match[1], "name") === sheetName,
  );
  if (!sheet) throw new Error(`El archivo debe incluir una hoja llamada "${sheetName}".`);

  const relId = getAttr(sheet[1], "r:id");
  if (!relId) throw new Error("La hoja Trabajadores no tiene una relación válida.");

  const rel = Array.from(relsXml.matchAll(/<Relationship\b([^>]*)\/?\s*>/gi)).find(
    (match) => getAttr(match[1], "Id") === relId,
  );
  const target = rel ? getAttr(rel[1], "Target") : null;
  if (!target || target.includes("..") || /^https?:/i.test(target)) {
    throw new Error("La hoja Trabajadores apunta a una ubicación no permitida.");
  }

  const normalized = target.replace(/^\//, "");
  return normalized.startsWith("xl/") ? normalized : `xl/${normalized}`;
}

export async function leerMatrizXlsxSegura(
  data: ArrayBuffer,
  sheetName: string,
  maxDataRows: number,
): Promise<unknown[][]> {
  const bytes = new Uint8Array(data);
  validarExpansionZip(bytes);

  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true, createFolders: false });
  const workbookXml = await readXml(zip, "xl/workbook.xml");
  const relsXml = await readXml(zip, "xl/_rels/workbook.xml.rels");
  const sheetPath = resolverRutaHoja(workbookXml, relsXml, sheetName);
  const sheetXml = await readXml(zip, sheetPath);
  const sharedXml = await readXml(zip, "xl/sharedStrings.xml", false);
  const sharedStrings = sharedXml ? parseSharedStrings(sharedXml) : [];

  const matrix: unknown[][] = [];
  let maxRow = 0;

  for (const match of sheetXml.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/gi)) {
    const ref = getAttr(match[1], "r");
    if (!ref) continue;
    const rowNumber = filaDesdeReferencia(ref);
    const colNumber = columnaDesdeReferencia(ref);
    if (rowNumber < 1 || colNumber < 0) continue;
    if (rowNumber > maxDataRows + 2) {
      throw new Error(`El archivo supera el máximo de ${maxDataRows.toLocaleString("es-CL")} trabajadores.`);
    }
    maxRow = Math.max(maxRow, rowNumber);
    const row = matrix[rowNumber - 1] ?? [];
    row[colNumber] = valorCelda(match[1], match[2], sharedStrings);
    matrix[rowNumber - 1] = row;
  }

  if (maxRow === 0) return [];
  for (let i = 0; i < maxRow; i += 1) matrix[i] ??= [];
  return matrix;
}
