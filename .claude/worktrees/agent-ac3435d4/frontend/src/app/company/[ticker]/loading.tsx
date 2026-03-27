import { Skeleton } from "@/components/ui/Skeleton";

export default function CompanyLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <Skeleton className="h-6 w-16 mb-2 rounded" />
          <Skeleton className="h-8 w-64 mb-1" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-12 w-16" />
      </div>
      <div className="flex gap-4 border-b border-border mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 mb-2" />
        ))}
      </div>
      <Skeleton className="h-[400px] rounded-lg" />
    </div>
  );
}
