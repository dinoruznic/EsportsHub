import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BracketMatch } from '../../core/api/models';
import { storeSession } from '../../testing/fake-session';
import { FakeStomp, provideFakeStomp } from '../../testing/fake-stomp';
import { GAMES, fourTeamBracket, tournament } from '../../testing/tournament-data';
import Mec from './mec';

async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await Promise.resolve();
    TestBed.tick();
  }
}

const LIVE: BracketMatch = {
  id: 11,
  status: 'LIVE',
  teamA: { id: 2, name: 'Tim 2', tag: 'T2' },
  teamB: { id: 3, name: 'Tim 3', tag: 'T3' },
  scoreA: 1,
  scoreB: 0,
  winnerTeamId: null,
  nextMatchId: 12,
};

describe('Mec', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let element: HTMLElement;
  let stomp: FakeStomp;

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  async function render(snapshot: object | null = null): Promise<void> {
    localStorage.clear();
    storeSession();
    const fake = provideFakeStomp();
    stomp = fake.stomp;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'mecevi/:id', component: Mec }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        fake.provider,
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/mecevi/11?turnir=1');
    await settle();
    http.expectOne('/api/matches/11').flush(LIVE);
    http
      .expectOne('/api/matches/11/live')
      .flush(snapshot, snapshot ? {} : { status: 204, statusText: 'No Content' });
    http.expectOne('/api/matches/11/events').flush([
      {
        id: 1,
        matchId: 11,
        type: 'STARTED',
        source: 'REFEREE',
        actor: 's',
        data: {},
        createdAt: '2026-10-08T10:00:00Z',
      },
      {
        id: 2,
        matchId: 11,
        type: 'SCORE_UPDATED',
        source: 'REFEREE',
        actor: 's',
        data: { scoreA: 1, scoreB: 0 },
        createdAt: '2026-10-08T10:05:00Z',
      },
    ]);
    http.expectOne('/api/tournaments/1').flush(tournament({ status: 'ONGOING' }));
    http.expectOne('/api/tournaments/1/bracket').flush(fourTeamBracket());
    http.expectOne('/api/games').flush(GAMES);
    await harness.fixture.whenStable();
    element = harness.routeNativeElement as HTMLElement;
    stomp.last.connect();
  }

  function text(selector: string): string {
    return element.querySelector(selector)!.textContent!.replace(/\s+/g, ' ').trim();
  }

  function feed(): string[] {
    return Array.from(element.querySelectorAll('app-match-feed .text')).map((t) => t.textContent!);
  }

  it('renders the scoreboard and context from REST', async () => {
    await render();

    expect(text('.eyebrow')).toBe('League of Legends · Polufinale · M2');
    expect(text('.back')).toBe('← Balkan Kup');
    expect(text('.side.blue .team-name')).toBe('Tim 2');
    expect(text('.side.red .team-name')).toBe('Tim 3');
    expect(text('.series').replace(/\s/g, '')).toBe('1:0');
    expect(text('.match-chip')).toBe('Uživo');
    expect(text('app-match-stats .waiting')).toBe('Čeka se prvi snapshot iz igre.');
    expect(feed()).toEqual(['Rezultat 1 : 0', 'Meč počinje']);
    expect(document.title).toBe('Tim 2 vs Tim 3 · EsportsHub');
    expect([...stomp.last.topics.keys()]).toEqual(['/topic/matches/11']);
  });

  it('applies SCORE_UPDATED from the match topic', async () => {
    await render();

    stomp.last.emit('/topic/matches/11', {
      type: 'SCORE_UPDATED',
      actor: 's',
      match: { ...LIVE, scoreA: 1, scoreB: 1 },
      data: { scoreA: 1, scoreB: 1 },
      at: '2026-10-08T10:10:00Z',
    });
    await harness.fixture.whenStable();

    expect(text('.series').replace(/\s/g, '')).toBe('1:1');
    expect(feed()[0]).toBe('Rezultat 1 : 1');
  });

  it('applies LIVE_SNAPSHOT, shows the clock and a dash for unknown gold, and collapses snapshots', async () => {
    await render();
    const snapshot = (kills: number) => ({
      type: 'LIVE_SNAPSHOT',
      actor: 'riot-agent',
      match: LIVE,
      data: {
        gameTimeSeconds: 754,
        killsA: kills,
        killsB: 3,
        goldA: null,
        goldB: null,
        towersA: 2,
        towersB: 1,
      },
      at: new Date().toISOString(),
    });

    stomp.last.emit('/topic/matches/11', snapshot(5));
    stomp.last.emit('/topic/matches/11', snapshot(6));
    await harness.fixture.whenStable();

    expect(text('.clock')).toBe('12:34');
    expect(text('[data-stat="kills"] .value.blue')).toBe('6');
    expect(text('[data-stat="gold"] .value.blue')).toBe('—');
    expect(text('[data-stat="gold"] .value.red')).toBe('—');
    expect(text('[data-stat="towers"] .value.red')).toBe('1');
    expect(feed()).toEqual([
      'Riot podaci: kills 6 : 3, tornjevi 2 : 1',
      'Rezultat 1 : 0',
      'Meč počinje',
    ]);
  });

  it('shows the gold lead when gold is known', async () => {
    await render({
      matchId: 11,
      capturedAt: new Date().toISOString(),
      gameTimeSeconds: 600,
      killsA: 4,
      killsB: 2,
      goldA: 15400,
      goldB: 12200,
      towersA: 1,
      towersB: 0,
    });

    expect(text('[data-stat="gold"] .note')).toBe('+3.2k BLUE');
    expect(text('[data-stat="gold"] .value.blue')).toBe('15.4k');
  });

  it('re-fetches the match after a reconnect', async () => {
    await render();

    stomp.last.drop();
    stomp.last.connect();
    await settle();

    http.expectOne('/api/matches/11').flush({ ...LIVE, scoreA: 2 });
    http.expectOne('/api/matches/11/live').flush(null, { status: 204, statusText: 'No Content' });
    http.expectOne('/api/matches/11/events').flush([]);
    await harness.fixture.whenStable();

    expect(text('.series').replace(/\s/g, '')).toBe('2:0');
  });
});
