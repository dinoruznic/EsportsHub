import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from '../../app';
import { routes } from '../../app.routes';

describe('LandingPage', () => {
  let fixture: ComponentFixture<App>;
  let router: Router;

  async function render(url: string): Promise<void> {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(App);
    router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    await fixture.whenStable();
  }

  afterEach(() => localStorage.clear());

  function element(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function heroView(): HTMLElement {
    return element().querySelector('.hero-view')!;
  }

  function formView(): HTMLElement {
    return element().querySelector('.form-view')!;
  }

  function isShown(view: HTMLElement): boolean {
    return !view.classList.contains('hidden') && !view.hasAttribute('inert');
  }

  function button(label: string, root: HTMLElement = element()): HTMLButtonElement {
    const found = Array.from(root.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    );
    if (!found) {
      throw new Error(`Nema dugmeta "${label}"`);
    }
    return found;
  }

  async function click(target: HTMLElement): Promise<void> {
    target.click();
    await fixture.whenStable();
  }

  async function type(selector: string, value: string): Promise<void> {
    const input = element().querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();
  }

  describe('from the hero view', () => {
    beforeEach(() => render('/'));

    it('shows both buttons and no form', () => {
      expect(isShown(heroView())).toBe(true);
      expect(isShown(formView())).toBe(false);
      expect(button('Prijava', heroView()).classList).toContain('btn-gold');
      expect(button('Registracija', heroView()).classList).toContain('btn-ghost');
      expect(element().querySelector('app-login-form')).toBeNull();
      expect(element().querySelector('app-register-form')).toBeNull();
    });

    it('hides the hero and shows the login form when Prijava is clicked', async () => {
      await click(button('Prijava', heroView()));

      expect(router.url).toBe('/?forma=prijava');
      expect(isShown(heroView())).toBe(false);
      expect(heroView().hasAttribute('inert')).toBe(true);
      expect(isShown(formView())).toBe(true);
      expect(formView().querySelector('app-login-form h2')?.textContent).toBe('Prijava');
    });

    it('returns to the hero with the Nazad button', async () => {
      await click(button('Prijava', heroView()));
      const back = formView().querySelector<HTMLButtonElement>('button.back')!;

      expect(back.getAttribute('aria-label')).toBe('Nazad na početnu');
      await click(back);

      expect(router.url).toBe('/');
      expect(isShown(heroView())).toBe(true);
      expect(isShown(formView())).toBe(false);
    });

    it('shows the register form when Registracija is clicked', async () => {
      await click(button('Registracija', heroView()));

      expect(router.url).toBe('/?forma=registracija');
      expect(isShown(formView())).toBe(true);
      expect(formView().querySelector('app-register-form h2')?.textContent).toBe('Registracija');
    });

    it('swaps login and register with the links inside the card', async () => {
      await click(button('Prijava', heroView()));
      await click(button('Registruj se', formView()));

      expect(router.url).toBe('/?forma=registracija');
      expect(element().querySelector('app-login-form')).toBeNull();
      expect(element().querySelector('app-register-form')).not.toBeNull();

      await click(formView().querySelector<HTMLButtonElement>('app-register-form .link')!);

      expect(router.url).toBe('/?forma=prijava');
      expect(element().querySelector('app-register-form')).toBeNull();
      expect(element().querySelector('app-login-form')).not.toBeNull();
    });

    it('renders exactly one complete form after each in-card switch', async () => {
      function expectOnlyForm(selector: string, heading: string, firstField: string): void {
        const forms = formView().querySelectorAll('app-login-form, app-register-form');
        expect(forms.length).toBe(1);
        expect(forms[0].matches(selector)).toBe(true);
        expect(forms[0].querySelector('h2')?.textContent).toBe(heading);
        expect(forms[0].querySelector(firstField)).not.toBeNull();
        expect(formView().querySelectorAll(firstField).length).toBe(1);
      }

      await click(button('Prijava', heroView()));
      expectOnlyForm('app-login-form', 'Prijava', '#login-identifier');

      await click(button('Registruj se', formView()));
      expectOnlyForm('app-register-form', 'Registracija', '#register-username');

      await click(button('Prijavi se', formView().querySelector('app-register-form .switch')!));
      expectOnlyForm('app-login-form', 'Prijava', '#login-identifier');

      await click(button('Registruj se', formView()));
      expectOnlyForm('app-register-form', 'Registracija', '#register-username');
    });

    it('returns to the hero on Escape', async () => {
      await click(button('Registracija', heroView()));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await fixture.whenStable();

      expect(router.url).toBe('/');
      expect(isShown(heroView())).toBe(true);
    });

    it('has no close button in the card', async () => {
      await click(button('Prijava', heroView()));

      expect(element().querySelector('button[aria-label="Zatvori"]')).toBeNull();
    });

    it('shows required errors after submitting an empty login form', async () => {
      await click(button('Prijava', heroView()));
      await click(button('Prijavi se', formView()));

      const errors = Array.from(element().querySelectorAll('.field-error')).map((error) =>
        error.textContent?.trim(),
      );
      expect(errors).toEqual(['Obavezno polje.', 'Obavezno polje.']);
    });
  });

  describe('validation messages', () => {
    beforeEach(() => render('/'));

    function errors(): string[] {
      return Array.from(formView().querySelectorAll('.field-error')).map(
        (error) => error.textContent?.trim() ?? '',
      );
    }

    async function blur(selector: string): Promise<void> {
      element().querySelector<HTMLInputElement>(selector)!.dispatchEvent(new Event('blur'));
      await fixture.whenStable();
    }

    it('does not show a required error when an empty field is left', async () => {
      await click(button('Prijava', heroView()));
      element().querySelector<HTMLInputElement>('#login-identifier')!.focus();
      await blur('#login-identifier');
      element().querySelector<HTMLInputElement>('#login-password')!.focus();
      await fixture.whenStable();

      expect(errors()).toEqual([]);
    });

    it('shows required errors for every required field on submit and focuses the first one', async () => {
      await click(button('Registracija', heroView()));
      await click(button('Napravi nalog', formView()));

      expect(errors()).toEqual(['Obavezno polje.', 'Obavezno polje.', 'Obavezno polje.', 'Obavezno polje.']);
      expect(document.activeElement?.id).toBe('register-username');
    });

    it('focuses the first invalid field when only some fields are filled', async () => {
      await click(button('Prijava', heroView()));
      await type('#login-identifier', 'marko');
      await click(button('Prijavi se', formView()));

      expect(errors()).toEqual(['Obavezno polje.']);
      expect(document.activeElement?.id).toBe('login-password');
    });

    it('shows a format error only for a non-empty field that was left', async () => {
      await click(button('Registracija', heroView()));
      const email = element().querySelector<HTMLInputElement>('#register-email')!;

      email.value = 'abc';
      email.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(errors()).toEqual([]);

      await blur('#register-email');
      expect(errors()).toEqual(['Email nije ispravan.']);

      await type('#register-email', '');
      expect(errors()).toEqual([]);
    });

    it('updates errors live after a submit attempt', async () => {
      await click(button('Registracija', heroView()));
      await click(button('Napravi nalog', formView()));
      const username = element().querySelector<HTMLInputElement>('#register-username')!;

      username.value = 'ab';
      username.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(element().querySelector('#register-username-error')?.textContent).toContain('Najmanje 3 znaka.');

      username.value = 'abc';
      username.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(element().querySelector('#register-username-error')).toBeNull();
    });

    it('shows a clean form after switching away from a failed submit and back', async () => {
      await click(button('Prijava', heroView()));
      await type('#login-identifier', 'marko');
      await click(button('Prijavi se', formView()));
      expect(errors()).not.toEqual([]);

      await click(button('Registruj se', formView()));
      expect(errors()).toEqual([]);
      expect(element().querySelector<HTMLInputElement>('#register-username')!.value).toBe('');

      await click(formView().querySelector<HTMLButtonElement>('app-register-form .link')!);
      expect(errors()).toEqual([]);
      expect(element().querySelector<HTMLInputElement>('#login-identifier')!.value).toBe('');
    });

    it('shows a clean form when reopened after Nazad', async () => {
      await click(button('Prijava', heroView()));
      await type('#login-identifier', 'marko');
      await click(button('Prijavi se', formView()));
      await click(formView().querySelector<HTMLButtonElement>('button.back')!);
      await click(button('Prijava', heroView()));

      expect(errors()).toEqual([]);
      expect(element().querySelector<HTMLInputElement>('#login-identifier')!.value).toBe('');
    });

    it('prevents the switch link from taking focus on mousedown', async () => {
      await click(button('Prijava', heroView()));
      const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      button('Registruj se', formView()).dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });
  });

  describe('opened with ?forma=registracija', () => {
    beforeEach(() => render('/?forma=registracija'));

    it('shows the register form directly', () => {
      expect(isShown(heroView())).toBe(false);
      expect(isShown(formView())).toBe(true);
      expect(element().querySelector('app-register-form')).not.toBeNull();
    });

    it('shows an error when the passwords do not match', async () => {
      await type('#register-password', 'lozinka123');
      const confirm = element().querySelector<HTMLInputElement>('#register-confirm')!;
      confirm.value = 'lozinka124';
      confirm.dispatchEvent(new Event('input'));
      await fixture.whenStable();

      expect(element().querySelector('#register-confirm-error')).toBeNull();

      await type('#register-confirm', 'lozinka124');

      expect(element().querySelector('#register-confirm-error')?.textContent).toContain(
        'Lozinke se ne poklapaju.',
      );

      await type('#register-confirm', 'lozinka123');

      expect(element().querySelector('#register-confirm-error')).toBeNull();
    });
  });
});
