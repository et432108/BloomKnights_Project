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
