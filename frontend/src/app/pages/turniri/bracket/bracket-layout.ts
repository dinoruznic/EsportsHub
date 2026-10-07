import { Bracket, BracketMatch, MatchStatus, TeamBrief } from '../../../core/api/models';

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

export function roundLabel(name: string | null, roundNumber: number): string {
  if (!name) {
    return `Runda ${roundNumber}`;
  }
  return ROUND_LABELS[name.trim().toLowerCase()] ?? name;
}

export function monogram(team: TeamBrief): string {
  return (team.tag || team.name).replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase();
}

export function buildBracket(bracket: Bracket, seeds: Record<number, number>): RoundColumn[] {
  const rounds = [...bracket.rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const ordered: BracketMatch[][] = [];

  rounds.forEach((round, index) => {
    if (index === 0) {
      ordered.push([...round.matches].sort((a, b) => a.id - b.id));
      return;
    }
    const previous = ordered[index - 1];
    const position = (match: BracketMatch) => {
      const feeders = previous
        .map((candidate, at) => (candidate.nextMatchId === match.id ? at : -1))
        .filter((at) => at >= 0);
      return feeders.length > 0 ? Math.min(...feeders) : Number.MAX_SAFE_INTEGER;
    };
    ordered.push([...round.matches].sort((a, b) => position(a) - position(b) || a.id - b.id));
  });

  const numbers = new Map<number, number>();
  ordered.flat().forEach((match, index) => numbers.set(match.id, index + 1));

  const all = ordered.flat();
  const feedersOf = (match: BracketMatch) =>
    all.filter((candidate) => candidate.nextMatchId === match.id).sort((a, b) => a.id - b.id);

  return rounds.map((round, index) => ({
    roundNumber: round.roundNumber,
    label: roundLabel(round.name, round.roundNumber),
    matches: ordered[index].map((match) => {
      const feeders = feedersOf(match);
      return {
        id: match.id,
        number: numbers.get(match.id)!,
        status: match.status,
        statusLabel: STATUS_LABELS[match.status] ?? match.status,
        nextMatchId: match.nextMatchId,
        decided: match.winnerTeamId !== null,
        slots: [
          slot(match, match.teamA, match.scoreA, feeders[0], numbers, seeds),
          slot(match, match.teamB, match.scoreB, feeders[1], numbers, seeds),
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
): SlotView {
  const played = match.status === 'LIVE' || match.status === 'FINISHED';
  const winner = !!team && match.winnerTeamId === team.id;
  return {
    team,
    seed: team ? (seeds[team.id] ?? null) : null,
    monogram: team ? monogram(team) : '',
    placeholder: feeder ? `Pobjednik meča ${numbers.get(feeder.id)}` : 'Čeka se',
    score: team && played ? (score ?? 0) : null,
    winner,
    loser: !!team && match.winnerTeamId !== null && !winner,
  };
}
