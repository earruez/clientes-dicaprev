/** Fecha sin hora de una faena en Chile, sin confiar en parseos permisivos de JS. */
export function fechaIsoValida(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T12:00:00Z");
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** 23:59:59 de la fecha indicada, en zona horaria America/Santiago, incluyendo horario de verano. */
export function finDiaChile(value: string): Date {
  if (!fechaIsoValida(value)) throw new Error("Fecha de término inválida.");
  const referencia = new Date(value + "T20:00:00Z");
  const timeZoneName = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago", timeZoneName: "shortOffset",
  }).formatToParts(referencia).find((p) => p.type === "timeZoneName")?.value || "";
  const match = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(timeZoneName);
  if (!match) throw new Error("No se pudo determinar el horario de Chile.");
  const offset = (match[1] === "+" ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3] || 0));
  return new Date(Date.parse(value + "T23:59:59Z") - offset * 60_000);
}

export function hoyChile(): string {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Santiago" });
}
