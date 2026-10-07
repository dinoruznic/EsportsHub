import { Bracket, BracketMatch } from '../../../core/api/models';
import { buildBracket, monogram, roundLabel } from './bracket-layout';

function match(id: number, nextMatchId: number | null): BracketMatch {
  return {
    id,
    status: 'SCHEDULED',
    teamA: null,
    teamB: null,
    scoreA: 0,
    scoreB: 0,
    winnerTeamId: null,
    nextMatchId,
  };
}

describe('bracket layout', () => {
  it('maps backend round names to proper Bosnian labels', () => {
    expect(roundLabel('Cetvrtfinale', 1)).toBe('Četvrtfinale');
    expect(roundLabel('Polufinale', 2)).toBe('Polufinale');
    expect(roundLabel('Finale', 3)).toBe('Finale');
    expect(roundLabel('Runda 1', 1)).toBe('Runda 1');
    expect(roundLabel(null, 2)).toBe('Runda 2');
  });

  it('builds a two letter monogram from the tag', () => {
    expect(monogram({ id: 1, name: 'Balkan Wolves', tag: 'bw-1' })).toBe('BW');
  });

  it('orders later rounds by their feeder matches and numbers matches in order', () => {
    const bracket: Bracket = {
      tournamentId: 1,
      tournamentName: 'Kup',
      status: 'ONGOING',
      rounds: [
        { roundNumber: 2, name: 'Polufinale', matches: [match(6, 7), match(5, 7)] },
        { roundNumber: 1, name: 'Cetvrtfinale', matches: [match(3, 5), match(4, 5), match(1, 6), match(2, 6)] },
        { roundNumber: 3, name: 'Finale', matches: [match(7, null)] },
      ],
    };

    const columns = buildBracket(bracket, {});

    expect(columns.map((c) => c.label)).toEqual(['Četvrtfinale', 'Polufinale', 'Finale']);
    expect(columns[0].matches.map((m) => m.id)).toEqual([1, 2, 3, 4]);
    expect(columns[1].matches.map((m) => m.id)).toEqual([6, 5]);
    expect(columns[1].matches.map((m) => m.number)).toEqual([5, 6]);
    expect(columns[1].matches[0].slots.map((s) => s.placeholder)).toEqual(['Pobjednik meča 1', 'Pobjednik meča 2']);
    expect(columns[2].matches[0].slots.map((s) => s.placeholder)).toEqual(['Pobjednik meča 6', 'Pobjednik meča 5']);
  });
});
