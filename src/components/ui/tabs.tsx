// src/components/ui/tabs.tsx
"use client";

import * as React from "react";

type TabsContextType = {
  value: string;
  setValue: (v: string) => void;
};

const TabsCtx = React.createContext<TabsContextType | null>(null);

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  className,
  children,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (v: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? "");
  const isControlled = value !== undefined;
  const current = isControlled ? (value as string) : internal;

  const setValue = (v: string) => {
    if (!isControlled) setInternal(v);
    onValueChange?.(v);
  };

  React.useEffect(() => {
    if (!current) {
      const first = React.Children.toArray(children).find(
        (c: any) => c?.type?.displayName === "TabsList"
      ) as any;
      if (first) {
        const firstTrigger = React.Children.toArray(first.props.children).find(
          (c: any) => c?.type?.displayName === "TabsTrigger"
        ) as any;
        if (firstTrigger?.props?.value) setValue(firstTrigger.props.value);
      }
    }
  }, []);

  return (
    <TabsCtx.Provider value={{ value: current, setValue }}>
      <div className={className}>{children}</div>
    </TabsCtx.Provider>
  );
}

export function TabsList({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={
        "inline-flex w-full gap-2 rounded-xl bg-gray-100 p-1 " + (className ?? "")
      }
      role="tablist"
    >
      {children}
    </div>
  );
}
TabsList.displayName = "TabsList";

export function TabsTrigger({
  value,
  children,
}: {
  value: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsCtx);
  if (!ctx) throw new Error("TabsTrigger must be used within <Tabs>");
  const active = ctx.value === value;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={() => ctx.setValue(value)}
      className={
        "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition " +
        (active
          ? "bg-white shadow text-gray-900"
          : "text-gray-600 hover:bg-white/60 hover:text-gray-900")
      }
    >
      {children}
    </button>
  );
}
TabsTrigger.displayName = "TabsTrigger";

export function TabsContent({
  value,
  children,
  className,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(TabsCtx);
  if (!ctx) throw new Error("TabsContent must be used within <Tabs>");
  if (ctx.value !== value) return null;
  return <div className={className}>{children}</div>;
}
TabsContent.displayName = "TabsContent";