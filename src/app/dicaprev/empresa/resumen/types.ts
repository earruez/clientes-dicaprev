export interface GeneralData {
  razonSocial: string;
  rutEmpresa: string;
  representanteLegal: string;
  rutRepresentante: string;
  direccion: string;
  comuna: string;
  region: string;
  giro: string;
  cantidadTrabajadores: number;
  cantidadCentrosTrabajo: number;
}

export interface GobiernoSSTData {
  comiteParitario: string;
  delegadoSST: string;
  tasaDS67: string;
  accidentabilidad: string;
  reglamentoInterno: string;
  comiteEstado: string;
  keyDates: {
    ultimaEleccion: string;
    vigenciaHasta: string;
  };
}

export interface EstructuraData {
  areas: number;
  cargos: number;
  puestos: number;
  trabajadores: number;
  organigrama: string;
}

export interface ResumenData {
  general: GeneralData;
  gobierno: GobiernoSSTData;
  estructura: EstructuraData;
}