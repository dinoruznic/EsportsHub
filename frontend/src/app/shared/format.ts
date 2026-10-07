const MONTHS = ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

export function formatNumber(value: number): string {
  const sign = value < 0 ? '-' : '';
  const digits = String(Math.round(Math.abs(value)));
  return sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatKm(value: number): string {
  return `${formatNumber(value)} KM`;
}

export function formatDate(value: string): string {
  const date = new Date(value);
  return `${date.getDate()}. ${MONTHS[date.getMonth()]} ${date.getFullYear()}.`;
}

export function isPowerOfTwo(value: number): boolean {
  return value >= 2 && (value & (value - 1)) === 0;
}
