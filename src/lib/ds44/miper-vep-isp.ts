export const VALORES_VEP_ISP = [1, 2, 4] as const;

export type ValorVepIsp = (typeof VALORES_VEP_ISP)[number];
export type ClasificacionVepIsp = "tolerable" | "moderado" | "importante" | "intolerable";

export type EvaluacionVepIsp = {
  probabilidad: ValorVepIsp;
  severidad: ValorVepIsp;
  nivelRiesgo: 1 | 2 | 4 | 8 | 16;
  clasificacionRiesgo: ClasificacionVepIsp;
};

function validarValorVep(nombre: string, valor: number): asserts valor is ValorVepIsp {
  if (!VALORES_VEP_ISP.includes(valor as ValorVepIsp)) {
    throw new Error(`${nombre} debe usar un valor VEP ISP válido: 1, 2 o 4.`);
  }
}

export function clasificarVepIsp(nivel: number): ClasificacionVepIsp {
  if (nivel === 1 || nivel === 2) return "tolerable";
  if (nivel === 4) return "moderado";
  if (nivel === 8) return "importante";
  if (nivel === 16) return "intolerable";
  throw new Error("El nivel VEP ISP debe ser 1, 2, 4, 8 o 16.");
}

export function evaluarVepIsp(probabilidad: number, severidad: number): EvaluacionVepIsp {
  validarValorVep("La probabilidad", probabilidad);
  validarValorVep("La consecuencia", severidad);
  const nivelRiesgo = (probabilidad * severidad) as EvaluacionVepIsp["nivelRiesgo"];
  return { probabilidad, severidad, nivelRiesgo, clasificacionRiesgo: clasificarVepIsp(nivelRiesgo) };
}
