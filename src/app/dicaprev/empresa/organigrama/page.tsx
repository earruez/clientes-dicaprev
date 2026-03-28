"use client";
import React, { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Page() {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full min-h-screen bg-slate-50 p-8 flex flex-col gap-8">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Organigrama</h1>
          <p className="text-slate-500">Subtítulo premium estilo Centros de Trabajo.</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-6 py-2 shadow-sm" onClick={()=>setOpen(true)}>
          Nuevo
        </Button>
      </div>

      <Card className="border border-slate-200 shadow-sm rounded-2xl bg-white">
        <CardHeader>
          <h2 className="text-lg font-semibold text-slate-900">Listado</h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {/* FUTURO CONTENIDO PREMIUM */}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Crear nuevo</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label>Nombre</Label>
              <Input placeholder="Escribe aquí..." />
            </div>
          </div>

          <DialogFooter className="flex justify-end gap-3">
            <Button variant="outline" onClick={()=>setOpen(false)} className="rounded-xl">
              Cancelar
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
