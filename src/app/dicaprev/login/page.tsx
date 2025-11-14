export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-sm rounded-lg border bg-white p-6">
      <h1 className="mb-4 text-xl font-semibold">Login</h1>
      <form className="space-y-3">
        <input className="w-full rounded-md border px-3 py-2" placeholder="Email" />
        <input className="w-full rounded-md border px-3 py-2" type="password" placeholder="Contraseña" />
        <button className="w-full rounded-md bg-black px-3 py-2 text-white">Ingresar</button>
      </form>
    </div>
  );
}
