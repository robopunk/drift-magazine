interface Searchable {
  name: string;
  ticker: string;
  exchange: string | null;
}

export function filterCompanies<T extends Searchable>(
  companies: T[],
  query: string
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return companies;
  return companies.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.ticker.toLowerCase().includes(q) ||
      (c.exchange && c.exchange.toLowerCase().includes(q))
  );
}
