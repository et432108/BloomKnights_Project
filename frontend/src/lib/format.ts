export const currency = (n: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);

export const percent = (n: number): string => `${Math.round(n)}%`;

/** Clamp a 0..1 ratio for progress bars. */
export const ratio = (current: number, target: number): number => {
  if (!target) return 0;
  return Math.max(0, Math.min(1, current / target));
};

/** Short, locale-friendly date, e.g. "Jul 11, 2026". Falls back gracefully. */
export const shortDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

/** Human label for a payoff horizon in months, e.g. "1 yr 4 mo". */
export const monthsLabel = (months: number): string => {
  if (months <= 0) return "Paid off";
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mo`;
  if (m === 0) return `${y} yr`;
  return `${y} yr ${m} mo`;
};
