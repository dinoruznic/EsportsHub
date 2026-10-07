import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { Bracket, Registration, Team, Tournament } from '../../core/api/models';
import { TEST_USER, storeSession } from '../../testing/fake-session';
import { GAMES, emptyBracket, fourTeamBracket, registration, team, tournament } from '../../testing/tournament-data';
import TurnirDetalji from './turnir-detalji';

interface Setup {
  username?: string;
  roles?: string[];
  tournament?: Tournament;
  registrations?: Registration[];
  bracket?: Bracket;
  teams?: Team[];
}

async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await Promise.resolve();
    TestBed.tick();
  }
}

const FOUR = [registration(1, 1), registration(2, 2), registration(3, 3), registration(4, 4)];

describe('TurnirDetalji', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let element: HTMLElement;

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  async function render(setup: Setup = {}): Promise<void> {
    const t = setup.tournament ?? tournament();
    localStorage.clear();
    storeSession(3600, { ...TEST_USER, username: setup.username ?? 'igrac', roles: setup.roles ?? ['PLAYER'] });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'turniri/:id', component: TurnirDetalji }]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/turniri/1');
    await settle();
    http.expectOne('/api/tournaments/1').flush(t);
    http.expectOne('/api/tournaments/1/registrations').flush(setup.registrations ?? []);
    http.expectOne('/api/tournaments/1/bracket').flush(setup.bracket ?? emptyBracket());
    http.expectOne('/api/games').flush(GAMES);
    await settle();
    if (t.status === 'REGISTRATION') {
      const teams = http.expectOne((request) => request.url === '/api/teams');
      expect(teams.request.params.get('gameId')).toBe('1');
      teams.flush(setup.teams ?? []);
    }
    await harness.fixture.whenStable();
    element = harness.routeNativeElement as HTMLElement;
  }

  function buttons(): string[] {
    return Array.from(element.querySelectorAll('section.actions button')).map((b) => b.textContent!.trim());
  }

  it('renders the header and the stats strip', async () => {
    await render({ registrations: [registration(1, 1), registration(2, 2)] });
    const cells = Array.from(element.querySelectorAll('app-tournament-stats .cell')).map(
      (cell) => `${cell.querySelector('dt')!.textContent}: ${cell.querySelector('dd')!.textContent!.trim()}`,
    );

    expect(element.querySelector('.eyebrow')!.textContent).toBe('League of Legends · Single elimination · 8 timova');
    expect(element.querySelector('h1')!.textContent).toBe('Balkan Kup');
    expect(cells).toEqual([
      'Status: Prijave otvorene',
      'Timovi: 2 / 8',
      'Nagradni fond: 1.500 KM',
      'Početak: —',
      'Organizator: org',
    ]);
    expect(document.title).toBe('Balkan Kup · EsportsHub');
  });

  it('shows no actions to a player without a team', async () => {
    await render({ teams: [team(5, 'drugi')] });

    expect(element.querySelector('section.actions')).toBeNull();
  });

  it('lets a captain pick an eligible team and register it', async () => {
    await render({ registrations: [registration(1, 1)], teams: [team(1, 'igrac'), team(7, 'igrac')] });

    expect(buttons()).toContain('Prijavi tim');
    element.querySelector<HTMLButtonElement>('.register')!.click();
    await harness.fixture.whenStable();

    const options = Array.from(element.querySelectorAll('.team-option .team-name')).map((o) => o.textContent);
    expect(options).toEqual(['Tim 7']);

    element.querySelector<HTMLButtonElement>('.confirm-register')!.click();
    const request = http.expectOne({ method: 'POST', url: '/api/tournaments/1/registrations' });
    expect(request.request.body).toEqual({ teamId: 7 });
    request.flush(registration(9, 7));
    await settle();

    http.expectOne('/api/tournaments/1/registrations').flush([registration(1, 1), registration(9, 7)]);
    await harness.fixture.whenStable();

    expect(element.querySelector('.picker')).toBeNull();
    expect(element.querySelectorAll('app-registered-teams li.filled').length).toBe(2);
    expect(element.querySelectorAll('app-registered-teams li.open').length).toBe(6);
  });

  it('shows the backend error in Bosnian next to the action', async () => {
    await render({ teams: [team(7, 'igrac')] });

    element.querySelector<HTMLButtonElement>('.register')!.click();
    await harness.fixture.whenStable();
    element.querySelector<HTMLButtonElement>('.confirm-register')!.click();
    http
      .expectOne({ method: 'POST', url: '/api/tournaments/1/registrations' })
      .flush({ message: 'turnir je pun' }, { status: 409, statusText: 'Conflict' });
    await harness.fixture.whenStable();

    expect(element.querySelector('.action-error')!.textContent).toBe('Turnir je popunjen.');
  });

  it('lets a registered captain withdraw after confirming in place', async () => {
    await render({ registrations: [registration(3, 7)], teams: [team(7, 'igrac')] });

    expect(buttons()).toEqual(['Povuci prijavu']);
    element.querySelector<HTMLButtonElement>('.withdraw .trigger')!.click();
    await harness.fixture.whenStable();
    http.expectNone({ method: 'DELETE', url: '/api/tournaments/1/registrations/3' });

    element.querySelector<HTMLButtonElement>('.withdraw .confirm')!.click();
    http.expectOne({ method: 'DELETE', url: '/api/tournaments/1/registrations/3' }).flush(null);
    await settle();
    http.expectOne('/api/tournaments/1/registrations').flush([registration(3, 7, { status: 'WITHDRAWN' })]);
    await harness.fixture.whenStable();

    expect(element.querySelector('.withdraw')).toBeNull();
    expect(element.querySelector('app-registered-teams')!.textContent).toContain('0 / 8');
  });

  it('shows a locked ghost generate button when the team count is not a power of two', async () => {
    await render({ username: 'org', registrations: FOUR.slice(0, 3) });
    const generate = element.querySelector<HTMLButtonElement>('.generate')!;

    expect(generate.getAttribute('aria-disabled')).toBe('true');
    expect(generate.classList).not.toContain('btn-gold');
    expect(generate.querySelector('svg')).not.toBeNull();
    expect(element.querySelector('#generate-hint')!.textContent).toBe('Potrebno 2, 4, 8 ili 16 timova · trenutno 3');

    generate.click();
    http.expectNone({ method: 'POST', url: '/api/tournaments/1/bracket' });
  });

  it('lets the organizer generate the bracket with four teams', async () => {
    await render({ username: 'org', registrations: FOUR });
    const generate = element.querySelector<HTMLButtonElement>('.generate')!;

    expect(generate.classList).toContain('btn-gold');
    expect(generate.getAttribute('aria-disabled')).toBeNull();
    generate.click();
    http.expectOne({ method: 'POST', url: '/api/tournaments/1/bracket' }).flush(fourTeamBracket());
    await settle();

    http.expectOne('/api/tournaments/1').flush(tournament({ status: 'ONGOING' }));
    http.expectOne('/api/tournaments/1/registrations').flush(FOUR.map((r, i) => ({ ...r, seed: i + 1 })));
    http.expectOne('/api/tournaments/1/bracket').flush(fourTeamBracket());
    await harness.fixture.whenStable();

    expect(element.querySelector('.generate')).toBeNull();
    expect(element.querySelectorAll('app-bracket-view .match').length).toBe(3);
  });

  it('does not offer bracket generation to a player', async () => {
    await render({ registrations: FOUR });

    expect(element.querySelector('.generate')).toBeNull();
  });

  it('lets an admin approve a pending tournament', async () => {
    await render({ roles: ['ADMIN'], tournament: tournament({ status: 'PENDING' }) });

    expect(element.querySelector('app-tournament-stats .note')!.textContent).toBe('Čeka odobrenje administratora.');
    expect(buttons()).toEqual(['Odobri', 'Odbij']);

    element.querySelector<HTMLButtonElement>('.approve')!.click();
    http.expectOne({ method: 'POST', url: '/api/tournaments/1/approve' }).flush(tournament());
    await settle();
    http.expectOne('/api/tournaments/1').flush(tournament({ status: 'REGISTRATION' }));
    await settle();
    http.expectOne((request) => request.url === '/api/teams').flush([]);
    await harness.fixture.whenStable();

    expect(element.querySelector('.approve')).toBeNull();
    expect(element.querySelector('app-status-chip')!.textContent).toContain('Prijave otvorene');
  });

  it('renders a ghosted preview with teams in seed order and open seats', async () => {
    await render({ registrations: FOUR.slice(0, 3) });
    const rounds = Array.from(element.querySelectorAll('.round-name')).map((r) => r.textContent);
    const statuses = new Set(Array.from(element.querySelectorAll('.match-status')).map((s) => s.textContent!.trim()));
    const firstRound = Array.from(element.querySelectorAll('.round')[0].querySelectorAll('.team')).map(
      (t) => t.textContent,
    );

    expect(element.querySelector('.preview-note')!.textContent).toContain('Pregled.');
    expect(element.querySelector('app-bracket-view')!.classList).toContain('preview');
    expect(rounds).toEqual(['Četvrtfinale', 'Polufinale', 'Finale', 'Prvak']);
    expect(element.querySelectorAll('.match').length).toBe(7);
    expect([...statuses]).toEqual(['Pregled']);
    expect(firstRound).toEqual([
      'Tim 1',
      'Slobodno mjesto',
      'Slobodno mjesto',
      'Slobodno mjesto',
      'Tim 2',
      'Slobodno mjesto',
      'Tim 3',
      'Slobodno mjesto',
    ]);
    expect(element.querySelectorAll('app-registered-teams li.open').length).toBe(5);
  });

  it('falls back to a compact empty state when the team limit is not a power of two', async () => {
    await render({ tournament: tournament({ maxTeams: 6 }) });

    expect(element.querySelector('app-bracket-view')).toBeNull();
    expect(element.querySelector('.bracket-section app-empty-state')!.textContent).toContain(
      'Bracket još nije generisan.',
    );
  });

  it('shows the explanation and no preview or actions for a rejected tournament', async () => {
    await render({ username: 'org', tournament: tournament({ status: 'REJECTED' }) });

    expect(element.querySelector('app-tournament-stats .note')!.textContent).toBe('Turnir je odbijen.');
    expect(element.querySelector('app-bracket-view')).toBeNull();
    expect(element.querySelector('section.actions')).toBeNull();
  });

  it('renders rounds, match cards, the winner and the live match', async () => {
    await render({
      tournament: tournament({ status: 'ONGOING' }),
      registrations: FOUR.map((r, i) => ({ ...r, seed: i + 1 })),
      bracket: fourTeamBracket(),
    });

    const rounds = Array.from(element.querySelectorAll('.round-name')).map((r) => r.textContent);
    expect(rounds).toEqual(['Polufinale', 'Finale', 'Prvak']);
    expect(element.querySelector('[data-champion]')!.textContent).toContain('Čeka se finale');
    expect(element.querySelectorAll('.match').length).toBe(3);

    const finished = element.querySelector('[data-match-id="10"]')!;
    const winner = finished.querySelector('.row.winner')!;
    expect(winner.querySelector('.team')!.textContent).toBe('Tim 1');
    expect(winner.querySelector('.score')!.textContent).toBe('2');
    expect(winner.querySelector('.seed')!.textContent).toBe('1');
    expect(finished.querySelector('.row.loser .team')!.textContent).toBe('Tim 4');

    const live = element.querySelector('[data-match-id="11"]')!;
    expect(live.classList).toContain('live');
    expect(live.querySelector('.live-dot')).not.toBeNull();
    expect(live.querySelector('.match-status')!.textContent!.trim()).toBe('Uživo');

    const final = element.querySelector('[data-match-id="12"]')!;
    const rows = Array.from(final.querySelectorAll('.team')).map((t) => t.textContent);
    expect(rows).toEqual(['Tim 1', 'Pobjednik meča 2']);
    expect(final.querySelector('.row.tbd')).not.toBeNull();
  });
});
