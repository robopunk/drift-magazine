import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-12">
        <Skeleton className="h-10 w-96 mx-auto mb-4" />
        <Skeleton className="h-5 w-64 mx-auto mb-8" />
        <Skeleton className="h-10 w-80 mx-auto rounded-lg" />
      </div>
      <Skeleton className="h-5 w-32 mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
