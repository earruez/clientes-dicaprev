export const MIPER_VALOR_MINIMO = 1;
export const MIPER_VALOR_MAXIMO = 5;

export type ClasificacionRiesgoMiper = "bajo" | "medio" | "alto" | "critico";

export type EvaluacionRiesgoMiper = {
  probabilidad: number;
  severidad: number;
  nivelRiesgo: number;
  clasificacionRiesgo: ClasificacionRiesgoMiper;
};

function validarValor(nombre: string, valor: number): void {
  if (!Number.isInteger(valor) || valor < MIPER_VALOR_MINIMO || valor > MIPER_VALOR_MAXIMO) {
    throw new Error(`${nombre} debe ser un número entero entre 1 y 5.`);
  }
}

export function clasificarRiesgoMiper(nivelRiesgo: number): ClasificacionRiesgoMiper {
  if (!Number.isInteger(nivelRiesgo) || nivelRiesgo < 1 || nivelRiesgo > 25) {
    throw new Error("El nivel de riesgo debe ser un número entero entre 1 y 25.");
  }

  if (nivelRiesgo <= 4) return "bajo";
  if (nivelRiesgo <= 9) return "medio";
  if (nivelRiesgo <= 16) return "alto";
  return "critico";
}

export function evaluarRiesgoMiper(probabilidad: number, severidad: number): EvaluacionRiesgoMiper {
  validarValor("La probabilidad", probabilidad);
  validarValor("La severidad", severidad);

  const nivelRiesgo = probabilidad * severidad;
  return {
    probabilidad,
    severidad,
    nivelRiesgo,
    clasificacionRiesgo: clasificarRiesgoMiper(nivelRiesgo),
  };
}
