import React from "react";
import { StatCard } from "@/components/company/StatCard";

export interface StatItem {
  id: string;
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
}

interface StatsGridProps {
  stats: StatItem[];
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.id} title={stat.title} value={stat.value} icon={stat.icon} description={stat.description} />
      ))}
    </div>
  );
}
