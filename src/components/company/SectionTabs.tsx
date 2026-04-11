import React from "react";

export interface TabItem {
  value: string;
  label: string;
}

interface SectionTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tab: string) => void;
}

export function SectionTabs({ tabs, activeTab, onChange }: SectionTabsProps) {
  return (
    <div className="rounded-3xl bg-slate-100 p-2 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        {tabs.map((tab) => {
          const isActive = tab.value === activeTab;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              className={`min-w-[170px] rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:bg-white/90 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
