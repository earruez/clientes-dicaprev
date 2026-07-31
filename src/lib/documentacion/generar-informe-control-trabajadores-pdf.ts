import { jsPDF } from "jspdf";
import type { FilaTrabajadorInforme } from "./informe-control-trabajadores";

export type InformeControlPdfData = {
  id: string;
  version: string;
  generadoEn: string;
  generadoPor: string;
  empresa: { nombre: string; rut: string; logoDataUrl?: string | null };
  alcance: string;
  filtros: string;
  filas: FilaTrabajadorInforme[];
  resumen: { trabajadores: number; completos: number; cumplimiento: number | null; vigente: number; porVencer: number; vencido: number; pendiente: number; enRevision: number; sinConfigurar: number };
};

const labels = { vigente: "Vigente", por_vencer: "Por vencer", vencido: "Vencido", pendiente: "Pendiente", en_revision: "En revision", no_aplica: "No aplica" } as const;
const colors = { vigente: [220,252,231], por_vencer: [254,249,195], vencido: [254,226,226], pendiente: [241,245,249], en_revision: [224,242,254], no_aplica: [241,245,249] } as const;
const fmt = (value: string | null) => value ? new Date(value).toLocaleDateString("es-CL") : "-";
const clean = (value: unknown) => String(value ?? "-").replace(/[\u2010-\u2015]/g, "-");

export function generarInformeControlTrabajadoresPdf(data: InformeControlPdfData): Uint8Array {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight(), mx = 28, bottom = 34;
  let y = 25;
  const line = 9;
  const wrap = (text: unknown, width: number) => doc.splitTextToSize(clean(text), Math.max(12, width - 8)) as string[];
  const footer = () => {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setDrawColor(203,213,225); doc.line(mx, ph-24, pw-mx, ph-24); doc.setFontSize(7); doc.setTextColor(71,85,105); doc.text("Generado por NextPrev | Control documental SST", mx, ph-11); doc.text(`Pagina ${i} de ${n}`, pw-mx, ph-11, { align: "right" }); }
  };
  const header = () => {
    doc.setFillColor(15, 53, 87); doc.rect(mx, y, pw-mx*2, 68, "F");
    if (data.empresa.logoDataUrl) { try { doc.addImage(data.empresa.logoDataUrl, "PNG", mx+10, y+10, 80, 48, undefined, "FAST"); } catch {} }
    doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(15); doc.text("Informe de Control Documental de Trabajadores", mx+105, y+24);
    doc.setFontSize(8); doc.setFont("helvetica","normal"); doc.text(`${clean(data.empresa.nombre)} | RUT ${clean(data.empresa.rut)} | ${clean(data.alcance)}`, mx+105, y+41);
    doc.text(`Codigo: ICDT-01 | Version: ${data.version} | Estado: BORRADOR | Corte: ${new Date(data.generadoEn).toLocaleString("es-CL")}`, mx+105, y+55);
    y += 81; doc.setTextColor(153,27,27); doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.text("BORRADOR - Documento no aprobado", mx, y); y += 15;
  };
  const newPage = () => { doc.addPage(); y=25; header(); };
  const ensure = (h: number) => { if (y+h > ph-bottom) newPage(); };
  const title = (text: string) => { ensure(22); doc.setTextColor(15,53,87); doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.text(text, mx, y); y+=15; };
  const table = (headers: string[], rows: string[][], widths: number[], fills?: string[]) => {
    const drawHead=()=>{ ensure(18); let x=mx; doc.setFillColor(15,53,87); doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(6.5); headers.forEach((h,i)=>{doc.rect(x,y,widths[i],18,"F");doc.text(wrap(h,widths[i]),x+4,y+11);x+=widths[i];});y+=18;}; drawHead();
    rows.forEach((row,ri)=>{ const cells=row.map((c,i)=>wrap(c,widths[i])); const h=Math.max(18, 7+Math.max(...cells.map(c=>c.length))*line); if(y+h>ph-bottom){newPage();drawHead();} let x=mx; cells.forEach((ls,i)=>{const fill=fills?.[ri]; if(fill && fill in colors){const c=colors[fill as keyof typeof colors];doc.setFillColor(c[0],c[1],c[2]);doc.rect(x,y,widths[i],h,"F");} doc.setDrawColor(203,213,225);doc.rect(x,y,widths[i],h);doc.setTextColor(30,41,59);doc.setFont("helvetica","normal");doc.setFontSize(6.5);ls.forEach((l,j)=>doc.text(l,x+4,y+11+j*line));x+=widths[i];});y+=h;}); y+=10;
  };
  header();
  title("Resumen ejecutivo");
  const cards = [["Trabajadores",data.resumen.trabajadores],["Completos",data.resumen.completos],["Cumplimiento",data.resumen.cumplimiento===null?"No calculable":`${data.resumen.cumplimiento}%`],["Vigentes",data.resumen.vigente],["Por vencer",data.resumen.porVencer],["Vencidos",data.resumen.vencido],["Pendientes",data.resumen.pendiente],["En revision",data.resumen.enRevision],["Sin configurar",data.resumen.sinConfigurar]] as const;
  cards.forEach(([label,value],i)=>{const w=(pw-mx*2-32)/9,x=mx+i*(w+4);doc.setFillColor(241,245,249);doc.roundedRect(x,y,w,42,4,4,"F");doc.setTextColor(71,85,105);doc.setFontSize(6.5);doc.text(label,x+5,y+12);doc.setTextColor(15,53,87);doc.setFontSize(13);doc.setFont("helvetica","bold");doc.text(String(value),x+5,y+31);}); y+=55;
  if(data.resumen.sinConfigurar){doc.setFillColor(254,249,195);doc.rect(mx,y,pw-mx*2,24,"F");doc.setTextColor(133,77,14);doc.setFontSize(8);doc.text(`Alerta de cobertura parcial: ${data.resumen.sinConfigurar} trabajador(es) tienen cargos sin requisitos configurados.`,mx+8,y+15);y+=35;}
  const alerts=data.filas.flatMap(f=>f.detalles.filter(d=>["vencido","por_vencer","pendiente"].includes(d.estado)).map(d=>({f,d})));
  for(const state of ["vencido","por_vencer","pendiente"] as const){title(state==="vencido"?"Documentos vencidos":state==="por_vencer"?"Documentos que vencen dentro de 30 dias":"Documentos pendientes");const list=alerts.filter(a=>a.d.estado===state);table(["Trabajador","RUT","Cargo","Centro / area","Documento","Estado","Vencimiento","Dias"],list.length?list.map(({f,d})=>[f.nombre,f.rut,f.cargo,`${f.centro} / ${f.area}`,d.nombre,labels[d.estado],fmt(d.fechaVencimiento),d.dias===null?"-":String(d.dias)]):[["Sin registros","-","-","-","-","-","-","-"]],[105,68,96,120,150,62,70,48],list.map(()=>state));}
  title("Trabajadores o cargos sin configuracion documental"); const noCfg=data.filas.filter(f=>f.cumplimiento===null); table(["Trabajador","RUT","Cargo","Centro / area"],noCfg.length?noCfg.map(f=>[f.nombre,f.rut,f.cargo,`${f.centro} / ${f.area}`]):[["Sin registros","-","-","-"]],[190,100,180,315]);
  title("Matriz por trabajador"); table(["Trabajador","RUT","Cargo","Centro / area","Exig.","Vig.","30 dias","Venc.","Pend.","Revision","Cumpl.","Estado"],data.filas.map(f=>[f.nombre,f.rut,f.cargo,`${f.centro} / ${f.area}`,String(f.exigibles),String(f.vigente),String(f.porVencer),String(f.vencido),String(f.pendiente),String(f.enRevision),f.cumplimiento===null?"No calculable":`${f.cumplimiento}%`,f.estadoGeneral]),[100,65,90,112,38,35,40,38,38,42,55,62]);
  for(const f of data.filas){title(`${f.nombre} | ${f.rut} | ${f.cargo}`);table(["Categoria","Documento","Exigibilidad","Estado","Emision","Vencimiento","Observacion"],f.detalles.length?f.detalles.map(d=>[d.categoria,d.nombre,d.condicion,labels[d.estado],fmt(d.fechaEmision),fmt(d.fechaVencimiento),d.observacion??"-"]):[["-","Sin requisitos configurados","-","Sin configurar","-","-","-"]],[85,155,130,65,65,70,215],f.detalles.map(d=>d.estado));}
  title("Firmas"); table(["Rol","Nombre","Cargo","Firma","Fecha"],[["Elaborado por",data.generadoPor,"Usuario generador","Pendiente","Pendiente"],["Revisado por","Pendiente","Pendiente","Pendiente","Pendiente"],["Aprobado por","Pendiente","Pendiente","Pendiente","Pendiente"]],[120,190,150,150,175]);
  title("Trazabilidad"); table(["Identificador","Empresa","Alcance y filtros","Generado","Usuario","Version"],[[data.id,data.empresa.nombre,`${data.alcance}; ${data.filtros}`,new Date(data.generadoEn).toLocaleString("es-CL"),data.generadoPor,data.version]],[115,120,245,110,110,85]);
  footer(); return new Uint8Array(doc.output("arraybuffer"));
}
