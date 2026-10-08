export type TournamentStatus =
  | 'PENDING'
  | 'REGISTRATION'
  | 'REJECTED'
  | 'ONGOING'
  | 'COMPLETED'
  | 'CANCELLED';

export type RegistrationStatus = 'REGISTERED' | 'WITHDRAWN';

export type MatchStatus = 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CANCELLED';

export interface Game {
  id: number;
  code: string;
  name: string;
  hasLiveApi: boolean;
  rankType: string;
}

export interface Tournament {
  id: number;
  name: string;
  gameCode: string;
  format: string;
  maxTeams: number | null;
  status: TournamentStatus;
  prizePool: number | null;
  startDate: string | null;
  organizerUsername: string;
  createdAt: string;
}

export interface CreateTournamentRequest {
  name: string;
  gameId: number;
  format: string;
  maxTeams: number | null;
  prizePool: number | null;
  startDate: string | null;
}

export interface Registration {
  id: number;
  tournamentId: number;
  teamId: number;
  teamName: string;
  teamTag: string;
  status: RegistrationStatus;
  seed: number | null;
  registeredAt: string;
}

export interface TeamBrief {
  id: number;
  name: string;
  tag: string;
}

export interface BracketMatch {
  id: number;
  status: MatchStatus;
  teamA: TeamBrief | null;
  teamB: TeamBrief | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerTeamId: number | null;
  nextMatchId: number | null;
  tournamentId?: number | null;
  tournamentName?: string | null;
  gameCode?: string | null;
  roundName?: string | null;
}

export interface BracketRound {
  roundNumber: number;
  name: string;
  matches: BracketMatch[];
}

export interface Bracket {
  tournamentId: number;
  tournamentName: string;
  status: TournamentStatus;
  rounds: BracketRound[];
}

export interface Team {
  id: number;
  name: string;
  tag: string;
  logoUrl: string | null;
  region: string | null;
  gameCode: string;
  captainUsername: string;
  budget: number | null;
  memberCount: number;
  createdAt: string;
}

export const TOURNAMENT_FORMATS: { value: string; label: string }[] = [
  { value: 'SINGLE_ELIMINATION', label: 'Single elimination' },
];

export function formatLabel(format: string): string {
  return TOURNAMENT_FORMATS.find((item) => item.value === format)?.label ?? format;
}

export interface LiveSnapshot {
  matchId: number;
  capturedAt: string;
  gameTimeSeconds: number | null;
  killsA: number | null;
  killsB: number | null;
  goldA: number | null;
  goldB: number | null;
  towersA: number | null;
  towersB: number | null;
}

export interface MatchEventRecord {
  id: number;
  matchId: number;
  type: string;
  source: string;
  actor: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export interface LiveMatch {
  matchId: number;
  status: MatchStatus;
  tournamentId: number;
  tournamentName: string;
  gameCode: string;
  roundNumber: number | null;
  roundName: string | null;
  teamA: TeamBrief | null;
  teamB: TeamBrief | null;
  scoreA: number | null;
  scoreB: number | null;
  startedAt: string | null;
}
