import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { LandingBackground } from './landing-background';
import { LANDING_IMAGES } from './landing-images';
import { LoginForm } from './login-form';
import { RegisterForm } from './register-form';

export type FormMode = 'prijava' | 'registracija';

@Component({
  selector: 'app-landing',
  imports: [LandingBackground, LoginForm, RegisterForm],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
  host: { '(document:keydown.escape)': 'close()' },
})
export default class LandingPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly loginButton = viewChild.required<ElementRef<HTMLButtonElement>>('loginButton');
  private readonly registerButton = viewChild.required<ElementRef<HTMLButtonElement>>('registerButton');

  protected readonly images = LANDING_IMAGES;
  protected readonly mode = toSignal(
    this.route.queryParamMap.pipe(map((params) => toMode(params.get('forma')))),
    { initialValue: null },
  );

  protected toggle(mode: FormMode): void {
    if (this.mode() === mode) {
      this.close();
    } else {
      this.open(mode);
    }
  }

  protected open(mode: FormMode | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { forma: mode },
      replaceUrl: true,
    });
  }

  protected close(): void {
    const current = this.mode();
    if (!current) {
      return;
    }
    this.open(null);
    const button = current === 'prijava' ? this.loginButton() : this.registerButton();
    button.nativeElement.focus();
  }
}

function toMode(value: string | null): FormMode | null {
  return value === 'prijava' || value === 'registracija' ? value : null;
}
