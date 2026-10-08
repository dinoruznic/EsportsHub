import { formatNumber } from '../../shared/format';

const TIER_COLORS: Record<string, string> = {
  iron: '#6B6B6B',
  bronze: '#A5703C',
  silver: '#A7B4C0',
  gold: '#E2B154',
  platinum: '#3FB8A8',
  emerald: '#2FAE6B',
  diamond: '#6A8DFF',
  ascendant: '#2FAE6B',
  immortal: '#C9405A',
  master: '#9B59D0',
  grandmaster: '#D94848',
  challenger: '#F2D27A',
  radiant: '#F2D27A',
};

export function tierKey(rank: string | null): string {
  return (rank ?? '').trim().split(/\s+/)[0].toLowerCase();
}

export function tierColor(rank: string | null): string | null {
  return TIER_COLORS[tierKey(rank)] ?? null;
}

export function rankLabel(rank: string | null): string {
  if (!rank) {
    return '';
  }
  return rank
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export interface InGameName {
  name: string;
  tag: string | null;
}

export function splitRiotTag(inGameName: string): InGameName {
  const index = inGameName.lastIndexOf('#');
  if (index <= 0 || index === inGameName.length - 1) {
    return { name: inGameName.trim(), tag: null };
  }
  return { name: inGameName.slice(0, index).trim(), tag: `#${inGameName.slice(index + 1).trim()}` };
}

export function formatRating(rating: number): string {
  return formatNumber(rating);
}

export function ratingLabel(gameCode: string): string {
  switch (gameCode) {
    case 'CS2':
      return 'Premier rating';
    case 'DOTA2':
      return 'MMR';
    default:
      return 'Rating';
  }
}

export function offersLabel(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (last === 1 && lastTwo !== 11) {
    return `${count} ponuda`;
  }
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) {
    return `${count} ponude`;
  }
  return `${count} ponuda`;
}
