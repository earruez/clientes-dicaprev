import fs from 'fs';
import XLSX from 'xlsx';
import { config } from 'dotenv';

config();

const args = new Map(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.split('=');
  return [key.replace(/^--/, ''), rest.join('=')];
}));

const filePath = args.get('file') || '/Users/dicaprev/Downloads/matriz_municipalidades_chile.xlsx';
const empresaId = args.get('empresa-id') || args.get('empresaId') || null;
const dryRun = args.has('dry-run') || args.has('dryRun');
const outFile = '/Users/dicaprev/Desktop/clientes-dicaprev/scripts/matriz-municipalidades-mapeo.json';

const normalizeHeader = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const normalizeText = (value) => {
  if (value === undefined || value === null) return '';
  const text = String(value).trim();
  if (!text) return '';
  if (/^no informado p(?:ú|u)blicamente$/i.test(text)) return '';
  return text.replace(/\s+/g, ' ').trim();
};

const parsePlazo = (value) => {
  const text = normalizeText(value);
  if (!text) return { plazoDias: null, tipoPlazo: 'NO_INFORMADO' };

  const match = text.match(/(\d{1,3})/);
  if (!match) return { plazoDias: null, tipoPlazo: 'NO_INFORMADO' };

  const plazoDias = Number.parseInt(match[1], 10);
  if (!Number.isFinite(plazoDias) || plazoDias <= 0) {
    return { plazoDias: null, tipoPlazo: 'NO_INFORMADO' };
  }

  const lower = text.toLowerCase();
  const tipoPlazo = lower.includes('hábil') || lower.includes('habil') ? 'HABILES' : 'CORRIDOS';
  return { plazoDias, tipoPlazo };
};

const parseModalidad = (value) => {
  const text = normalizeText(value).toLowerCase();
  if (!text) return 'NO_INFORMADO';
  if (text.includes('online') && text.includes('presencial')) return 'ONLINE_PRESENCIAL';
  if (text.includes('online')) return 'ONLINE';
  if (text.includes('presencial')) return 'PRESENCIAL';
  return 'NO_INFORMADO';
};

const readSheet = () => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No existe el archivo: ${filePath}`);
  }

  const workbook = XLSX.read(fs.readFileSync(filePath), { type: 'buffer' });
  const sheet = workbook.Sheets['Matriz municipalidades'];
  if (!sheet) {
    throw new Error('No se encontró la hoja "Matriz municipalidades"');
  }

  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  if (!matrix.length) {
    throw new Error('La hoja está vacía');
  }

  const headerRow = matrix[2] || matrix[0];
  const dataRows = matrix.slice(3);

  const headerIndex = new Map();
  headerRow.forEach((rawHeader, index) => {
    const key = normalizeHeader(rawHeader);
    if (key) headerIndex.set(key, index);
  });

  const getValue = (row, aliases) => {
    for (const alias of aliases) {
      const index = headerIndex.get(normalizeHeader(alias));
      if (index !== undefined && row[index] !== undefined) {
        return normalizeText(row[index]);
      }
    }
    return '';
  };

  const records = dataRows
    .map((row) => {
      if (!row || row.every((cell) => normalizeText(cell) === '')) return null;

      const codigoCUT = getValue(row, ['Código CUT']);
      const region = getValue(row, ['Región']);
      const provincia = getValue(row, ['Provincia']);
      const comuna = getValue(row, ['Comuna / municipalidad']);
      const nombreOficial = getValue(row, ['Nombre oficial municipalidad']);
      const nombre = comuna || nombreOficial || '';
      const unidad = getValue(row, ['DOM — nombre/unidad', 'Tránsito — nombre/unidad']);
      const direccion = getValue(row, ['DOM — dirección', 'Tránsito — dirección']);
      const horario = getValue(row, ['DOM — horario', 'Tránsito — horario']);
      const tramite = getValue(row, ['Trámite permiso uso/ocupación BNUP o bien público']);
      const documentosRequeridos = getValue(row, ['Documentos requeridos']);
      const modalidad = parseModalidad(getValue(row, ['Modalidad presencial/online']));
      const urlTramite = getValue(row, ['URL oficial del trámite']);
      const urlInstitucional = getValue(row, ['URL municipal']);
      const fuente = getValue(row, ['Fuente / fecha de verificación']);
      const observaciones = getValue(row, ['Observaciones']);
      const costo = getValue(row, ['Costo asociado al trámite']);
      const plazoRaw = getValue(row, ['Plazo informado de aprobación']);
      const { plazoDias, tipoPlazo } = parsePlazo(plazoRaw);

      return {
        codigoCUT: codigoCUT || null,
        region: region || null,
        provincia: provincia || null,
        comuna: comuna || null,
        nombre: nombre || null,
        nombreOficial: nombreOficial || null,
        unidad: unidad || null,
        direccion: direccion || null,
        horario: horario || null,
        tipoTramite: tramite || null,
        descripcionTramite: tramite || null,
        documentosRequeridos: documentosRequeridos || null,
        plazoDias,
        tipoPlazo: tipoPlazo || 'NO_INFORMADO',
        modalidad,
        urlTramite: urlTramite || null,
        urlInstitucional: urlInstitucional || null,
        fuente: fuente || null,
        observaciones: observaciones || null,
        costo: costo || null,
      };
    })
    .filter(Boolean);

  return { headerRow, records };
};

const { headerRow, records } = readSheet();
const summary = {
  headers: headerRow,
  total: records.length,
  conPlazo: records.filter((row) => row.plazoDias !== null).length,
  sinPlazo: records.filter((row) => row.plazoDias === null).length,
  sample: records.slice(0, 5),
};

fs.writeFileSync(outFile, JSON.stringify(summary, null, 2));

if (dryRun) {
  console.log('Modo dry-run: solo validación de mapeo.');
  console.log(JSON.stringify({ total: summary.total, conPlazo: summary.conPlazo, sinPlazo: summary.sinPlazo }, null, 2));
  process.exit(0);
}

if (!empresaId) {
  throw new Error('Falta --empresa-id. Ejemplo: node scripts/importar-municipalidades-permisos.mjs --empresa-id=cm1abc123');
}

const { PrismaClient } = await import('@prisma/client');
const { PrismaPg } = await import('@prisma/adapter-pg');
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const updates = [];
for (const row of records) {
  if (!row.nombre) continue;

  const payload = {
    empresaId,
    nombre: row.nombre,
    codigoCUT: row.codigoCUT,
    region: row.region,
    provincia: row.provincia,
    comuna: row.comuna,
    nombreOficial: row.nombreOficial,
    unidad: row.unidad,
    direccion: row.direccion,
    horario: row.horario,
    tipoTramite: row.tipoTramite,
    descripcionTramite: row.descripcionTramite,
    documentosRequeridos: row.documentosRequeridos,
    modalidad: row.modalidad,
    plazoDias: row.plazoDias,
    tipoPlazo: row.tipoPlazo,
    urlTramite: row.urlTramite,
    urlInstitucional: row.urlInstitucional,
    fuente: row.fuente,
    observaciones: row.observaciones,
    costo: row.costo,
    activo: true,
  };

  updates.push(
    prisma.permisoOrganismo.upsert({
      where: {
        empresaId_nombre: {
          empresaId,
          nombre: row.nombre,
        },
      },
      update: payload,
      create: payload,
    }),
  );
}

const result = await Promise.all(updates);
console.log(JSON.stringify({ total: records.length, insertados_actualizados: result.length, conPlazo: summary.conPlazo, sinPlazo: summary.sinPlazo }, null, 2));

await prisma.$disconnect();
