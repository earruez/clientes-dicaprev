import Link from "next/link";

export default function DocumentosPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Documentos</h1>
      <p className="text-sm text-gray-600">Gestión documental general.</p>
      <div className="flex gap-3">
        <Link
          href="/dicaprev/documentos/por-obra"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md border px-3 py-2 text-sm"
        >
          Abrir "Documentación por obra" en nueva pestaña
        </Link>
      </div>
      <ul className="list-disc pl-6 text-sm text-gray-700">
        <li>Políticas / Reglamentos</li>
        <li>Procedimientos</li>
        <li>Capacitaciones</li>
      </ul>
    </div>
  );
}
