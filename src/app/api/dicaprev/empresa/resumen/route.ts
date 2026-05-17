import { getResumenEmpresa } from "@/actions/empresa/resumen";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const resumen = await getResumenEmpresa();
    return NextResponse.json(resumen);
  } catch (error) {
    console.error("Error fetching empresa resumen:", error);
    return NextResponse.json(
      { error: "Failed to fetch resumen" },
      { status: 500 }
    );
  }
}
