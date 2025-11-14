import Link from "next/link";

export default function Sidebar() {
  const items = [
    { href: "/dicaprev", label: "Dashboard" },
    { href: "/dicaprev/documentos", label: "Documentos" },
    { href: "/dicaprev/login", label: "Login" },
  ];

  return (
    <aside className="w-60 shrink-0 border-r bg-white">
      <div className="p-4 font-semibold">DICAPREV</div>
      <nav className="space-y-1 p-2">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="block rounded-md px-3 py-2 text-sm hover:bg-gray-100"
          >
            {it.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
