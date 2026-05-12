export {
  getVehiculos,
  getVehiculoById,
  getVehiculoDocumentos,
  getVehiculoMantenciones,
  getVehiculoDetalle,
  getCentrosList,
  crearVehiculo,
  actualizarVehiculo,
  upsertVehiculoDocumento,
  crearMantencionVehiculo,
} from "@/app/dicaprev/empresa/vehiculos/actions";

export type {
  VehiculoDTO,
  VehiculoDocumentoDTO,
  VehiculoMantencionDTO,
  VehiculoInput,
  DocumentoVehiculoInput,
  MantencionVehiculoInput,
  CentroItem,
  MantencionEstado,
} from "@/app/dicaprev/empresa/vehiculos/actions";
