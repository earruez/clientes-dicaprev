"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail } from "lucide-react";

export default function RecuperarContraseñaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/usuario/recuperar-contrasena", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json() as { error?: string };

      if (!response.ok) {
        setError(data.error || "No fue posible procesar la solicitud.");
        return;
      }

      setEnviado(true);
    } catch {
      setError("No fue posible procesar la solicitud. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050a18] px-4 py-8">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl">
        <div className="bg-[#0f2747] px-7 py-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-500 text-white">
            <KeyRound className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-bold text-white">NEXTPREV</h1>
          <p className="mt-1 text-sm text-blue-100">Recuperar contraseña</p>
        </div>

        <div className="p-7">
          {enviado ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-11 w-11 text-emerald-600" />
              <h2 className="mt-4 text-xl font-bold text-slate-900">Revisa tu correo</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Si existe una cuenta activa con ese correo, recibirás un enlace para restablecer tu contraseña.
              </p>
              <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-slate-900">¿Olvidaste tu contraseña?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Ingresa tu correo y te enviaremos un enlace válido por 24 horas.</p>
              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Correo electrónico"
                    required
                    autoComplete="email"
                    className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
                <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60">
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Enviando..." : "Enviar enlace"}
                </button>
              </form>
              <Link href="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline">
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio de sesión
              </Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}