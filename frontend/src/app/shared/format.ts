const numberFormat = new Intl.NumberFormat('bs-BA', { maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat('bs-BA', { day: 'numeric', month: 'short', year: 'numeric' });

export function formatKm(value: number): string {
  return `${numberFormat.format(value)} KM`;
}

export function formatDate(value: string): string {
  return dateFormat.format(new Date(value));
}

export function isPowerOfTwo(value: number): boolean {
  return value >= 2 && (value & (value - 1)) === 0;
}
