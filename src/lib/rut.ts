export function formatRutChile(value: string): string {
  const limpio = String(value ?? "")
    .toUpperCase()
    .replace(/[^0-9K]/g, "")
    .slice(0, 9);

  if (!limpio) return "";
  if (limpio.length === 1) return limpio;

  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1);
  const cuerpoFormateado = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  return `${cuerpoFormateado}-${dv}`;
}

/** Verifica el dígito de control del RUT chileno sin datos externos. */
export function validarRutChile(valor: string): boolean {
  const limpio = String(valor || "").toUpperCase().replace(/[^0-9K]/g, "");
  if (!/^\d{7,8}[0-9K]$/.test(limpio)) return false;
  const cuerpo = limpio.slice(0, -1);
  const digito = limpio.slice(-1);
  let suma = 0, multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  const esperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return digito === esperado;
}
