import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { LiveMatch } from '../../core/api/models';
import { storeSession } from '../../testing/fake-session';
import { FakeStomp, provideFakeStomp } from '../../testing/fake-stomp';
import { GAMES } from '../../testing/tournament-data';
import Uzivo from './uzivo';

async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await Promise.resolve();
    TestBed.tick();
  }
}

function liveMatch(matchId: number, overrides: Partial<LiveMatch> = {}): LiveMatch {
  return {
    matchId,
    status: 'LIVE',
    tournamentId: 5,
    tournamentName: 'Balkan Kup',
    gameCode: 'LOL',
    roundNumber: 1,
    roundName: 'Cetvrtfinale',
    teamA: { id: 1, name: 'Balkan Wolves', tag: 'BW' },
    teamB: { id: 2, name: 'Drina Dragons', tag: 'DD' },
    scoreA: 1,
    scoreB: 0,
    startedAt: '2026-10-08T10:00:00Z',
    ...overrides,
  };
}

describe('Uzivo', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let element: HTMLElement;
  let stomp: FakeStomp;

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  async function render(
    list: LiveMatch[],
    capturedAt: Record<number, string | null> = {},
  ): Promise<void> {
    localStorage.clear();
    storeSession();
    const fake = provideFakeStomp();
    stomp = fake.stomp;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'uzivo', component: Uzivo }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        fake.provider,
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/uzivo');
    await settle();
    http.expectOne('/api/games').flush(GAMES);
    http.expectOne('/api/matches/live').flush(list);
    await settle();
    for (const match of list.filter((m) => m.status === 'LIVE')) {
      const request = http.expectOne(`/api/matches/${match.matchId}/live`);
      if (capturedAt[match.matchId] === null) {
        request.flush(null, { status: 204, statusText: 'No Content' });
        continue;
      }
      request.flush({
        matchId: match.matchId,
        capturedAt: capturedAt[match.matchId] ?? new Date().toISOString(),
        gameTimeSeconds: 90,
        killsA: 0,
        killsB: 0,
        goldA: null,
        goldB: null,
        towersA: 0,
        towersB: 0,
      });
    }
    await harness.fixture.whenStable();
    element = harness.routeNativeElement as HTMLElement;
  }

  it('shows live cards and upcoming rows from the backend', async () => {
    await render([
      liveMatch(7),
      liveMatch(8, {
        status: 'SCHEDULED',
        teamA: { id: 3, name: 'Una Unicorns', tag: 'UU' },
        teamB: { id: 4, name: 'Sava Sharks', tag: 'SS' },
        scoreA: 0,
        startedAt: null,
      }),
    ]);
    const card = element.querySelector('.live-card[data-match-id="7"]')!;
    const next = element.querySelector('.next-row[data-match-id="8"]')!;

    expect(element.querySelector('h1')!.textContent).toBe('Uživo');
    expect(card.getAttribute('href')).toBe('/mecevi/7');
    expect(card.querySelector('.context')!.textContent).toBe('Balkan Kup · Četvrtfinale');
    expect(card.querySelector('.series')!.textContent!.trim()).toBe('1 : 0');
    expect(card.querySelector('.live-pill')!.textContent!.trim()).toBe('Uživo');
    expect(card.querySelector('.clock')!.textContent).toBe('01:30');
    expect(Array.from(next.querySelectorAll('.team-name')).map((t) => t.textContent)).toEqual([
      'Una Unicorns',
      'Sava Sharks',
    ]);
    expect([...stomp.last.topics.keys()]).toEqual([]);
  });

  it('marks a stale clock and a card still waiting for the first data', async () => {
    await render([liveMatch(7), liveMatch(9)], {
      7: new Date(Date.now() - 6 * 60000).toISOString(),
      9: null,
    });
    const stale = element.querySelector('.live-card[data-match-id="7"] app-live-clock')!;
    const waiting = element.querySelector('.live-card[data-match-id="9"] app-live-clock')!;

    expect(stale.getAttribute('data-state')).toBe('stale');
    expect(stale.querySelector('.clock-time')!.textContent).toBe('01:30');
    expect(stale.querySelector('.clock-note')!.textContent).toBe('zadnji podatak prije 6 min');
    expect(waiting.getAttribute('data-state')).toBe('waiting');
    expect(waiting.querySelector('.clock-wait')!.textContent).toBe('Čeka se prvi podatak iz igre');
  });

  it('updates the score live from the tournament topic', async () => {
    await render([liveMatch(7)]);
    stomp.last.connect();

    stomp.last.emit('/topic/tournaments/5', {
      type: 'SCORE_UPDATED',
      matchId: 7,
      actor: 's',
      match: {
        id: 7,
        status: 'LIVE',
        teamA: { id: 1, name: 'Balkan Wolves', tag: 'BW' },
        teamB: { id: 2, name: 'Drina Dragons', tag: 'DD' },
        scoreA: 2,
        scoreB: 0,
        winnerTeamId: null,
        nextMatchId: null,
      },
      data: {},
      at: '2026-10-08T10:00:00Z',
    });
    await harness.fixture.whenStable();

    expect([...stomp.last.topics.keys()]).toEqual(['/topic/tournaments/5']);
    expect(element.querySelector('.live-card .series')!.textContent!.trim()).toBe('2 : 0');
  });

  it('shows the empty state when nothing is being played', async () => {
    await render([]);

    expect(element.querySelector('app-empty-state')!.textContent).toContain(
      'Trenutno se ništa ne igra.',
    );
    expect(element.querySelector('app-empty-state a')!.getAttribute('href')).toBe('/turniri');
  });
});
