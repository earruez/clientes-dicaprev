"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirige a la ubicación canónica dentro del módulo Empresa
export default function DocumentosRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dicaprev/empresa/documentacion");
  }, [router]);
  return null;
}
