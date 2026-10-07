import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';
import { storeSession } from './testing/fake-session';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => localStorage.clear());

  async function renderAt(url: string) {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    await fixture.whenStable();
    return { element: fixture.nativeElement as HTMLElement, router };
  }

  it('shows the landing page without navigation to guests', async () => {
    const { element, router } = await renderAt('/');

    expect(router.url).toBe('/');
    expect(element.querySelector('h1')?.textContent?.trim()).toBe('ESPORTSHUB');
    expect(element.querySelector('h1 span')).toBeNull();
    expect(element.querySelector('nav')).toBeNull();
  });

  it('sends guests from a protected page to the landing page', async () => {
    const { router } = await renderAt('/turniri');

    expect(router.url).toBe('/');
  });

  it('sends logged-in users from the landing page to /turniri', async () => {
    storeSession();
    const { router } = await renderAt('/');

    expect(router.url).toBe('/turniri');
  });

  it('renders the five nav links with correct hrefs for a logged-in user', async () => {
    storeSession();
    const { element } = await renderAt('/turniri');
    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('a.nav-item'));

    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/uzivo',
      '/turniri',
      '/market',
      '/timovi',
      '/profil',
    ]);
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Uživo',
      'Turniri',
      'Market',
      'Timovi',
      'Profil',
    ]);
    expect(element.querySelector('a.nav-item.active')?.getAttribute('href')).toBe('/turniri');
  });

  it('shows the user with role chips and logs out with Odjava', async () => {
    storeSession();
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/turniri');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.topbar .username')?.textContent).toBe('admin');
    expect(Array.from(element.querySelectorAll('.topbar .role')).map((chip) => chip.textContent)).toEqual([
      'ADMIN',
    ]);

    element.querySelector<HTMLButtonElement>('.topbar button')!.click();
    await fixture.whenStable();

    expect(router.url).toBe('/');
    expect(localStorage.length).toBe(0);
    expect(element.querySelector('.topbar')).toBeNull();
  });

  it('renders the not-found page for an unknown url', async () => {
    const { element, router } = await renderAt('/ova-stranica-ne-postoji');

    expect(router.url).toBe('/ova-stranica-ne-postoji');
    expect(element.querySelector('h1')?.textContent).toContain('Stranica ne postoji');
    expect(element.querySelector('main a')?.getAttribute('href')).toBe('/turniri');
  });
});
