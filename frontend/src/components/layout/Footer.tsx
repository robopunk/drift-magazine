import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-[var(--forced-dark-bg)] text-[var(--forced-dark-text)] border-t border-[var(--forced-dark-card)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link href="/" className="font-serif text-lg font-bold text-white tracking-tight">
          Drift<span className="text-[var(--forced-dark-accent)]">.</span>
        </Link>
        <nav className="flex gap-6 text-sm">
          <Link href="/" className="hover:text-white transition-colors">Companies</Link>
          <Link href="/about" className="hover:text-white transition-colors">About</Link>
          <Link href="/about#methodology" className="hover:text-white transition-colors">Methodology</Link>
        </nav>
        <p className="text-xs text-[var(--muted-foreground)]">
          &copy; {new Date().getFullYear()} Drift. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
