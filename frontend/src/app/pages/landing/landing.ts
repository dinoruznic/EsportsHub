import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { LandingBackground } from './landing-background';
import { LANDING_IMAGES } from './landing-images';

export type FormMode = 'prijava' | 'registracija';

@Component({
  selector: 'app-landing',
  imports: [LandingBackground],
  templateUrl: './landing.html',
  styleUrl: './landing.scss',
})
export default class LandingPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly images = LANDING_IMAGES;
  protected readonly mode = toSignal(
    this.route.queryParamMap.pipe(map((params) => toMode(params.get('forma')))),
    { initialValue: null },
  );

  protected toggle(mode: FormMode): void {
    this.open(this.mode() === mode ? null : mode);
  }

  protected open(mode: FormMode | null): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { forma: mode },
      replaceUrl: true,
    });
  }
}

function toMode(value: string | null): FormMode | null {
  return value === 'prijava' || value === 'registracija' ? value : null;
}
