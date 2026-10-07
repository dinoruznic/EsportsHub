import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  linkedSignal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { LandingBackground } from './landing-background';
import { LANDING_IMAGES } from './landing-images';
import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';

export type FormMode = 'prijava' | 'registracija';

const FIRST_FIELD: Record<FormMode, string> = {
  prijava: 'login-identifier',
  registracija: 'register-username',
};

@Component({
  selector: 'app-landing',
  imports: [LandingBackground, LoginForm, RegisterForm],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
  host: { '(document:keydown.escape)': 'back()' },
})
export default class LandingPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly loginButton = viewChild.required<ElementRef<HTMLButtonElement>>('loginButton');
  private readonly registerButton = viewChild.required<ElementRef<HTMLButtonElement>>('registerButton');

  protected readonly images = LANDING_IMAGES;
  protected readonly mode = toSignal(
    this.route.queryParamMap.pipe(map((params) => toMode(params.get('forma')))),
    { initialValue: null },
  );
  protected readonly cardMode = linkedSignal<FormMode | null, FormMode | null>({
    source: this.mode,
    computation: (mode, previous) => mode ?? previous?.value ?? null,
  });

  private previousMode: FormMode | null = null;
  private openedWith: FormMode | null = null;

  constructor() {
    effect(() => {
      const mode = this.mode();
      const previous = this.previousMode;
      this.previousMode = mode;
      if (mode && !previous) {
        this.openedWith = mode;
      }
      if (mode !== previous) {
        afterNextRender(() => this.moveFocus(mode, previous), { injector: this.injector });
      }
    });
  }

  protected open(mode: FormMode): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { forma: mode } });
  }

  protected back(): void {
    if (this.mode()) {
      void this.router.navigate([], { relativeTo: this.route, queryParams: {} });
    }
  }

  private moveFocus(mode: FormMode | null, previous: FormMode | null): void {
    if (mode) {
      this.host.nativeElement.querySelector<HTMLInputElement>(`#${FIRST_FIELD[mode]}`)?.focus();
    } else if (previous) {
      const opener = this.openedWith ?? previous;
      const button = opener === 'prijava' ? this.loginButton() : this.registerButton();
      button.nativeElement.focus();
    }
  }
}

function toMode(value: string | null): FormMode | null {
  return value === 'prijava' || value === 'registracija' ? value : null;
}
