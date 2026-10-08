import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { storeSession, TEST_USER } from '../../testing/fake-session';
import { teamOf } from '../../testing/market-data';
import { PROFILE_GAMES, account } from '../../testing/profile-data';
import NoviTim from './novi-tim';
import TimDetalji from './tim-detalji';
import Timovi from './timovi';

@Component({ template: 'tim' })
class TeamStub {}

async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await Promise.resolve();
    TestBed.tick();
  }
}

describe('Timovi', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let element: HTMLElement;

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  function configure(username: string, routes: Parameters<typeof provideRouter>[0]): void {
    localStorage.clear();
    storeSession(3600, { ...TEST_USER, username, roles: ['PLAYER'] });
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  }

  function text(selector: string): string {
    return element.querySelector(selector)!.textContent!.replace(/\s+/g, ' ').trim();
  }

  describe('lista', () => {
    async function render(url = '/timovi'): Promise<void> {
      configure('ja', [{ path: 'timovi', component: Timovi }]);
      harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(url);
      await settle();
      http
        .expectOne('/api/teams')
        .flush([
          teamOf({ id: 1, name: 'Sarajevo Lions', tag: 'SL', captainUsername: 'ja' }),
          teamOf({ id: 2, name: 'Drina Wolves', tag: 'DW', gameCode: 'CS2', memberCount: 1 }),
          teamOf({ id: 3, name: 'Una Unicorns', tag: 'UU', memberCount: 5 }),
        ]);
      http.expectOne('/api/games').flush(PROFILE_GAMES);
      http.expectOne('/api/players/ja').flush({
        username: 'ja',
        displayName: 'Ja',
        roles: ['PLAYER'],
        createdAt: '2026-10-01T10:00:00Z',
        teams: [{ id: 3, name: 'Una Unicorns', tag: 'UU', gameCode: 'LOL', captain: false }],
      });
      await harness.fixture.whenStable();
      element = harness.routeNativeElement as HTMLElement;
    }

    function names(section: string): string[] {
      return Array.from(element.querySelectorAll(`${section} app-team-card h3.name`)).map((n) =>
        n.textContent!.trim(),
      );
    }

    it('renders my teams and all team cards', async () => {
      await render();

      expect(names('.my-teams')).toEqual(['Sarajevo Lions', 'Una Unicorns']);
      expect(names('.all-teams')).toEqual(['Drina Wolves', 'Sarajevo Lions', 'Una Unicorns']);
      const card = element.querySelector('.all-teams [data-team-id="2"]')!;
      expect(card.getAttribute('href')).toBe('/timovi/2');
      expect(card.querySelector('.members')!.textContent).toBe('1 član');
      expect(card.querySelector('.c')!.textContent).toBe('C');
      expect(text('.all-teams [data-team-id="3"] .members')).toBe('5 članova');
      expect(element.querySelector('a.create')!.getAttribute('href')).toBe('/timovi/novi');
    });

    it('filters by game and search through query params', async () => {
      await render('/timovi?igra=LOL&q=una');

      expect(names('.all-teams')).toEqual(['Una Unicorns']);

      const input = element.querySelector<HTMLInputElement>('.search-input')!;
      input.value = 'dw';
      input.dispatchEvent(new Event('input'));
      await harness.fixture.whenStable();

      expect(TestBed.inject(Router).url).toBe('/timovi?igra=LOL&q=dw');
      expect(names('.all-teams')).toEqual([]);
      expect(text('.all-teams app-empty-state')).toContain('Nema timova za izabrane filtere.');
    });
  });

  describe('kreiranje', () => {
    async function render(): Promise<void> {
      configure('ja', [
        { path: 'timovi/novi', component: NoviTim },
        { path: 'timovi/:id', component: TeamStub },
      ]);
      harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/timovi/novi');
      await settle();
      http.expectOne('/api/games').flush(PROFILE_GAMES);
      http.expectOne('/api/me/game-accounts').flush([]);
      await harness.fixture.whenStable();
      element = harness.routeNativeElement as HTMLElement;
    }

    async function type(id: string, value: string): Promise<void> {
      const control = element.querySelector<HTMLInputElement>(`#${id}`)!;
      control.value = value;
      control.dispatchEvent(new Event('input'));
      control.dispatchEvent(new Event('blur'));
      await harness.fixture.whenStable();
    }

    async function select(id: string, value: string): Promise<void> {
      const control = element.querySelector<HTMLSelectElement>(`#${id}`)!;
      control.value = value;
      control.dispatchEvent(new Event('change'));
      await settle();
    }

    it('shows required errors only after submit and uppercases the tag', async () => {
      await render();
      expect(element.querySelectorAll('.field-error').length).toBe(0);

      element.querySelector<HTMLButtonElement>('.submit')!.click();
      await harness.fixture.whenStable();
      expect(
        Array.from(element.querySelectorAll('.field-error')).map((e) => e.textContent!.trim()),
      ).toEqual(['Obavezno polje.', 'Obavezno polje.', 'Izaberi igru.']);
      http.expectNone({ method: 'POST', url: '/api/teams' });

      await type('team-tag', 'sl12');
      expect(element.querySelector<HTMLInputElement>('#team-tag')!.value).toBe('SL12');
    });

    it('rejects a tag longer than 5 characters', async () => {
      await render();
      await type('team-tag', 'abcdef');

      expect(text('#team-tag-error')).toBe('Tag može imati najviše 5 znakova.');
    });

    it('hints at a missing game account and creates the team', async () => {
      await render();
      await type('team-name', 'Sarajevo Lions');
      await type('team-tag', 'sl');
      await select('team-game', '1');
      http.expectOne('/api/games/1/regions').flush([{ id: 1, code: 'EUW', label: 'EUW' }]);
      await harness.fixture.whenStable();
      expect(text('.hint')).toContain('Kao kapiten bi trebao imati nalog za League of Legends.');
      await select('team-region', 'EUW');

      element.querySelector<HTMLButtonElement>('.submit')!.click();
      const request = http.expectOne({ method: 'POST', url: '/api/teams' });
      expect(request.request.body).toEqual({
        name: 'Sarajevo Lions',
        tag: 'SL',
        gameId: 1,
        region: 'EUW',
        logoUrl: null,
      });
      request.flush(teamOf({ id: 77 }));
      await harness.fixture.whenStable();

      expect(TestBed.inject(Router).url).toBe('/timovi/77');
    });

    it('shows a taken tag next to the field in Bosnian', async () => {
      await render();
      await type('team-name', 'Sarajevo Lions');
      await type('team-tag', 'SL');
      await select('team-game', '2');
      http.expectOne('/api/games/2/regions').flush([]);

      element.querySelector<HTMLButtonElement>('.submit')!.click();
      http
        .expectOne({ method: 'POST', url: '/api/teams' })
        .flush({ message: 'team tag taken' }, { status: 409, statusText: 'Conflict' });
      await harness.fixture.whenStable();

      expect(text('#team-tag-error')).toBe('Tag tima je već zauzet.');
    });
  });

  describe('detalji', () => {
    async function render(username: string): Promise<void> {
      configure(username, [{ path: 'timovi/:id', component: TimDetalji }]);
      harness = await RouterTestingHarness.create();
      await harness.navigateByUrl('/timovi/10');
      await settle();
      http.expectOne('/api/teams/10').flush({
        team: teamOf({ captainUsername: 'kapiten' }),
        members: [
          {
            membershipId: 1,
            gameAccountId: 50,
            inGameName: 'kap#EUW',
            ownerUsername: 'kapiten',
            rank: 'GOLD',
            position: 'TOP',
            rating: null,
            roleInTeam: null,
            active: true,
          },
          {
            membershipId: 2,
            gameAccountId: 51,
            inGameName: 'zvijezda#EUW',
            ownerUsername: 'igrac',
            rank: 'DIAMOND',
            position: 'MID',
            rating: null,
            roleInTeam: null,
            active: true,
          },
          {
            membershipId: 3,
            gameAccountId: 52,
            inGameName: 'bivsi',
            ownerUsername: 'bivsi',
            rank: null,
            position: null,
            rating: null,
            roleInTeam: null,
            active: false,
          },
        ],
      });
      http.expectOne('/api/market/teams/10/contracts').flush([
        {
          id: 3,
          gameAccountId: 51,
          inGameName: 'zvijezda#EUW',
          teamId: 10,
          teamName: 'Sarajevo Lions',
          salary: 1500,
          startDate: '2026-10-06',
          endDate: null,
          status: 'ACTIVE',
          createdAt: '2026-10-06T10:00:00Z',
        },
      ]);
      http.expectOne('/api/games').flush(PROFILE_GAMES);
      await settle();
      http.expectOne('/api/players/kapiten').flush({
        username: 'kapiten',
        displayName: 'Kapiten Kenan',
        roles: ['PLAYER'],
        createdAt: '2026-10-01T10:00:00Z',
        teams: [],
      });
      await harness.fixture.whenStable();
      element = harness.routeNativeElement as HTMLElement;
    }

    it('shows the roster and contracts without captain actions for other players', async () => {
      await render('igrac');
      const rows = Array.from(element.querySelectorAll('.roster .row'));

      expect(text('.eyebrow')).toBe('League of Legends · EUW');
      expect(rows.length).toBe(2);
      expect(rows[0].querySelector('.role')!.textContent!.trim()).toBe('Kapiten');
      expect(rows[1].querySelector('.role')!.textContent!.trim()).toBe('Igrač');
      expect(rows[1].querySelector('.rank')!.textContent).toBe('Diamond');
      expect(rows[1].querySelector('.ign')!.getAttribute('href')).toBe('/profil');
      expect(rows[0].querySelector('.ign')!.getAttribute('href')).toBe('/igraci/kapiten');
      expect(text('.captain-link')).toBe('Kapiten Kenan');
      expect(text('.contract .amount')).toBe('1.500 KM');
      expect(text('.contract-status')).toBe('Aktivan');
      expect(element.querySelector('.remove')).toBeNull();
      expect(element.querySelector('.captain-tools')).toBeNull();
    });

    it('lets the captain remove a member and add a player by username', async () => {
      await render('kapiten');

      expect(element.querySelectorAll('.remove').length).toBe(1);
      element.querySelector<HTMLButtonElement>('.remove .trigger')!.click();
      await harness.fixture.whenStable();
      element.querySelector<HTMLButtonElement>('.remove .confirm')!.click();
      http.expectOne({ method: 'DELETE', url: '/api/teams/10/members/2' }).flush(null);
      await settle();
      http
        .expectOne('/api/teams/10')
        .flush({ team: teamOf({ captainUsername: 'kapiten' }), members: [] });
      await settle();
      http.match('/api/players/kapiten').forEach((request) => request.flush(null));
      await harness.fixture.whenStable();

      element.querySelector<HTMLButtonElement>('.add-player')!.click();
      await harness.fixture.whenStable();
      const input = element.querySelector<HTMLInputElement>('#add-username')!;
      input.value = 'novi';
      input.dispatchEvent(new Event('input'));
      element.querySelector<HTMLFormElement>('.add-form')!.dispatchEvent(new Event('submit'));
      http
        .expectOne('/api/players/novi/game-accounts')
        .flush([account({ id: 88, gameCode: 'LOL' })]);
      const add = http.expectOne({ method: 'POST', url: '/api/teams/10/members' });
      expect(add.request.body).toEqual({ gameAccountId: 88 });
      add.flush({});
      await settle();
      http
        .expectOne('/api/teams/10')
        .flush({ team: teamOf({ captainUsername: 'kapiten' }), members: [] });
      await settle();
      http.match('/api/players/kapiten').forEach((request) => request.flush(null));
      await harness.fixture.whenStable();

      expect(element.querySelector('.hint a')!.getAttribute('href')).toBe('/market?igra=LOL');
    });
  });
});
