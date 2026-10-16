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
