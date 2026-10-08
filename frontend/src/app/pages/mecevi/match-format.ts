import { BracketMatch, TeamBrief } from '../../core/api/models';

export function formatClock(seconds: number | null): string {
  if (seconds === null || seconds < 0) {
    return '--:--';
  }
  const whole = Math.floor(seconds);
  const minutes = String(Math.floor(whole / 60)).padStart(2, '0');
  const rest = String(whole % 60).padStart(2, '0');
  return `${minutes}:${rest}`;
}

export function formatGold(value: number | null): string {
  if (value === null) {
    return '—';
  }
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value);
}

export function goldLead(goldA: number | null, goldB: number | null): string | null {
  if (goldA === null || goldB === null) {
    return null;
  }
  const diff = goldA - goldB;
  if (diff === 0) {
    return 'izjednačeno';
  }
  return `+${formatGold(Math.abs(diff))} ${diff > 0 ? 'BLUE' : 'RED'}`;
}

export function share(a: number | null, b: number | null): number {
  const left = a ?? 0;
  const right = b ?? 0;
  return left + right === 0 ? 50 : (left / (left + right)) * 100;
}

export function teamName(match: BracketMatch | null, teamId: unknown): string {
  const teams: (TeamBrief | null)[] = match ? [match.teamA, match.teamB] : [];
  return teams.find((team) => team && team.id === Number(teamId))?.name ?? 'tim';
}

export function localTime(iso: string): string {
  const date = new Date(iso);
  return [date.getHours(), date.getMinutes(), date.getSeconds()]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

export const MAX_CLOCK_DRIFT_MS = 120000;

export function liveClock(seconds: number, at: number, now: number): string {
  const elapsed = Math.min(Math.max(0, now - at), MAX_CLOCK_DRIFT_MS);
  return formatClock(seconds + Math.floor(elapsed / 1000));
}

export const STALE_SNAPSHOT_MS = 30000;

export type ClockState = 'live' | 'stale' | 'waiting';

export interface ClockView {
  state: ClockState;
  time: string | null;
  note: string | null;
}

export function staleAge(ms: number): string {
  const seconds = Math.floor(Math.max(0, ms) / STALE_SNAPSHOT_MS) * (STALE_SNAPSHOT_MS / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (seconds < 60) {
    return `${seconds} s`;
  }
  if (minutes < 60) {
    return `${minutes} min`;
  }
  if (hours < 24) {
    return `${hours} h`;
  }
  return days === 1 ? '1 dan' : `${days} dana`;
}

export function clockView(seconds: number | null, at: number | null, now: number): ClockView {
  if (seconds === null || at === null) {
    return { state: 'waiting', time: null, note: 'Čeka se prvi podatak iz igre' };
  }
  const age = Math.max(0, now - at);
  if (age >= STALE_SNAPSHOT_MS) {
    return {
      state: 'stale',
      time: formatClock(seconds),
      note: `zadnji podatak prije ${staleAge(age)}`,
    };
  }
  return { state: 'live', time: liveClock(seconds, at, now), note: null };
}
