"use client";

import { useState, useEffect, type ChangeEvent } from "react";
import { Building2, UserCheck, MapPin, Shield, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface CompanyData {
  razonSocial: string;
  rut: string;
  tipoEmpresa: string;
  representante: string;
  rutRepresentante: string;
  direccion: string;
  comuna: string;
  region: string;
  comiteParitario: boolean;
  expertoPrevencion: boolean;
  departamentoPrevencion: boolean;
  organismoAdministrador: string;
  rubroEmpresa: string;
  cantidadTrabajadores: number;
}

interface EditCompanyModalProps {
  open: boolean;
  editingSection?: string;
  onClose: () => void;
  onSave: (data: CompanyData) => void;
  initialData: CompanyData;
}

const ORGANISMOS = [
  "ACHS",
  "IST",
  "Mutual de Seguridad CChC",
  "Mutual de Seguridad",
  "Otra"
];

const RUBROS = [
  "Construcción",
  "Manufactura",
  "Servicios",
  "Comercio",
  "Transporte",
  "Salud",
  "Educación",
  "Otro"
];

const REGIONES = [
  "Metropolitana de Santiago",
  "Valparaíso",
  "Biobío",
  "Antofagasta",
  "Coquimbo",
  "Araucanía",
  "Los Lagos",
  "Otra"
];

export function EditCompanyModal({ open, editingSection, onClose, onSave, initialData }: EditCompanyModalProps) {
  const [formData, setFormData] = useState<CompanyData>(initialData);
  const [errors, setErrors] = useState<Partial<CompanyData>>({});
  const activeSection = editingSection ?? "Empresa";
  const showCompanyInfo = activeSection === "Empresa" || activeSection === "Identificación Empresa";
  const showRepresentative = activeSection === "Empresa" || activeSection === "Representante Legal";
  const showLocation = activeSection === "Empresa" || activeSection === "Ubicación";
  const showSST = activeSection === "Empresa" || activeSection === "Configuración SST";

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const formatRut = (value: string) => {
    const cleaned = value.replace(/[^0-9kK]/g, "").toUpperCase();
    if (!cleaned) return "";

    const body = cleaned.slice(0, -1);
    const verifier = cleaned.slice(-1);
    const reversed = body.split("").reverse().join("");
    const chunked = reversed.match(/.{1,3}/g)?.join(".") || "";
    const formattedBody = chunked.split("").reverse().join("");

    return body ? `${formattedBody}-${verifier}` : cleaned;
  };

  const validateForm = () => {
    const newErrors: Partial<CompanyData> = {};

    if (showCompanyInfo) {
      if (!formData.razonSocial.trim()) newErrors.razonSocial = "Requerido";
      if (!formData.rut.trim()) newErrors.rut = "Requerido";
    }

    if (showRepresentative) {
      if (!formData.representante.trim()) newErrors.representante = "Requerido";
      if (!formData.rutRepresentante.trim()) newErrors.rutRepresentante = "Requerido";
    }

    if (showLocation) {
      if (!formData.direccion.trim()) newErrors.direccion = "Requerido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  const getSSTRecommendations = () => {
    const recommendations = [];
    if (formData.cantidadTrabajadores >= 25 && !formData.comiteParitario) {
      recommendations.push("Se recomienda implementar comité paritario (≥25 trabajadores)");
    }
    if (formData.cantidadTrabajadores >= 100 && !formData.departamentoPrevencion) {
      recommendations.push("Se recomienda departamento de prevención (≥100 trabajadores)");
    }
    return recommendations;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-emerald-600" />
            Editar {activeSection}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8">
          {showCompanyInfo && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-semibold text-slate-900">Información Empresa</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="razonSocial">Razón Social *</Label>
                  <Input
                    id="razonSocial"
                    value={formData.razonSocial}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, razonSocial: e.target.value })}
                    className={errors.razonSocial ? "border-red-500" : ""}
                  />
                  {errors.razonSocial && <p className="text-sm text-red-500">{errors.razonSocial}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rut">RUT Empresa *</Label>
                  <Input
                    id="rut"
                    value={formData.rut}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, rut: formatRut(e.target.value) })}
                    className={errors.rut ? "border-red-500" : ""}
                  />
                  {errors.rut && <p className="text-sm text-red-500">{errors.rut}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipoEmpresa">Tipo de Empresa</Label>
                  <Select value={formData.tipoEmpresa} onValueChange={(value) => setFormData({ ...formData, tipoEmpresa: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Privada">Privada</SelectItem>
                      <SelectItem value="Pública">Pública</SelectItem>
                      <SelectItem value="Mixta">Mixta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cantidadTrabajadores">Cantidad de Trabajadores</Label>
                  <Input
                    id="cantidadTrabajadores"
                    type="number"
                    value={formData.cantidadTrabajadores}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, cantidadTrabajadores: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          )}

          {showRepresentative && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <UserCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-semibold text-slate-900">Representante Legal</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="representante">Nombre *</Label>
                  <Input
                    id="representante"
                    value={formData.representante}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, representante: e.target.value })}
                    className={errors.representante ? "border-red-500" : ""}
                  />
                  {errors.representante && <p className="text-sm text-red-500">{errors.representante}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rutRepresentante">RUT *</Label>
                  <Input
                    id="rutRepresentante"
                    value={formData.rutRepresentante}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, rutRepresentante: formatRut(e.target.value) })}
                    className={errors.rutRepresentante ? "border-red-500" : ""}
                  />
                  {errors.rutRepresentante && <p className="text-sm text-red-500">{errors.rutRepresentante}</p>}
                </div>
              </div>
            </div>
          )}

          {showLocation && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-semibold text-slate-900">Ubicación</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="direccion">Dirección *</Label>
                  <Input
                    id="direccion"
                    value={formData.direccion}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, direccion: e.target.value })}
                    className={errors.direccion ? "border-red-500" : ""}
                  />
                  {errors.direccion && <p className="text-sm text-red-500">{errors.direccion}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comuna">Comuna</Label>
                  <Input
                    id="comuna"
                    value={formData.comuna}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, comuna: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Región</Label>
                  <Select value={formData.region} onValueChange={(value) => setFormData({ ...formData, region: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONES.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {showSST && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-emerald-600" />
                <h3 className="text-lg font-semibold text-slate-900">Configuración SST</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      {
                        key: "comiteParitario",
                        label: "Comité paritario",
                        description: "Obligatorio para ≥25 trabajadores",
                      },
                      {
                        key: "expertoPrevencion",
                        label: "Experto en prevención",
                        description: "Asegura experiencia técnica SST",
                      },
                      {
                        key: "departamentoPrevencion",
                        label: "Departamento de prevención",
                        description: "Obligatorio para ≥100 trabajadores",
                      },
                    ].map((item) => {
                      const active = formData[item.key as keyof CompanyData] as boolean;
                      return (
                        <button
                          type="button"
                          key={item.key}
                          onClick={() =>
                            setFormData({
                              ...formData,
                              [item.key]: !active,
                            })
                          }
                          className={`rounded-2xl border px-4 py-4 text-left transition ${
                            active
                              ? "border-emerald-500 bg-emerald-600 text-white shadow-sm"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <p className="font-semibold">{item.label}</p>
                          <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="organismoAdministrador">Organismo Administrador</Label>
                    <Select value={formData.organismoAdministrador} onValueChange={(value) => setFormData({ ...formData, organismoAdministrador: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ORGANISMOS.map((org) => (
                          <SelectItem key={org} value={org}>
                            {org}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rubroEmpresa">Rubro Empresa</Label>
                    <Select value={formData.rubroEmpresa} onValueChange={(value) => setFormData({ ...formData, rubroEmpresa: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RUBROS.map((rubro) => (
                          <SelectItem key={rubro} value={rubro}>
                            {rubro}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {getSSTRecommendations().length > 0 && (
                <div className="rounded-lg bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div className="space-y-2">
                      <h4 className="font-semibold text-amber-900">Recomendaciones SST</h4>
                      <ul className="space-y-1 text-sm text-amber-800">
                        {getSSTRecommendations().map((rec, index) => (
                          <li key={index}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-8 flex items-center justify-end gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="rounded-xl border-slate-200 bg-white px-6 py-2 text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            className="rounded-xl bg-emerald-600 px-6 py-2 text-white hover:bg-emerald-700"
          >
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
