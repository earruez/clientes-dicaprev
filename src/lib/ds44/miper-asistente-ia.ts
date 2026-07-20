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

  const resultado = respuestaSchema.parse(await proveedor(contexto));
  return { disponible: true, resultado, mensaje: "Sugerencias generadas; requieren confirmación humana." };
}
