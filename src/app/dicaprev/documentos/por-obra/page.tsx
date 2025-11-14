export default function DocsPorObraPage() {
  const obras = [
    { id: "obra-001", nombre: "Edificio Central" },
    { id: "obra-002", nombre: "Planta Norte" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Documentación por Obra</h1>
      <p className="text-sm text-gray-600">Cada obra tendrá su set documental.</p>
      <ul className="space-y-2">
        {obras.map((o) => (
          <li key={o.id} className="rounded-md border bg-white p-3">
            <div className="font-medium">{o.nombre}</div>
            <div className="text-xs text-gray-500">ID: {o.id}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
