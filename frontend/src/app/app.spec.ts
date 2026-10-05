import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from './app';
import { routes } from './app.routes';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    });
  });

  async function renderAt(url: string) {
    const fixture = TestBed.createComponent(App);
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    await fixture.whenStable();
    return { element: fixture.nativeElement as HTMLElement, router };
  }

  it('renders the five nav links with correct hrefs', async () => {
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
  });

  it('redirects the empty path to /turniri', async () => {
    const { element, router } = await renderAt('');

    expect(router.url).toBe('/turniri');
    expect(element.querySelector('h1')?.textContent).toContain('Turniri');
    expect(element.querySelector('a.nav-item.active')?.getAttribute('href')).toBe('/turniri');
  });

  it('renders the not-found page for an unknown url', async () => {
    const { element, router } = await renderAt('/ova-stranica-ne-postoji');

    expect(router.url).toBe('/ova-stranica-ne-postoji');
    expect(element.querySelector('h1')?.textContent).toContain('Stranica ne postoji');
    expect(element.querySelector('main a')?.getAttribute('href')).toBe('/turniri');
  });
});
