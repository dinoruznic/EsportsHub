import { BracketMatch, MatchEventRecord } from '../../core/api/models';
import { MatchTopicMessage } from '../../core/realtime/messages';
import { formatClock, localTime, teamName } from './match-format';

export type FeedSource = 'RIOT' | 'SUDIJA' | 'SERVER';

export interface FeedEntry {
  key: string;
  type: string;
  source: FeedSource;
  time: string;
  text: string;
}

export interface FeedContext {
  match: BracketMatch | null;
  roundOf: (matchId: number) => string | null;
}

type Data = Record<string, unknown> | null | undefined;

export function sourceFor(type: string): FeedSource {
  switch (type) {
    case 'LIVE_SNAPSHOT':
      return 'RIOT';
    case 'STARTED':
    case 'SCORE_UPDATED':
    case 'FINISHED':
      return 'SUDIJA';
    default:
      return 'SERVER';
  }
}

function value(data: Data, key: string): unknown {
  return data ? data[key] : undefined;
}

function pair(data: Data, a: string, b: string): string {
  return `${value(data, a) ?? 0} : ${value(data, b) ?? 0}`;
}

export function describe(type: string, data: Data, context: FeedContext): string {
  switch (type) {
    case 'REFEREE_ASSIGNED': {
      const referee = value(data, 'referee');
      return referee ? `Sudija ${referee} dodijeljen meču` : 'Sudija dodijeljen meču';
    }
    case 'STARTED':
      return 'Meč počinje';
    case 'SCORE_UPDATED':
      return `Rezultat ${pair(data, 'scoreA', 'scoreB')}`;
    case 'FINISHED':
      return `Meč završen ${pair(data, 'scoreA', 'scoreB')}, pobjednik ${teamName(context.match, value(data, 'winnerTeamId'))}`;
    case 'WINNER_ADVANCED': {
      const round = context.roundOf(Number(value(data, 'nextMatchId')));
      const team = teamName(context.match, value(data, 'winnerTeamId'));
      return `${team} ide u ${round ? round.toLowerCase() : 'sljedeću rundu'}`;
    }
    case 'TOURNAMENT_COMPLETED':
      return `Turnir završen, prvak ${teamName(context.match, value(data, 'winnerTeamId'))}`;
    case 'LIVE_SNAPSHOT':
      return `Riot podaci: kills ${pair(data, 'killsA', 'killsB')}, tornjevi ${pair(data, 'towersA', 'towersB')}`;
    default:
      return type;
  }
}

function timeOf(type: string, data: Data, at: string): string {
  const seconds = value(data, 'gameTimeSeconds');
  return type === 'LIVE_SNAPSHOT' && typeof seconds === 'number'
    ? formatClock(seconds)
    : localTime(at);
}

export function fromRecord(record: MatchEventRecord, context: FeedContext): FeedEntry {
  return {
    key: `r${record.id}`,
    type: record.type,
    source: sourceFor(record.type),
    time: timeOf(record.type, record.data, record.createdAt),
    text: describe(record.type, record.data, context),
  };
}

export function fromMessage(message: MatchTopicMessage, context: FeedContext): FeedEntry {
  return {
    key: `m${message.type}${message.at}`,
    type: message.type,
    source: sourceFor(message.type),
    time: timeOf(message.type, message.data, message.at),
    text: describe(message.type, message.data, {
      ...context,
      match: message.match ?? context.match,
    }),
  };
}

export function historyFeed(records: MatchEventRecord[], context: FeedContext): FeedEntry[] {
  return records.reduce<FeedEntry[]>(
    (feed, record) => prependEntry(feed, fromRecord(record, context)),
    [],
  );
}

export function prependEntry(feed: FeedEntry[], entry: FeedEntry): FeedEntry[] {
  if (entry.type === 'LIVE_SNAPSHOT' && feed[0]?.type === 'LIVE_SNAPSHOT') {
    return [entry, ...feed.slice(1)];
  }
  if (feed.some((existing) => existing.key === entry.key)) {
    return feed;
  }
  return [entry, ...feed];
}
