import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { BracketMatch } from '../../core/api/models';
import { storeSession } from '../../testing/fake-session';
import { FakeStomp, provideFakeStomp } from '../../testing/fake-stomp';
import { GAMES, fourTeamBracket } from '../../testing/tournament-data';
import SudijaMec from './sudija-mec';

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
  tournamentId: 1,
  tournamentName: 'Balkan Kup',
  gameCode: 'LOL',
  roundName: 'Polufinale',
  refereeUsername: 'sudija',
};

const SCHEDULED: BracketMatch = { ...LIVE, status: 'SCHEDULED', scoreA: 0, scoreB: 0 };

describe('SudijaMec', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let element: HTMLElement;
  let stomp: FakeStomp;

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  async function render(match: BracketMatch, snapshot: object | null = null): Promise<void> {
    localStorage.clear();
    storeSession(3600, { userId: 3, username: 'sudija', roles: ['REFEREE'] });
    const fake = provideFakeStomp();
    stomp = fake.stomp;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'sudija/mecevi/:id', component: SudijaMec }]),
        provideHttpClient(),
        provideHttpClientTesting(),
        fake.provider,
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/sudija/mecevi/11');
    await settle();
    http.expectOne('/api/matches/11').flush(match);
    http
      .expectOne('/api/matches/11/live')
      .flush(snapshot, snapshot ? {} : { status: 204, statusText: 'No Content' });
    http.expectOne('/api/matches/11/events').flush([]);
    http.expectOne('/api/games').flush(GAMES);
    await settle();
    http.expectOne('/api/tournaments/1/bracket').flush(fourTeamBracket());
    await harness.fixture.whenStable();
    element = harness.routeNativeElement as HTMLElement;
    stomp.last.connect();
  }

  function text(selector: string): string {
    return element.querySelector(selector)!.textContent!.replace(/\s+/g, ' ').trim();
  }

  function button(selector: string): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>(selector)!;
  }

  async function click(selector: string): Promise<void> {
    button(selector).click();
    await harness.fixture.whenStable();
  }

  it('shows the header, the steps and the viewer preview', async () => {
    await render(LIVE);

    expect(text('h1')).toBe('Tim 2 vs Tim 3');
    expect(text('.eyebrow')).toBe('League of Legends · Polufinale · M2');
    expect(
      Array.from(element.querySelectorAll('.step')).map(
        (s) => `${s.textContent!.trim()}:${s.getAttribute('data-state')}`,
      ),
    ).toEqual(['Zakazan:done', 'Uživo:current', 'Završen:todo']);
    expect(element.querySelector('app-match-scoreboard')!.classList).toContain('compact');
    expect(element.querySelector('.viewer-link')!.getAttribute('href')).toBe('/mecevi/11');
    expect(text('.preview-title')).toBe('Kako gledaoci vide meč');
    expect([...stomp.last.topics.keys()]).toEqual(['/topic/matches/11']);
    expect(document.title).toBe('Sudija · Tim 2 vs Tim 3 · EsportsHub');
  });

  it('starts a scheduled match that has both teams', async () => {
    await render(SCHEDULED);

    expect(button('.start').disabled).toBe(false);
    expect(element.querySelector('.start-reason')).toBeNull();
    expect(element.querySelector('.score-editor')).toBeNull();

    await click('.start');
    const request = http.expectOne({ method: 'POST', url: '/api/matches/11/start' });
    request.flush({ ...SCHEDULED, status: 'LIVE' });
    await harness.fixture.whenStable();

    expect(element.querySelector('.start')).toBeNull();
    expect(element.querySelector('.score-editor')).not.toBeNull();
    expect(text('.step[data-state="current"]')).toBe('Uživo');
  });

  it('keeps start disabled with a reason while a team is missing', async () => {
    await render({ ...SCHEDULED, teamB: null });

    expect(button('.start').disabled).toBe(true);
    expect(text('.start-reason')).toBe('Meč čeka oba tima iz prethodne runde.');
  });

  it('shows a backend error next to the action that failed', async () => {
    await render(SCHEDULED);

    await click('.start');
    http
      .expectOne('/api/matches/11/start')
      .flush({ message: 'mec nema oba tima' }, { status: 409, statusText: 'Conflict' });
    await harness.fixture.whenStable();

    expect(text('.block .error')).toBe('Meč još nema oba tima.');
    expect(button('.start').disabled).toBe(false);
  });

  it('changes the score with − and + and saves it only when it changed', async () => {
    await render(LIVE);
    const values = () =>
      Array.from(element.querySelectorAll('.score-editor .value')).map((v) => v.textContent);

    expect(values()).toEqual(['1', '0']);
    expect(button('.save').disabled).toBe(true);
    expect(button('[data-side="B"] .minus').disabled).toBe(true);

    await click('[data-side="A"] .plus');
    await click('[data-side="B"] .plus');
    await click('[data-side="B"] .minus');
    expect(values()).toEqual(['2', '0']);
    expect(button('.save').disabled).toBe(false);

    await click('.save');
    const request = http.expectOne({ method: 'PUT', url: '/api/matches/11/score' });
    expect(request.request.body).toEqual({ scoreA: 2, scoreB: 0 });
    request.flush({ ...LIVE, scoreA: 2 });
    await harness.fixture.whenStable();

    expect(text('.saved')).toBe('Sačuvano');
    expect(button('.save').disabled).toBe(true);
    expect(text('app-match-scoreboard .series').replace(/\s/g, '')).toBe('2:0');
  });

  it('blocks finishing a draw', async () => {
    await render(LIVE);

    await click('[data-side="B"] .plus');
    await click('.finish-block .trigger');

    expect(text('.finish-block .question')).toBe('Neriješeno nije dozvoljeno.');
    expect(button('.finish-block .confirm').disabled).toBe(true);
    expect(button('.finish-block .cancel').disabled).toBe(false);
  });

  it('finishes 2 : 1 after confirmation and says where the winner goes', async () => {
    await render(LIVE);

    await click('[data-side="A"] .plus');
    await click('[data-side="B"] .plus');
    await click('.finish-block .trigger');
    expect(text('.finish-block .question')).toBe(
      'Završiti meč 2 : 1? Pobjednik Tim 2 ide dalje. Ovo se ne može poništiti.',
    );

    await click('.finish-block .confirm');
    const request = http.expectOne({ method: 'POST', url: '/api/matches/11/finish' });
    expect(request.request.body).toEqual({ scoreA: 2, scoreB: 1 });
    request.flush({ ...LIVE, status: 'FINISHED', scoreA: 2, scoreB: 1, winnerTeamId: 2 });
    await settle();
    http.expectOne('/api/tournaments/1/bracket').flush(fourTeamBracket());
    await harness.fixture.whenStable();

    expect(text('.outcome')).toBe('Pobjednik ide u Finale.');
    expect(element.querySelector('.score-editor')).toBeNull();
    expect(element.querySelector('app-agent-card')).toBeNull();
    expect(text('.step[data-state="current"]')).toBe('Završen');
  });

  it('names the champion when the final is finished', async () => {
    await render({
      ...LIVE,
      status: 'FINISHED',
      scoreA: 0,
      scoreB: 2,
      winnerTeamId: 3,
      nextMatchId: null,
    });

    expect(text('.outcome')).toBe('Turnir završen, prvak Tim 3.');
  });

  it('switches the agent command between demo and real and reveals the key', async () => {
    await render(LIVE);

    expect(text('.command')).toBe(
      'java -jar agent/target/esportshub-agent.jar --mock --start=14:00 --interval=2 --match-key=••••••••••••',
    );
    expect(button('.switch').getAttribute('aria-checked')).toBe('true');

    await click('.switch');
    expect(button('.switch').getAttribute('aria-checked')).toBe('false');
    expect(text('.command')).toBe(
      'java -jar agent/target/esportshub-agent.jar --match-key=••••••••••••',
    );

    await click('.reveal');
    http.expectOne('/api/matches/11/agent-key').flush({ matchKey: 'kljuc-123' });
    await harness.fixture.whenStable();

    expect(text('.key')).toBe('kljuc-123');
    expect(text('.command')).toBe(
      'java -jar agent/target/esportshub-agent.jar --match-key=kljuc-123',
    );
    expect(text('.reveal')).toBe('Sakrij ključ');
  });

  it('copies the command with the real key', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    await render(LIVE);

    await click('.copy');
    http.expectOne('/api/matches/11/agent-key').flush({ matchKey: 'kljuc-123' });
    await settle();
    await harness.fixture.whenStable();

    expect(writeText).toHaveBeenCalledWith(
      'java -jar agent/target/esportshub-agent.jar --mock --start=14:00 --interval=2 --match-key=kljuc-123',
    );
    expect(text('.copied')).toBe('Komanda je kopirana.');
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('shows the agent status line for no data, fresh data and old data', async () => {
    await render(LIVE);
    const status = () => element.querySelector('app-agent-card .status')!;

    expect(status().getAttribute('data-state')).toBe('none');
    expect(text('app-agent-card .status')).toBe('Još nema podataka iz igre');

    stomp.last.emit('/topic/matches/11', {
      type: 'LIVE_SNAPSHOT',
      actor: 'riot-agent',
      match: LIVE,
      data: { gameTimeSeconds: 840, killsA: 3, killsB: 2 },
      at: new Date().toISOString(),
    });
    await harness.fixture.whenStable();

    expect(status().getAttribute('data-state')).toBe('active');
    expect(text('app-agent-card .status')).toBe('Agent šalje podatke · zadnji prije 0 s');
  });

  it('reports an idle agent when the last data is minutes old', async () => {
    await render(LIVE, {
      matchId: 11,
      gameTimeSeconds: 900,
      killsA: 1,
      killsB: 1,
      capturedAt: new Date(Date.now() - 6 * 60000).toISOString(),
    });

    expect(element.querySelector('app-agent-card .status')!.getAttribute('data-state')).toBe(
      'idle',
    );
    expect(text('app-agent-card .status')).toBe('Agent nije aktivan · zadnji podatak prije 6 min');
    expect(text('app-live-clock .clock-note')).toBe('zadnji podatak prije 6 min');
  });

  it('simulates a data point while the match is live', async () => {
    await render(LIVE);

    await click('.simulate');
    http
      .expectOne({ method: 'POST', url: '/api/matches/11/simulate-snapshot' })
      .flush({ matchId: 11 });
    await harness.fixture.whenStable();

    expect(text('.simulate')).toBe('Poslano');
  });
});
