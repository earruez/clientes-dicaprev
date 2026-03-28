
import React, { ReactNode, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type TabsPlanProps = {
  children: ReactNode[];
};

export default function TabsPlan({ children }: TabsPlanProps) {
  const [tab, setTab] = useState("matriz");

  const [matriz, cursos, plantillas, normativa] = children as ReactNode[];

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="bg-transparent px-1 md:px-4 pt-4 pb-0 justify-start flex flex-wrap gap-2">
        <TabsTrigger value="matriz" className="rounded-full text-xs md:text-sm px-4">
          Matriz por rol
        </TabsTrigger>
        <TabsTrigger value="cursos" className="rounded-full text-xs md:text-sm px-4">
          Cursos por cargo
        </TabsTrigger>
        <TabsTrigger value="plantillas" className="rounded-full text-xs md:text-sm px-4">
          Plantillas
        </TabsTrigger>
        <TabsTrigger value="normativa" className="rounded-full text-xs md:text-sm px-4">
          Normativa aplicable
        </TabsTrigger>
      </TabsList>

      <TabsContent value="matriz" className="pt-3">
        {matriz}
      </TabsContent>
      <TabsContent value="cursos" className="pt-3">
        {cursos}
      </TabsContent>
      <TabsContent value="plantillas" className="pt-3">
        {plantillas}
      </TabsContent>
      <TabsContent value="normativa" className="pt-3">
        {normativa}
      </TabsContent>
    </Tabs>
  );
}
