"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { responderObservacion } from "@/app/dicaprev/permisos/actions/public";

export function ResponderObservacionForm({ token }: { token: string }) {
  const [respuesta, setRespuesta] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await responderObservacion(token, respuesta);
      setEnviado(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar la respuesta");
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
        Tu respuesta fue enviada correctamente. El equipo de NextPrev continuará con la gestión del permiso.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>
      )}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Tu respuesta *</label>
        <textarea
          value={respuesta}
          onChange={(e) => setRespuesta(e.target.value)}
          required
          rows={6}
          placeholder="Escribe aquí la respuesta o antecedentes solicitados por el organismo"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Enviando..." : "Enviar respuesta"}
      </Button>
    </form>
  );
}
