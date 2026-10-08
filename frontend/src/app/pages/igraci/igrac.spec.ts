import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { storeSession, TEST_USER } from '../../testing/fake-session';
import { PROFILE_GAMES, account, cs2Account } from '../../testing/profile-data';
import Igrac from './igrac';
import { ownProfileGuard } from './own-profile.guard';

@Component({ template: 'moj profil' })
class OwnProfileStub {}

async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await Promise.resolve();
    TestBed.tick();
  }
}

describe('Igrac', () => {
  let http: HttpTestingController;
  let harness: RouterTestingHarness;

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  async function setup(): Promise<void> {
    localStorage.clear();
    storeSession(3600, { ...TEST_USER, username: 'drugi', roles: ['PLAYER'] });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'profil', component: OwnProfileStub },
          { path: 'igraci/:username', canActivate: [ownProfileGuard], component: Igrac },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  }

  it('shows the public profile read-only with a transfer badge', async () => {
    await setup();
    await harness.navigateByUrl('/igraci/yueen');
    await settle();
    http.expectOne('/api/players/yueen').flush({
      username: 'yueen',
      displayName: 'Dino Ruznic',
      roles: ['PLAYER', 'CAPTAIN'],
      createdAt: '2026-10-01T10:00:00Z',
      teams: [{ id: 4, name: 'Bosna Bisons', tag: 'BB', gameCode: 'LOL', captain: false }],
    });
    http
      .expectOne('/api/players/yueen/game-accounts')
      .flush([cs2Account(), account({ marketStatus: 'AVAILABLE' })]);
    http.expectOne('/api/games').flush(PROFILE_GAMES);
    await harness.fixture.whenStable();
    const element = harness.routeNativeElement as HTMLElement;
    const cards = Array.from(element.querySelectorAll('app-account-card'));

    expect(element.querySelector('app-profile-header h1')!.textContent!.trim()).toBe('Dino Ruznic');
    expect(element.querySelector('.pencil')).toBeNull();
    expect(element.querySelector('.team .captain')).toBeNull();
    expect(cards.map((c) => c.getAttribute('data-account-id'))).toEqual(['1', '2']);
    expect(element.querySelector('.menu-button')).toBeNull();
    expect(element.querySelector('[role="switch"]')).toBeNull();
    expect(cards[0].querySelector('.badge')!.textContent).toBe('Dostupan za transfer');
    expect(cards[1].querySelector('.badge')).toBeNull();
    expect(document.title).toBe('Dino Ruznic · EsportsHub');
  });

  it('shows Igrač ne postoji for an unknown username', async () => {
    await setup();
    await harness.navigateByUrl('/igraci/nema');
    await settle();
    http
      .expectOne('/api/players/nema')
      .flush({ message: 'Igrac ne postoji' }, { status: 404, statusText: 'Not Found' });
    http.match(() => true);
    await harness.fixture.whenStable();
    const element = harness.routeNativeElement as HTMLElement;

    expect(element.querySelector('app-empty-state')!.textContent).toContain('Igrač ne postoji.');
    expect(element.querySelector('app-profile-header')).toBeNull();
  });

  it('redirects your own username to /profil', async () => {
    await setup();
    await harness.navigateByUrl('/igraci/drugi');

    expect(TestBed.inject(Router).url).toBe('/profil');
    http.expectNone('/api/players/drugi');
  });
});
