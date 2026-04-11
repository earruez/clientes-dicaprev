"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DocsPorObraRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dicaprev/empresa/documentacion");
  }, [router]);
  return null;
}
