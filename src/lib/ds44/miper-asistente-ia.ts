import { z } from "zod";
import { CATALOGO_RIESGOS_ISP_POR_CODIGO } from "./miper-catalogo-isp";

const tareaSchema = z.object({
  nombre: z.string().trim().min(3).max(300),
  justificacion: z.string().trim().min(3).max(500),
}).strict();

const respuestaSchema = z.object({ tareas: z.array(tareaSchema).max(20) }).strict();

export type ContextoCargoMiperIa = {
  cargoId: string;
  nombre: string;
  descripcion: string | null;
  perfilSst: string | null;
  riesgosClave: unknown;
};

export type RespuestaTareasMiperIa = z.infer<typeof respuestaSchema>;
export type ProveedorTareasMiperIa = (contexto: ContextoCargoMiperIa) => Promise<unknown>;

export type CodigoErrorProveedorTareasMiperIa =
  | "timeout"
  | "autenticacion"
  | "cuota"
  | "http"
  | "respuesta_vacia"
  | "json_invalido";

export class ErrorProveedorTareasMiperIa extends Error {
  constructor(public readonly codigo: CodigoErrorProveedorTareasMiperIa) {
    super(codigo);
    this.name = "ErrorProveedorTareasMiperIa";
  }
}

const riesgoSugeridoSchema = z.object({
  tareaRef: z.string().trim().min(1).max(100),
  codigoIsp: z.string().trim().min(1).max(10),
  consecuenciaSugerida: z.string().trim().min(3).max(500),
  motivo: z.string().trim().min(3).max(500),
  controlesSugeridos: z.array(z.string().trim().min(3).max(500)).max(10),
}).strict();

const riesgosSchema = z.object({ riesgos: z.array(riesgoSugeridoSchema).max(100) }).strict();

export function validarSugerenciasRiesgosIa(value: unknown) {
  const resultado = riesgosSchema.parse(value);
  for (const riesgo of resultado.riesgos) {
    if (!CATALOGO_RIESGOS_ISP_POR_CODIGO.has(riesgo.codigoIsp)) {
      throw new Error(`La IA propuso un código ajeno al catálogo ISP: ${riesgo.codigoIsp}.`);
    }
  }
  return resultado;
}

export async function sugerirTareasMiperConIa(
  contexto: ContextoCargoMiperIa,
  proveedor?: ProveedorTareasMiperIa,
): Promise<{ disponible: boolean; resultado: RespuestaTareasMiperIa; mensaje: string }> {
  if (!proveedor) {
    return {
      disponible: false,
      resultado: { tareas: [] },
      mensaje: "Asistencia IA no configurada. Puedes continuar agregando y confirmando tareas manualmente.",
    };
  }

  try {
    const resultado = respuestaSchema.parse(await proveedor(contexto));
    const nombreCargo = contexto.nombre.trim().toLocaleLowerCase("es-CL");
    if (resultado.tareas.some((tarea) => tarea.nombre.toLocaleLowerCase("es-CL") === nombreCargo)) {
      throw new Error("La respuesta repite el nombre del cargo como tarea.");
    }
    return { disponible: true, resultado, mensaje: "Sugerencias generadas con IA; requieren confirmación humana." };
  } catch (error) {
    let mensaje = "La asistencia IA devolvió una respuesta no válida. Puedes continuar agregando tareas manualmente.";
    if (error instanceof ErrorProveedorTareasMiperIa) {
      if (error.codigo === "timeout") mensaje = "La asistencia IA tardó demasiado en responder. Puedes continuar agregando tareas manualmente.";
      else if (error.codigo === "autenticacion" || error.codigo === "cuota") mensaje = "La asistencia IA no está disponible temporalmente. Puedes continuar agregando tareas manualmente.";
      else if (error.codigo === "http") mensaje = "No fue posible consultar la asistencia IA. Puedes continuar agregando tareas manualmente.";
    }
    return { disponible: false, resultado: { tareas: [] }, mensaje };
  }
}
