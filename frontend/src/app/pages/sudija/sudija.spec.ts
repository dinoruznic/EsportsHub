import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { RefereeMatch } from '../../core/api/models';
import { storeSession } from '../../testing/fake-session';
import { GAMES } from '../../testing/tournament-data';
import Sudija, { groupRefereeMatches } from './sudija';

async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await Promise.resolve();
    TestBed.tick();
  }
}

function team(id: number) {
  return { id, name: `Tim ${id}`, tag: `T${id}` };
}

function refereeMatch(matchId: number, overrides: Partial<RefereeMatch> = {}): RefereeMatch {
  return {
    matchId,
    status: 'SCHEDULED',
    tournamentId: 1,
    tournamentName: 'Balkan Kup',
    gameCode: 'LOL',
    roundNumber: 1,
    roundName: 'Polufinale',
    teamA: team(1),
    teamB: team(2),
    scoreA: 0,
    scoreB: 0,
    winnerTeamId: null,
    nextMatchId: null,
    refereeUsername: 'sudija',
    startedAt: null,
    endedAt: null,
    lastSnapshotAt: null,
    ...overrides,
  };
}

const MATCHES = [
  refereeMatch(5, { status: 'FINISHED', endedAt: '2026-10-08T09:00:00Z' }),
  refereeMatch(7, { teamB: null }),
  refereeMatch(4),
  refereeMatch(9, { status: 'LIVE', scoreA: 1 }),
  refereeMatch(6, { status: 'FINISHED', endedAt: '2026-10-08T11:00:00Z' }),
];

describe('Sudija', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let element: HTMLElement;

  afterEach(() => {
    http?.verify();
    localStorage.clear();
  });

  async function render(matches: RefereeMatch[]): Promise<void> {
    localStorage.clear();
    storeSession(3600, { userId: 3, username: 'sudija', roles: ['REFEREE'] });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'sudija', component: Sudija }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/sudija');
    await settle();
    http.expectOne('/api/me/referee-matches').flush(matches);
    http.expectOne('/api/games').flush(GAMES);
    await harness.fixture.whenStable();
    element = harness.routeNativeElement as HTMLElement;
  }

  it('groups matches into live, next, waiting for teams and the last ten finished', () => {
    const finished = Array.from({ length: 12 }, (_, i) =>
      refereeMatch(100 + i, {
        status: 'FINISHED',
        endedAt: `2026-10-08T10:${String(i).padStart(2, '0')}:00Z`,
      }),
    );
    const groups = groupRefereeMatches([...MATCHES, ...finished]);

    expect(groups.map((g) => g.key)).toEqual(['live', 'next', 'waiting', 'finished']);
    expect(groups.map((g) => g.title)).toEqual(['Uživo', 'Sljedeći', 'Čeka timove', 'Završeni']);
    expect(groups[0].matches.map((m) => m.matchId)).toEqual([9]);
    expect(groups[1].matches.map((m) => m.matchId)).toEqual([4]);
    expect(groups[2].matches.map((m) => m.matchId)).toEqual([7]);
    expect(groups[3].matches).toHaveLength(10);
    expect(groups[3].matches[0].matchId).toBe(6);
  });

  it('renders the groups with a link to the panel of each match', async () => {
    await render(MATCHES);

    const sections = Array.from(element.querySelectorAll('section.group'));
    expect(sections.map((s) => s.getAttribute('data-group'))).toEqual([
      'live',
      'next',
      'waiting',
      'finished',
    ]);
    const live = element.querySelector('[data-group="live"] .row')!;
    expect(live.getAttribute('data-match-id')).toBe('9');
    expect(live.querySelector('.context')!.textContent).toBe('Balkan Kup · Polufinale');
    expect(live.querySelector('a.open')!.getAttribute('href')).toBe('/sudija/mecevi/9');
    expect(
      Array.from(element.querySelectorAll('[data-group="finished"] .row')).map((r) =>
        r.getAttribute('data-match-id'),
      ),
    ).toEqual(['6', '5']);
  });

  it('says so when no match is assigned', async () => {
    await render([]);

    expect(element.querySelector('app-empty-state')!.textContent).toContain(
      'Nemaš dodijeljenih mečeva.',
    );
  });
});
