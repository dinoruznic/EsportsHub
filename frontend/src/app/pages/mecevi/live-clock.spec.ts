import { TestBed } from '@angular/core/testing';
import { LiveClock } from './live-clock';
import { clockView, staleAge } from './match-format';

describe('live clock', () => {
  const now = Date.parse('2026-10-08T12:00:00Z');

  it('runs the clock while data is fresh', () => {
    expect(clockView(754, now - 5000, now)).toEqual({ state: 'live', time: '12:39', note: null });
  });

  it('freezes the clock and says how old the data is once it is stale', () => {
    expect(clockView(754, now - 30000, now)).toEqual({
      state: 'stale',
      time: '12:34',
      note: 'zadnji podatak prije 30 s',
    });
    expect(clockView(754, now - 6 * 60000, now).note).toBe('zadnji podatak prije 6 min');
  });

  it('waits for the first data from the game', () => {
    expect(clockView(null, null, now)).toEqual({
      state: 'waiting',
      time: null,
      note: 'Čeka se prvi podatak iz igre',
    });
  });

  it('rounds the age to 30 seconds so the text changes only every 30 s', () => {
    expect(staleAge(30000)).toBe('30 s');
    expect(staleAge(59000)).toBe('30 s');
    expect(staleAge(61000)).toBe('1 min');
    expect(staleAge(3 * 3600000)).toBe('3 h');
    expect(staleAge(24 * 3600000)).toBe('1 dan');
    expect(staleAge(9 * 24 * 3600000)).toBe('9 dana');
  });

  it('renders the live, stale and waiting states', async () => {
    const fixture = TestBed.createComponent(LiveClock);
    const element = fixture.nativeElement as HTMLElement;
    const render = async (seconds: number | null, at: number | null) => {
      fixture.componentRef.setInput('view', clockView(seconds, at, now));
      await fixture.whenStable();
      return Array.from(element.querySelectorAll('.clock-time, .clock-wait, .clock-note'))
        .map((part) => part.textContent!.trim())
        .join(' | ');
    };

    expect(await render(100, now)).toBe('01:40');
    expect(element.getAttribute('data-state')).toBe('live');
    expect(element.querySelector('.dot')).not.toBeNull();

    expect(await render(100, now - 120000)).toBe('01:40 | zadnji podatak prije 2 min');
    expect(element.getAttribute('data-state')).toBe('stale');
    expect(element.querySelector('.dot')).toBeNull();

    expect(await render(null, null)).toBe('Čeka se prvi podatak iz igre');
    expect(element.getAttribute('data-state')).toBe('waiting');
  });
});
