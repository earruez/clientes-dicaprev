export default function Topbar({ cliente = "Cliente X", usuario = "erik@dicaprev" }) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-white px-4">
      <div className="text-sm text-gray-600">Cliente: <span className="font-medium">{cliente}</span></div>
      <div className="text-sm text-gray-600">Usuario: <span className="font-medium">{usuario}</span></div>
    </header>
  );
}
