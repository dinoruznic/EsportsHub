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
