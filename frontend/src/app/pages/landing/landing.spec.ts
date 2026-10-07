import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from '../../app';
import { routes } from '../../app.routes';

describe('LandingPage', () => {
  let fixture: ComponentFixture<App>;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(App);
    router = TestBed.inject(Router);
    await router.navigateByUrl('/');
    await fixture.whenStable();
  });

  afterEach(() => localStorage.clear());

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function button(label: string): HTMLButtonElement {
    const found = Array.from(element().querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    );
    if (!found) {
      throw new Error(`Nema dugmeta "${label}"`);
    }
    return found;
  }

  async function click(label: string): Promise<void> {
    button(label).click();
    await fixture.whenStable();
  }

  async function type(selector: string, value: string): Promise<void> {
    const input = element().querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  it('shows only the buttons at first', () => {
    expect(element().querySelector('#auth-card')).toBeNull();
    expect(button('Prijava').getAttribute('aria-expanded')).toBe('false');
  });

  it('opens the login form when Prijava is clicked', async () => {
    await click('Prijava');

    expect(router.url).toBe('/?forma=prijava');
    expect(element().querySelector('app-login-form')).not.toBeNull();
    expect(element().querySelector('label[for="login-identifier"]')?.textContent).toContain(
      'Korisničko ime ili email',
    );
    expect(button('Prijava').getAttribute('aria-expanded')).toBe('true');
  });

  it('swaps to the register form when Registracija is clicked', async () => {
    await click('Prijava');
    await click('Registracija');

    expect(router.url).toBe('/?forma=registracija');
    expect(element().querySelector('app-login-form')).toBeNull();
    expect(element().querySelector('app-register-form')).not.toBeNull();
    expect(button('Registracija').classList).toContain('btn-gold');
  });

  it('shows an error when the passwords do not match', async () => {
    await click('Registracija');
    await type('#register-password', 'lozinka123');
    await type('#register-confirm', 'lozinka124');

    expect(element().querySelector('#register-confirm-error')?.textContent).toContain(
      'Lozinke se ne poklapaju.',
    );

    await type('#register-confirm', 'lozinka123');

    expect(element().querySelector('#register-confirm-error')).toBeNull();
  });

  it('shows required errors after submitting an empty login form', async () => {
    await click('Prijava');
    await click('Prijavi se');

    const errors = Array.from(element().querySelectorAll('.field-error')).map((error) =>
      error.textContent?.trim(),
    );
    expect(errors).toEqual(['Obavezno polje.', 'Obavezno polje.']);
  });

  it('closes the card with the close button', async () => {
    await click('Prijava');
    element().querySelector<HTMLButtonElement>('button[aria-label="Zatvori"]')!.click();
    await fixture.whenStable();

    expect(router.url).toBe('/');
    expect(element().querySelector('#auth-card')).toBeNull();
  });
});
