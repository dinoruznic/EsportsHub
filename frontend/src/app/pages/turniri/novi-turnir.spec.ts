import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { storeSession } from '../../testing/fake-session';
import { GAMES, tournament } from '../../testing/tournament-data';
import NoviTurnir from './novi-turnir';

@Component({ template: 'detalji' })
class DetailStub {}

describe('NoviTurnir', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;
  let element: HTMLElement;

  beforeEach(async () => {
    localStorage.clear();
    storeSession();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'turniri/novi', component: NoviTurnir },
          { path: 'turniri/:id', component: DetailStub },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/turniri/novi');
    TestBed.tick();
    http.expectOne('/api/games').flush(GAMES);
    await harness.fixture.whenStable();
    element = harness.routeNativeElement as HTMLElement;
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  function field(id: string): HTMLInputElement | HTMLSelectElement {
    return element.querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!;
  }

  async function type(id: string, value: string, blur = true): Promise<void> {
    const control = field(id);
    control.value = value;
    control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input'));
    if (blur) {
      control.dispatchEvent(new Event('blur'));
    }
    await harness.fixture.whenStable();
  }

  function errors(): string[] {
    return Array.from(element.querySelectorAll('.field-error')).map((e) => e.textContent!.trim());
  }

  async function submit(): Promise<void> {
    element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    await harness.fixture.whenStable();
  }

  it('offers games from the backend, the supported format and team counts', () => {
    const games = Array.from((field('tournament-game') as HTMLSelectElement).options).map((o) => o.text);
    const formats = Array.from((field('tournament-format') as HTMLSelectElement).options).map((o) => o.text);
    const counts = Array.from((field('tournament-teams') as HTMLSelectElement).options).map((o) => o.text);

    expect(games).toEqual(['Izaberi igru', 'League of Legends', 'Counter-Strike 2']);
    expect(formats).toEqual(['Single elimination']);
    expect(counts).toEqual(['2', '4', '8', '16']);
  });

  it('shows required errors only after submit', async () => {
    field('tournament-name').dispatchEvent(new Event('blur'));
    await harness.fixture.whenStable();
    expect(errors()).toEqual([]);

    await submit();

    expect(errors()).toEqual(['Obavezno polje.', 'Izaberi igru.']);
    http.expectNone('/api/tournaments');
  });

  it('rejects a negative prize pool after blur', async () => {
    await type('tournament-prize', '-5');

    expect(errors()).toEqual(['Unesi cijeli broj, 0 ili veći.']);
  });

  it('rejects a start date in the past', async () => {
    await type('tournament-start', '2020-01-01');

    expect(errors()).toEqual(['Datum ne može biti u prošlosti.']);
  });

  it('creates the tournament and opens its detail page', async () => {
    await type('tournament-name', '  Balkan Kup ');
    await type('tournament-game', '1');
    await type('tournament-teams', '4');
    await type('tournament-prize', '1500');
    await submit();

    const request = http.expectOne({ method: 'POST', url: '/api/tournaments' });
    expect(request.request.body).toEqual({
      name: 'Balkan Kup',
      gameId: 1,
      format: 'SINGLE_ELIMINATION',
      maxTeams: 4,
      prizePool: 1500,
      startDate: null,
    });
    request.flush(tournament({ id: 42, status: 'PENDING' }));
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/turniri/42');
  });

  it('shows a server error in Bosnian', async () => {
    await type('tournament-name', 'Balkan Kup');
    await type('tournament-game', '1');
    await submit();

    http
      .expectOne({ method: 'POST', url: '/api/tournaments' })
      .flush({ message: 'unknown game' }, { status: 400, statusText: 'Bad Request' });
    await harness.fixture.whenStable();

    expect(element.querySelector('.banner')!.textContent).toContain('Izabrana igra ne postoji.');
    expect(TestBed.inject(Router).url).toBe('/turniri/novi');
  });
});
