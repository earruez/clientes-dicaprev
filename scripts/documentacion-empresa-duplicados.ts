import { consolidarDuplicadosDocumentoEmpresa } from "../src/lib/documentacion/documento-empresa-duplicados";

async function main() {
  const args = new Set(process.argv.slice(2));
  const aplicar = args.has("--apply");
  const empresaIdArg = process.argv.find((arg) => arg.startsWith("--empresaId="));
  const empresaId = empresaIdArg ? empresaIdArg.split("=")[1] : undefined;

  const resultado = await consolidarDuplicadosDocumentoEmpresa({
    aplicar,
    empresaId,
  });

  console.log(
    JSON.stringify(
      {
        modo: aplicar ? "apply" : "report",
        empresaId: empresaId ?? null,
        ...resultado,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
