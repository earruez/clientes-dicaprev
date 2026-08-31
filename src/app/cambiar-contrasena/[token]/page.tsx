"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface TokenValidation {
  valid: boolean;
  usuario?: {
    nombre: string;
    email: string;
  };
  error?: string;
}

export default function CambiarContraseñaPage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [validando, setValidando] = useState(true);
  const [tokenValido, setTokenValido] = useState(false);
  const [usuario, setUsuario] = useState<{ nombre: string; email: string } | null>(null);
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);

  const [form, setForm] = useState({
    nuevaContraseña: "",
    confirmarContraseña: "",
  });

  const [mostrarContraseña, setMostrarContraseña] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    // Validar token al cargar
    async function validarToken() {
      try {
        const response = await fetch(
          `/api/usuario/cambiar-contrasena-inicial?token=${encodeURIComponent(token)}`
        );
        const data: TokenValidation = await response.json();

        if (data.valid && data.usuario) {
          setTokenValido(true);
          setUsuario(data.usuario);
          setErrorValidacion(null);
        } else {
          setTokenValido(false);
          setErrorValidacion(data.error || "Token inválido");
        }
      } catch {
        setTokenValido(false);
        setErrorValidacion("Error al validar el token");
      } finally {
        setValidando(false);
      }
    }

    validarToken();
  }, [token]);

  const validaFormulario = () => {
    if (!form.nuevaContraseña) {
      setError("La contraseña es requerida");
      return false;
    }
    if (form.nuevaContraseña.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return false;
    }
    if (form.nuevaContraseña !== form.confirmarContraseña) {
      setError("Las contraseñas no coinciden");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validaFormulario()) return;

    setEnviando(true);
    try {
      const response = await fetch("/api/usuario/cambiar-contrasena-inicial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          nuevaContraseña: form.nuevaContraseña,
          confirmarContraseña: form.confirmarContraseña,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error al cambiar la contraseña");
        return;
      }

      setExito(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setError("Error al cambiar la contraseña. Intenta nuevamente.");
    } finally {
      setEnviando(false);
    }
  };

  if (validando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-slate-600">Validando tu enlace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValido) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">
              Enlace inválido
            </h1>
            <p className="text-slate-600 text-center mb-6">
              {errorValidacion || "Este enlace no es válido o ha expirado."}
            </p>
            <a
              href="/login"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-center transition"
            >
              Volver al login
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (exito) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mx-auto mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">¡Éxito!</h1>
            <p className="text-slate-600 mb-6">
              Tu contraseña ha sido actualizada correctamente.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Redirigiendo al login...
            </p>
            <a
              href="/login"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
            >
              Ir a login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Card Principal */}
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-center">
            <h1 className="text-3xl font-bold text-white mb-2">NextPrev</h1>
            <p className="text-blue-100 text-sm">Establece tu contraseña</p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Información del usuario */}
            {usuario && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-slate-600 mb-1">Usuario</p>
                <p className="font-semibold text-slate-900">{usuario.nombre}</p>
                <p className="text-xs text-slate-500">{usuario.email}</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nueva Contraseña */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={mostrarContraseña ? "text" : "password"}
                    value={form.nuevaContraseña}
                    onChange={(e) =>
                      setForm({ ...form, nuevaContraseña: e.target.value })
                    }
                    placeholder="Mínimo 8 caracteres"
                    disabled={enviando}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarContraseña(!mostrarContraseña)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {mostrarContraseña ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Usa letras, números y caracteres especiales para mayor seguridad
                </p>
              </div>

              {/* Confirmar Contraseña */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <input
                    type={mostrarConfirmar ? "text" : "password"}
                    value={form.confirmarContraseña}
                    onChange={(e) =>
                      setForm({ ...form, confirmarContraseña: e.target.value })
                    }
                    placeholder="Repite tu contraseña"
                    disabled={enviando}
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {mostrarConfirmar ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Validación visual de coincidencia */}
              {form.confirmarContraseña && (
                <div className="text-sm">
                  {form.nuevaContraseña === form.confirmarContraseña ? (
                    <p className="text-green-600 font-medium flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Las contraseñas coinciden
                    </p>
                  ) : (
                    <p className="text-red-600 font-medium flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Las contraseñas no coinciden
                    </p>
                  )}
                </div>
              )}

              {/* Botón Submit */}
              <button
                type="submit"
                disabled={enviando || !form.nuevaContraseña || form.nuevaContraseña !== form.confirmarContraseña}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2.5 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
              >
                {enviando ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Establecer contraseña"
                )}
              </button>
            </form>

            {/* Nota de seguridad */}
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>🔒 Seguridad:</strong> Este enlace es válido por 24 horas. Una vez que establezca su contraseña, podrá iniciar sesión con su email y contraseña.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-slate-400 text-sm">
            ¿Problemas? Contacta al administrador de tu empresa.
          </p>
        </div>
      </div>
    </div>
  );
}
