import React from "react";

interface TabsResumenEmpresaProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsResumenEmpresa: React.FC<TabsResumenEmpresaProps> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: "general", label: "General" },
    { id: "gobierno", label: "Gobierno SST" },
    { id: "estructura", label: "Estructura" },
    { id: "ds44", label: "Cumplimiento DS44" },
  ];

  return (
    <div className="flex border-b">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === tab.id ? "border-b-2 border-blue-500 text-blue-500" : "text-gray-500"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default TabsResumenEmpresa;