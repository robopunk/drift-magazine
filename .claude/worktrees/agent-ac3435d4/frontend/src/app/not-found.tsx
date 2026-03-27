import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <h1 className="font-serif text-3xl font-bold text-foreground">
        Company Not Found
      </h1>
      <p className="mt-4 font-sans text-muted-foreground">
        This company isn&apos;t tracked by Drift yet. Please check the ticker and try again.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block px-6 py-2 bg-primary text-primary-foreground rounded-lg font-sans text-sm hover:opacity-90 transition-opacity"
      >
        Browse All Companies
      </Link>
    </div>
  );
}
