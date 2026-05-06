"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      setError("No fue posible iniciar sesion.");
      return;
    }

    if (result.error) {
      setError("Credenciales invalidas o usuario no autorizado.");
      return;
    }

    window.location.href = result.url ?? "/dicaprev";
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-lg border bg-white p-6">
      <h1 className="mb-4 text-xl font-semibold">Login</h1>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <input
          className="w-full rounded-md border px-3 py-2"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          className="w-full rounded-md border px-3 py-2"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          className="w-full rounded-md bg-black px-3 py-2 text-white disabled:opacity-70"
          type="submit"
          disabled={loading}
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
