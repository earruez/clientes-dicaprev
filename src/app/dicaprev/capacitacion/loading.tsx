import { Skeleton } from "@/components/ui/skeleton";

export default function CapacitacionLoading() {
  return (
    <div className="min-h-screen bg-slate-50/80">
      <div className="py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-44" />
              <Skeleton className="h-3 w-72" />
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm w-fit">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-32 rounded-xl" />
          ))}
        </div>

        {/* Content area */}
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center gap-4 border-b border-slate-200 bg-slate-50/70 px-5 py-3">
              {[200, 120, 100, 100, 80].map((w, i) => (
                <Skeleton key={i} className="h-3" style={{ width: w }} />
              ))}
            </div>
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-7 w-24 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
