import { Bracket, BracketMatch, BracketRound, MatchStatus, Registration, TeamBrief } from '../../../core/api/models';
import { isPowerOfTwo } from '../../../shared/format';
import { initials } from '../../../shared/team-hex/team-hex';

export interface SlotView {
  team: TeamBrief | null;
  seed: number | null;
  monogram: string;
  placeholder: string;
  score: number | null;
  winner: boolean;
  loser: boolean;
}

export interface MatchCard {
  id: number;
  number: number;
  status: MatchStatus;
  statusLabel: string;
  nextMatchId: number | null;
  decided: boolean;
  slots: [SlotView, SlotView];
}

export interface RoundColumn {
  roundNumber: number;
  label: string;
  matches: MatchCard[];
}

const STATUS_LABELS: Record<MatchStatus, string> = {
  SCHEDULED: 'Zakazan',
  LIVE: 'Uživo',
  FINISHED: 'Završen',
  CANCELLED: 'Otkazan',
};

const ROUND_LABELS: Record<string, string> = {
  cetvrtfinale: 'Četvrtfinale',
  polufinale: 'Polufinale',
  finale: 'Finale',
};

export function roundLabel(name: string | null, roundNumber: number, matchCount?: number): string {
  const known = name ? ROUND_LABELS[name.trim().toLowerCase()] : undefined;
  if (known) {
    return known;
  }
  if (matchCount === 8) {
    return 'Osmina finala';
  }
  return name || `Runda ${roundNumber}`;
}

export interface ChampionInfo {
  champion: TeamBrief;
  finalist: TeamBrief | null;
  championScore: number;
  finalistScore: number;
  finalMatchId: number;
}

export function findChampion(bracket: Bracket): ChampionInfo | null {
  const rounds = [...bracket.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const final = rounds.at(-1)?.matches.find((match) => match.nextMatchId === null) ?? null;
  if (!final || final.winnerTeamId === null) {
    return null;
  }
  const championIsA = final.teamA?.id === final.winnerTeamId;
  const champion = championIsA ? final.teamA : final.teamB;
  if (!champion) {
    return null;
  }
  return {
    champion,
    finalist: championIsA ? final.teamB : final.teamA,
    championScore: (championIsA ? final.scoreA : final.scoreB) ?? 0,
    finalistScore: (championIsA ? final.scoreB : final.scoreA) ?? 0,
    finalMatchId: final.id,
  };
}

export function monogram(team: TeamBrief): string {
  return initials(team.tag || team.name);
}

export function seedOrder(size: number): number[] {
  let order = [1];
  for (let m = 1; m < size; m *= 2) {
    order = order.flatMap((seed) => [seed, 2 * m + 1 - seed]);
  }
  return order;
}

function backendRoundName(roundNumber: number, matchCount: number): string {
  switch (matchCount) {
    case 1:
      return 'Finale';
    case 2:
      return 'Polufinale';
    case 4:
      return 'Cetvrtfinale';
    default:
      return `Runda ${roundNumber}`;
  }
}

export function previewBracket(maxTeams: number | null, registrations: Registration[]): Bracket | null {
  if (!maxTeams || !isPowerOfTwo(maxTeams)) {
    return null;
  }
  const teams: (TeamBrief | null)[] = Array.from({ length: maxTeams }, (_, index) => {
    const registration = registrations[index];
    return registration
      ? { id: registration.teamId, name: registration.teamName, tag: registration.teamTag }
      : null;
  });
  const order = seedOrder(maxTeams);
  const rounds: BracketRound[] = [];
  let nextId = -1;
  let matchCount = maxTeams / 2;
  for (let roundNumber = 1; matchCount >= 1; roundNumber++, matchCount /= 2) {
    const matches: BracketMatch[] = Array.from({ length: matchCount }, (_, index) => ({
      id: nextId--,
      status: 'SCHEDULED',
      teamA: roundNumber === 1 ? teams[order[2 * index] - 1] : null,
      teamB: roundNumber === 1 ? teams[order[2 * index + 1] - 1] : null,
      scoreA: null,
      scoreB: null,
      winnerTeamId: null,
      nextMatchId: null,
    }));
    rounds.push({ roundNumber, name: backendRoundName(roundNumber, matchCount), matches });
  }
  rounds.forEach((round, index) => {
    const next = rounds[index + 1];
    round.matches.forEach((match, at) => (match.nextMatchId = next ? next.matches[Math.floor(at / 2)].id : null));
  });
  return { tournamentId: 0, tournamentName: '', status: 'REGISTRATION', rounds };
}

export function buildBracket(bracket: Bracket, seeds: Record<number, number>, preview = false): RoundColumn[] {
  const rounds = [...bracket.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const ordered: BracketMatch[][] = [];

  rounds.forEach((round, index) => {
    if (index === 0) {
      ordered.push(preview ? [...round.matches] : [...round.matches].sort((a, b) => a.id - b.id));
      return;
    }
    const previous = ordered[index - 1];
    const position = (match: BracketMatch) => {
      const feeders = previous
        .map((candidate, at) => (candidate.nextMatchId === match.id ? at : -1))
        .filter((at) => at >= 0);
      return feeders.length > 0 ? Math.min(...feeders) : Number.MAX_SAFE_INTEGER;
    };
    ordered.push([...round.matches].sort((a, b) => position(a) - position(b) || Math.abs(a.id) - Math.abs(b.id)));
  });

  const numbers = new Map<number, number>();
  ordered.flat().forEach((match, index) => numbers.set(match.id, index + 1));

  const all = ordered.flat();
  const feedersOf = (match: BracketMatch) =>
    all
      .filter((candidate) => candidate.nextMatchId === match.id)
      .sort((a, b) => Math.abs(a.id) - Math.abs(b.id));

  return rounds.map((round, index) => ({
    roundNumber: round.roundNumber,
    label: roundLabel(round.name, round.roundNumber, round.matches.length),
    matches: ordered[index].map((match) => {
      const feeders = feedersOf(match);
      return {
        id: match.id,
        number: numbers.get(match.id)!,
        status: match.status,
        statusLabel: preview ? 'Pregled' : (STATUS_LABELS[match.status] ?? match.status),
        nextMatchId: match.nextMatchId,
        decided: match.winnerTeamId !== null,
        slots: [
          slot(match, match.teamA, match.scoreA, feeders[0], numbers, seeds, preview),
          slot(match, match.teamB, match.scoreB, feeders[1], numbers, seeds, preview),
        ],
      };
    }),
  }));
}

function slot(
  match: BracketMatch,
  team: TeamBrief | null,
  score: number | null,
  feeder: BracketMatch | undefined,
  numbers: Map<number, number>,
  seeds: Record<number, number>,
  preview: boolean,
): SlotView {
  const played = match.status === 'LIVE' || match.status === 'FINISHED';
  const winner = !!team && match.winnerTeamId === team.id;
  return {
    team,
    seed: team ? (seeds[team.id] ?? null) : null,
    monogram: team ? monogram(team) : '',
    placeholder: feeder ? `Pobjednik meča ${numbers.get(feeder.id)}` : preview ? 'Slobodno mjesto' : 'Čeka se',
    score: team && played ? (score ?? 0) : null,
    winner,
    loser: !!team && match.winnerTeamId !== null && !winner,
  };
}
