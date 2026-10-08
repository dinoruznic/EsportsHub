import { BracketMatch, MatchEventRecord } from '../../core/api/models';
import {
  FeedContext,
  describe as sentence,
  historyFeed,
  prependEntry,
  sourceFor,
} from './match-events';
import { formatClock, goldLead, liveClock } from './match-format';

const MATCH: BracketMatch = {
  id: 7,
  status: 'LIVE',
  teamA: { id: 1, name: 'Balkan Wolves', tag: 'BW' },
  teamB: { id: 2, name: 'Drina Dragons', tag: 'DD' },
  scoreA: 1,
  scoreB: 0,
  winnerTeamId: null,
  nextMatchId: 9,
};

const CONTEXT: FeedContext = { match: MATCH, roundOf: (id) => (id === 9 ? 'Finale' : null) };

function record(
  id: number,
  type: string,
  data: Record<string, unknown> | null = null,
): MatchEventRecord {
  return {
    id,
    matchId: 7,
    type,
    source: 'REFEREE',
    actor: 'sudija',
    data,
    createdAt: '2026-10-08T10:00:00Z',
  };
}

describe('match events', () => {
  it('maps event types to Bosnian sentences', () => {
    expect(sentence('STARTED', null, CONTEXT)).toBe('Meč počinje');
    expect(sentence('SCORE_UPDATED', { scoreA: 1, scoreB: 0 }, CONTEXT)).toBe('Rezultat 1 : 0');
    expect(sentence('FINISHED', { scoreA: 2, scoreB: 1, winnerTeamId: 1 }, CONTEXT)).toBe(
      'Meč završen 2 : 1, pobjednik Balkan Wolves',
    );
    expect(sentence('WINNER_ADVANCED', { winnerTeamId: 1, nextMatchId: 9 }, CONTEXT)).toBe(
      'Balkan Wolves ide u finale',
    );
    expect(sentence('TOURNAMENT_COMPLETED', { winnerTeamId: 2 }, CONTEXT)).toBe(
      'Turnir završen, prvak Drina Dragons',
    );
    expect(
      sentence('LIVE_SNAPSHOT', { killsA: 12, killsB: 9, towersA: 4, towersB: 2 }, CONTEXT),
    ).toBe('Riot podaci: kills 12 : 9, tornjevi 4 : 2');
  });

  it('tags the source of each event', () => {
    expect(sourceFor('LIVE_SNAPSHOT')).toBe('RIOT');
    expect(sourceFor('SCORE_UPDATED')).toBe('SUDIJA');
    expect(sourceFor('WINNER_ADVANCED')).toBe('SERVER');
    expect(sourceFor('TOURNAMENT_COMPLETED')).toBe('SERVER');
  });

  it('puts the newest history event on top', () => {
    const feed = historyFeed(
      [record(1, 'STARTED'), record(2, 'SCORE_UPDATED', { scoreA: 1, scoreB: 0 })],
      CONTEXT,
    );

    expect(feed.map((entry) => entry.text)).toEqual(['Rezultat 1 : 0', 'Meč počinje']);
  });

  it('collapses consecutive snapshots into the latest one', () => {
    const snapshot = (key: string, kills: number) => ({
      key,
      type: 'LIVE_SNAPSHOT',
      source: 'RIOT' as const,
      time: '01:00',
      text: `kills ${kills}`,
    });
    let feed = historyFeed([record(1, 'STARTED')], CONTEXT);
    feed = prependEntry(feed, snapshot('a', 1));
    feed = prependEntry(feed, snapshot('b', 2));

    expect(feed.map((entry) => entry.text)).toEqual(['kills 2', 'Meč počinje']);
  });

  it('formats the game clock and the gold lead', () => {
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(3725)).toBe('62:05');
    expect(formatClock(null)).toBe('--:--');
    expect(liveClock(60, 1000, 11000)).toBe('01:10');
    expect(liveClock(60, 0, 10_000_000)).toBe('03:00');
    expect(goldLead(15400, 12200)).toBe('+3.2k BLUE');
    expect(goldLead(1000, 1400)).toBe('+400 RED');
    expect(goldLead(null, 1400)).toBeNull();
  });
});
