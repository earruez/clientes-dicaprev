import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-72" />
          </div>
        </div>
        <Skeleton className="h-14 w-40 rounded-xl" />
      </div>

      {/* Activation card */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="grid xl:grid-cols-2">
          <div className="border-b border-slate-200 bg-slate-900 p-6 xl:border-b-0 xl:border-r">
            <div className="space-y-4">
              <Skeleton className="h-3 w-32 bg-slate-700" />
              <Skeleton className="h-7 w-56 bg-slate-700" />
              <Skeleton className="h-4 w-full bg-slate-700" />
              <Skeleton className="h-4 w-3/4 bg-slate-700" />
              <div className="mt-6 rounded-2xl bg-slate-800 p-4 space-y-3">
                <Skeleton className="h-10 w-24 bg-slate-700" />
                <Skeleton className="h-2 w-full rounded-full bg-slate-700" />
              </div>
              <div className="flex gap-3 pt-2">
                <Skeleton className="h-9 w-40 rounded-xl bg-slate-700" />
                <Skeleton className="h-9 w-48 rounded-xl bg-slate-700" />
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-40" />
              </div>
              <Skeleton className="h-4 w-28" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-12 w-12 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom two-column section */}
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-3 w-64" />
              </div>
              <Skeleton className="h-16 w-32 rounded-2xl" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-7 w-10" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
