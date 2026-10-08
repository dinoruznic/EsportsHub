import { Bracket, BracketMatch } from '../../../core/api/models';
import {
  completedFourTeamBracket,
  fourTeamBracket,
  registration,
} from '../../../testing/tournament-data';
import {
  buildBracket,
  findChampion,
  matchHighlights,
  monogram,
  placements,
  previewBracket,
  roundLabel,
  seedOrder,
} from './bracket-layout';

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
        {
          roundNumber: 1,
          name: 'Cetvrtfinale',
          matches: [match(3, 5), match(4, 5), match(1, 6), match(2, 6)],
        },
        { roundNumber: 3, name: 'Finale', matches: [match(7, null)] },
      ],
    };

    const columns = buildBracket(bracket, {});

    expect(columns.map((c) => c.label)).toEqual(['Četvrtfinale', 'Polufinale', 'Finale']);
    expect(columns[0].matches.map((m) => m.id)).toEqual([1, 2, 3, 4]);
    expect(columns[1].matches.map((m) => m.id)).toEqual([6, 5]);
    expect(columns[1].matches.map((m) => m.number)).toEqual([5, 6]);
    expect(columns[1].matches[0].slots.map((s) => s.placeholder)).toEqual([
      'Pobjednik meča 1',
      'Pobjednik meča 2',
    ]);
    expect(columns[2].matches[0].slots.map((s) => s.placeholder)).toEqual([
      'Pobjednik meča 6',
      'Pobjednik meča 5',
    ]);
  });

  it('seeds like the backend: 1 against the last, 2 against the second last', () => {
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it('builds a preview for the team limit with open seats', () => {
    const preview = previewBracket(4, [registration(1, 11), registration(2, 12)])!;
    const columns = buildBracket(preview, {}, true);

    expect(columns.map((c) => c.label)).toEqual(['Polufinale', 'Finale']);
    expect(
      columns[0].matches.map((m) => m.slots.map((s) => s.team?.name ?? s.placeholder)),
    ).toEqual([
      ['Tim 11', 'Slobodno mjesto'],
      ['Tim 12', 'Slobodno mjesto'],
    ]);
    expect(columns[1].matches[0].slots.map((s) => s.placeholder)).toEqual([
      'Pobjednik meča 1',
      'Pobjednik meča 2',
    ]);
    expect(columns[0].matches[0].statusLabel).toBe('Pregled');
    expect(previewBracket(6, [])).toBeNull();
    expect(previewBracket(null, [])).toBeNull();
  });

  it('finds the champion, the finalist and the final score from the final match', () => {
    const info = findChampion(completedFourTeamBracket())!;

    expect(info.champion.name).toBe('Tim 3');
    expect(info.finalist!.name).toBe('Tim 1');
    expect([info.championScore, info.finalistScore]).toEqual([3, 1]);
    expect(findChampion(fourTeamBracket())).toBeNull();
  });

  it('marks every match the champion won as the champion path', () => {
    const columns = buildBracket(completedFourTeamBracket(), {});

    expect(
      columns
        .flatMap((c) => c.matches)
        .filter((m) => m.championPath)
        .map((m) => m.id),
    ).toEqual([11, 12]);
  });

  it('ranks teams by placement and keeps seed order inside a placement', () => {
    const regs = [1, 2, 3, 4].map((id) => registration(id, id, { seed: id }));
    const ranking = placements(completedFourTeamBracket(), regs);

    expect(ranking.map((row) => [row.registration.teamName, row.label, row.kind])).toEqual([
      ['Tim 3', '1. Prvak', 'champion'],
      ['Tim 1', '2. Finalista', 'finalist'],
      ['Tim 2', '3–4. Polufinale', 'eliminated'],
      ['Tim 4', '3–4. Polufinale', 'eliminated'],
    ]);
  });

  it('labels quarterfinal and round of 16 eliminations', () => {
    const team = (id: number) => ({ id, name: `Tim ${id}`, tag: `T${id}` });
    const lost = (id: number, loser: number, winner: number): BracketMatch => ({
      ...match(id, null),
      status: 'FINISHED',
      teamA: team(winner),
      teamB: team(loser),
      winnerTeamId: winner,
    });
    const bracket: Bracket = {
      tournamentId: 1,
      tournamentName: 'Kup',
      status: 'COMPLETED',
      rounds: [
        {
          roundNumber: 1,
          name: 'Runda 1',
          matches: Array.from({ length: 8 }, (_, i) => lost(100 + i, 20 + i, 40 + i)),
        },
        {
          roundNumber: 2,
          name: 'Cetvrtfinale',
          matches: Array.from({ length: 4 }, (_, i) => lost(200 + i, 60 + i, 80 + i)),
        },
      ],
    };
    const ranking = placements(bracket, [registration(1, 20), registration(2, 60)]);

    expect(ranking.map((row) => row.label)).toEqual(['5–8. Četvrtfinale', '9–16. Osmina finala']);
  });

  it('highlights live matches first', () => {
    const highlights = matchHighlights(buildBracket(fourTeamBracket(), {}))!;

    expect(highlights.live).toBe(true);
    expect(highlights.chips).toEqual([
      { id: 11, teamA: 'Tim 2', teamB: 'Tim 3', scoreA: 1, scoreB: 0, round: 'Polufinale' },
    ]);
  });

  it('falls back to the next scheduled match that has both teams', () => {
    const bracket = fourTeamBracket();
    bracket.rounds[0].matches[1].status = 'SCHEDULED';
    const highlights = matchHighlights(buildBracket(bracket, {}))!;

    expect(highlights.live).toBe(false);
    expect(highlights.chips.map((chip) => [chip.id, chip.teamA, chip.teamB])).toEqual([
      [11, 'Tim 2', 'Tim 3'],
    ]);
    expect(matchHighlights(buildBracket(completedFourTeamBracket(), {}))).toBeNull();
  });
});
