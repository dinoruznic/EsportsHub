import { Component, ElementRef, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { GamesApi } from '../../core/api/games-api';
import { CreateTournamentRequest, TOURNAMENT_FORMATS } from '../../core/api/models';
import { TournamentsApi } from '../../core/api/tournaments-api';
import { ErrorState } from '../../shared/error-state/error-state';
import {
  FieldMessages,
  applyServerErrors,
  errorMessage,
  focusFirstInvalid,
  notBlank,
} from '../landing/auth-form-utils';

export const TEAM_COUNTS = [2, 4, 8, 16];

export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function wholeNumber(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value.trim() : '';
  return value === '' || /^\d{1,9}$/.test(value) ? null : { wholeNumber: true };
}

function notInPast(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value : '';
  return value === '' || value >= todayIso() ? null : { past: true };
}

@Component({
  selector: 'app-novi-turnir',
  imports: [ReactiveFormsModule, RouterLink, ErrorState],
  templateUrl: './novi-turnir.html',
  styleUrl: './novi-turnir.scss',
})
export default class NoviTurnir {
  private readonly api = inject(TournamentsApi);
  private readonly gamesApi = inject(GamesApi);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly formats = TOURNAMENT_FORMATS;
  protected readonly teamCounts = TEAM_COUNTS;
  protected readonly today = todayIso();
  protected readonly games = rxResource({ stream: () => this.gamesApi.list() });

  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [notBlank, Validators.maxLength(80)] }),
    gameId: new FormControl('', { nonNullable: true, validators: [notBlank] }),
    format: new FormControl(TOURNAMENT_FORMATS[0].value, { nonNullable: true, validators: [notBlank] }),
    maxTeams: new FormControl('8', { nonNullable: true, validators: [notBlank] }),
    prizePool: new FormControl('', { nonNullable: true, validators: [wholeNumber] }),
    startDate: new FormControl('', { nonNullable: true, validators: [notInPast] }),
  });

  private readonly messages: Record<keyof typeof this.form.controls, FieldMessages> = {
    name: { required: 'Obavezno polje.', maxlength: 'Naziv može imati najviše 80 znakova.' },
    gameId: { required: 'Izaberi igru.' },
    format: { required: 'Izaberi format.' },
    maxTeams: { required: 'Izaberi broj timova.' },
    prizePool: { wholeNumber: 'Unesi cijeli broj, 0 ili veći.' },
    startDate: { past: 'Datum ne može biti u prošlosti.' },
  };

  protected error(name: keyof typeof this.form.controls): string | null {
    return errorMessage(this.form.controls[name], this.submitted(), this.messages[name]);
  }

  protected gamesError(): string {
    return toApiError(this.games.error()).message;
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      focusFirstInvalid(this.form, this.host.nativeElement);
      return;
    }
    this.serverError.set(null);
    this.submitting.set(true);
    this.api.create(this.request()).subscribe({
      next: (created) => void this.router.navigate(['/turniri', created.id]),
      error: (error: unknown) => {
        const apiError = toApiError(error);
        applyServerErrors(this.form, apiError.fieldErrors);
        this.serverError.set(apiError.message);
        this.submitting.set(false);
      },
    });
  }

  private request(): CreateTournamentRequest {
    const value = this.form.getRawValue();
    return {
      name: value.name.trim(),
      gameId: Number(value.gameId),
      format: value.format,
      maxTeams: Number(value.maxTeams),
      prizePool: value.prizePool.trim() === '' ? null : Number(value.prizePool.trim()),
      startDate: value.startDate === '' ? null : new Date(`${value.startDate}T00:00:00`).toISOString(),
    };
  }
}
