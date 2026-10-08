import { BracketMatch } from '../api/models';

export type MatchEventType =
  | 'REFEREE_ASSIGNED'
  | 'STARTED'
  | 'SCORE_UPDATED'
  | 'FINISHED'
  | 'WINNER_ADVANCED'
  | 'TOURNAMENT_COMPLETED'
  | 'LIVE_SNAPSHOT';

export interface MatchTopicMessage {
  type: MatchEventType;
  actor: string | null;
  match: BracketMatch;
  data: Record<string, unknown> | null;
  at: string;
}

export interface TournamentTopicMessage extends MatchTopicMessage {
  matchId: number;
}

export interface SnapshotStats {
  gameTimeSeconds: number | null;
  killsA: number | null;
  killsB: number | null;
  goldA: number | null;
  goldB: number | null;
  towersA: number | null;
  towersB: number | null;
}

export function matchTopic(matchId: number): string {
  return `/topic/matches/${matchId}`;
}

export function tournamentTopic(tournamentId: number): string {
  return `/topic/tournaments/${tournamentId}`;
}
