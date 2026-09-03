"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

const NO_PASSWORD_CONFIGURED_ERROR = "NO_PASSWORD_CONFIGURED";
const NO_PASSWORD_CONFIGURED_MESSAGE = "Usuario sin contraseña configurada. Solicita al administrador restablecer acceso.";

function resolveAuthErrorMessage(rawError: string): string {
  const decodedError = decodeURIComponent(rawError);

  if (decodedError.includes(NO_PASSWORD_CONFIGURED_ERROR)) {
    return NO_PASSWORD_CONFIGURED_MESSAGE;
  }

  return "Credenciales inválidas o usuario no autorizado.";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/dicaprev",
      redirect: false,
    });

    setLoading(false);

    if (!result) {
      setError("No fue posible iniciar sesión.");
      return;
    }

    if (result.error) {
      setError(resolveAuthErrorMessage(result.error));
      return;
    }

    window.location.href = result.url ?? "/dicaprev";
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#050a18]">
      {/* Fondo estrellado / gradiente */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_40%,rgba(16,185,129,0.15)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_60%,rgba(59,130,246,0.15)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJ3aGl0ZSIgb3BhY2l0eT0iMC40Ij48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSIxIi8+PGNpcmNsZSBjeD0iMTUwIiBjeT0iMjAiIHI9IjEuNSIvPjxjaXJjbGUgY3g9IjI1MCIgY3k9IjgwIiByPSIxIi8+PGNpcmNsZSBjeD0iMzUwIiBjeT0iMzAiIHI9IjIiLz48Y2lyY2xlIGN4PSI0NTAiIGN5PSI3MCIgcj0iMSIvPjxjaXJjbGUgY3g9IjU1MCIgY3k9IjIwIiByPSIxLjUiLz48Y2lyY2xlIGN4PSI2NTAiIGN5PSI5MCIgcj0iMSIvPjxjaXJjbGUgY3g9Ijc1MCIgY3k9IjQwIiByPSIyIi8+PGNpcmNsZSBjeD0iMTAwIiBjeT0iMTUwIiByPSIxLjUiLz48Y2lyY2xlIGN4PSIyMDAiIGN5PSIxMTAiIHI9IjEiLz48Y2lyY2xlIGN4PSIzMDAiIGN5PSIxNzAiIHI9IjIiLz48Y2lyY2xlIGN4PSI0MDAiIGN5PSIxMjAiIHI9IjEiLz48Y2lyY2xlIGN4PSI1MDAiIGN5PSIxNjAiIHI9IjEuNSIvPjxjaXJjbGUgY3g9IjYwMCIgY3k9IjEzMCIgcj0iMSIvPjxjaXJjbGUgY3g9IjcwMCIgY3k9IjE4MCIgcj0iMiIvPjxjaXJjbGUgY3g9IjgwIiBjeT0iMjUwIiByPSIxIi8+PGNpcmNsZSBjeD0iMTgwIiBjeT0iMjIwIiByPSIxLjUiLz48Y2lyY2xlIGN4PSIyODAiIGN5PSIyNzAiIHI9IjEiLz48Y2lyY2xlIGN4PSIzODAiIGN5PSIyMzAiIHI9IjIiLz48Y2lyY2xlIGN4PSI0ODAiIGN5PSIyNjAiIHI9IjEiLz48Y2lyY2xlIGN4PSI1ODAiIGN5PSIyMTAiIHI9IjEuNSIvPjxjaXJjbGUgY3g9IjY4MCIgY3k9IjI4MCIgcj0iMSIvPjxjaXJjbGUgY3g9Ijc4MCIgY3k9IjI0MCIgcj0iMiIvPjwvZz48L3N2Zz4=')] opacity-30" />
      </div>

      {/* Layout dos columnas */}
      <div className="relative z-10 flex w-full max-w-5xl items-center gap-16 px-8 py-12 lg:px-16">

        {/* Columna izquierda: branding */}
        <div className="hidden flex-1 flex-col gap-8 lg:flex">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-lime-400 via-emerald-500 to-blue-500 shadow-lg shadow-emerald-500/30">
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7">
                <path d="M5 5l9 7-9 7V5z" fill="white" />
                <path d="M13 5l6 7-6 7V5z" fill="rgba(255,255,255,0.5)" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-extrabold tracking-widest text-white">NEXTPREV</p>
              <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400">Next-level safety &amp; compliance</p>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl font-black leading-tight text-white">
              Control total.
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
                Riesgo cero.
              </span>
            </h1>
            <p className="max-w-sm text-base leading-relaxed text-slate-400">
              Plataforma integral de prevención de riesgos, cumplimiento normativo y gestión documental para empresas chilenas.
            </p>
          </div>

          <div className="flex gap-6">
            {[
              { label: "Empresas activas", value: "120+" },
              { label: "Cumplimiento", value: "98%" },
              { label: "Alertas gestionadas", value: "40K+" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Columna derecha: formulario */}
        <div className="w-full max-w-md flex-shrink-0">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur-xl">
            {/* Logo mobile */}
            <div className="mb-6 flex items-center justify-center gap-2 lg:justify-start">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-lime-400 via-emerald-500 to-blue-500 shadow-md">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <path d="M5 5l9 7-9 7V5z" fill="white" />
                  <path d="M13 5l6 7-6 7V5z" fill="rgba(255,255,255,0.5)" />
                </svg>
              </div>
              <span className="text-sm font-bold tracking-widest text-white">NEXTPREV</span>
            </div>

            <h2 className="mb-1 text-2xl font-bold text-white">Iniciar sesión</h2>
            <p className="mb-6 text-sm text-slate-400">Ingresa tus credenciales para continuar.</p>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-400 outline-none transition focus:border-emerald-500/60 focus:bg-white/10 focus:ring-1 focus:ring-emerald-500/40"
                />
              </div>

              {/* Contraseña */}
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-11 text-sm text-white placeholder-slate-400 outline-none transition focus:border-emerald-500/60 focus:bg-white/10 focus:ring-1 focus:ring-emerald-500/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Recordarme + olvido */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 accent-emerald-500"
                  />
                  Recordarme
                </label>
                <a href="/recuperar-contrasena" className="text-slate-400 transition hover:text-emerald-400">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>

              {/* Error */}
              {error ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                  {error}
                </div>
              ) : null}

              {/* Botón ingresar */}
              <button
                type="submit"
                disabled={loading}
                className="relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Ingresando..." : "Ingresar"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-slate-500">o continuar con</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              {/* OAuth buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white py-2.5 text-sm font-medium text-slate-800 transition hover:bg-white/90"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Ingresar con Google
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-white py-2.5 text-sm font-medium text-slate-800 transition hover:bg-white/90"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path d="M1 1h10v10H1zm12 0h10v10H13zM1 13h10v10H1zm12 0h10v10H13z" fill="none" />
                    <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                    <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
                    <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
                    <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
                  </svg>
                  Ingresar con Microsoft
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
