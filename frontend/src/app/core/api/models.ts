export type TournamentStatus =
  'PENDING' | 'REGISTRATION' | 'REJECTED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';

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
  refereeUsername?: string | null;
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

export interface Me {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  roles: string[];
  createdAt: string;
}

export interface PlayerTeam {
  id: number;
  name: string;
  tag: string;
  gameCode: string;
  captain: boolean;
}

export interface PlayerProfile {
  username: string;
  displayName: string | null;
  roles: string[];
  createdAt: string;
  teams: PlayerTeam[];
}

export type MarketStatus = 'INACTIVE' | 'AVAILABLE';

export interface GameAccount {
  id: number;
  ownerUsername: string;
  gameCode: string;
  gameName: string;
  inGameName: string;
  region: string | null;
  position: string | null;
  rank: string | null;
  rating: number | null;
  marketStatus: MarketStatus;
  createdAt: string;
}

export interface GameAccountRequest {
  gameId?: number;
  inGameName: string;
  regionId: number | null;
  positionId: number | null;
  rankId: number | null;
  rating: number | null;
  marketStatus?: MarketStatus;
}

export interface GameOption {
  id: number;
  code: string;
  label: string;
}

export interface Listing {
  id: number;
  gameAccountId: number;
  ownerUsername: string;
  gameCode: string;
  inGameName: string;
  rank: string | null;
  position: string | null;
  rating: number | null;
  askingPrice: number | null;
  status: string;
  createdAt: string;
  offerCount: number;
}

export interface Offer {
  id: number;
  listingId: number;
  fromTeamId: number;
  fromTeamName: string;
  amount: number | null;
  message: string | null;
  status: string;
  createdAt: string;
  respondedAt: string | null;
}

export type OfferStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN';

export interface TeamMember {
  membershipId: number;
  gameAccountId: number;
  inGameName: string;
  ownerUsername: string;
  rank: string | null;
  position: string | null;
  rating: number | null;
  roleInTeam: string | null;
  active: boolean;
}

export interface TeamDetail {
  team: Team;
  members: TeamMember[];
}

export interface CreateTeamRequest {
  name: string;
  tag: string;
  gameId: number;
  region: string | null;
  logoUrl: string | null;
}

export interface Contract {
  id: number;
  gameAccountId: number;
  inGameName: string;
  teamId: number;
  teamName: string;
  salary: number | null;
  startDate: string | null;
  endDate: string | null;
  status: string;
  createdAt: string;
}

export interface MakeOfferRequest {
  teamId: number;
  amount: number;
  message: string | null;
}

export interface MyOffer {
  id: number;
  listingId: number;
  listingStatus: string;
  teamId: number;
  teamName: string;
  teamTag: string;
  gameAccountId: number;
  inGameName: string;
  gameCode: string;
  ownerUsername: string;
  amount: number | null;
  message: string | null;
  status: OfferStatus;
  createdAt: string;
  respondedAt: string | null;
}

export interface RefereeMatch {
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
  winnerTeamId: number | null;
  nextMatchId: number | null;
  refereeUsername: string | null;
  startedAt: string | null;
  endedAt: string | null;
  lastSnapshotAt: string | null;
}

export interface Referee {
  username: string;
  displayName: string | null;
}
