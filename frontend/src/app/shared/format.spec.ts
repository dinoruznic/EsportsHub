import { formatDate, formatKm, isPowerOfTwo } from './format';

describe('format', () => {
  it('formats amounts in KM with dots between thousands', () => {
    expect(formatKm(0)).toBe('0 KM');
    expect(formatKm(950)).toBe('950 KM');
    expect(formatKm(1500)).toBe('1.500 KM');
    expect(formatKm(1250000)).toBe('1.250.000 KM');
  });

  it('formats dates in Bosnian', () => {
    expect(formatDate('2026-10-20T12:00:00')).toBe('20. okt 2026.');
    expect(formatDate('2026-05-01T12:00:00')).toBe('1. maj 2026.');
  });

  it('accepts only powers of two from 2 up', () => {
    expect([0, 1, 2, 3, 4, 6, 8, 16].filter(isPowerOfTwo)).toEqual([2, 4, 8, 16]);
  });
});
