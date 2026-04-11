import React from "react";
import { CardHeader } from "@/components/company/CardHeader";

interface InfoCardProps {
  title: string;
  icon: React.ReactNode;
  onEdit?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function InfoCard({ title, icon, onEdit, children, className = "" }: InfoCardProps) {
  return (
    <article className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${className}`}>
      <CardHeader title={title} icon={icon} onEdit={onEdit} />
      <div className="mt-6 grid gap-6">{children}</div>
    </article>
  );
}
