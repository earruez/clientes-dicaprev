import { isValidElement, type ReactNode, type ComponentType } from "react";
import { cn } from "@/lib/utils";

type StandardPageHeaderProps = {
  moduleLabel: string;
  title: string;
  description: string;
  icon: ReactNode | ComponentType<{ className?: string }>;
  actions?: ReactNode;
  className?: string;
  iconWrapClassName?: string;
};

export default function StandardPageHeader({
  moduleLabel,
  title,
  description,
  icon,
  actions,
  className,
  iconWrapClassName,
}: StandardPageHeaderProps) {
  const iconContent = isValidElement(icon)
    ? icon
    : (() => {
        const IconComponent = icon as ComponentType<{ className?: string }>;
        return <IconComponent className="h-5 w-5" />;
      })();

  return (
    <div className={cn("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white",
              iconWrapClassName,
            )}
          >
            {iconContent}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{moduleLabel}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
        </div>

        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
