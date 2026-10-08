import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, of } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { GameAccountsApi } from '../../core/api/game-accounts-api';
import { GamesApi } from '../../core/api/games-api';
import { GameOption } from '../../core/api/models';
import { TeamsApi } from '../../core/api/teams-api';
import { ErrorState } from '../../shared/error-state/error-state';
import {
  FieldMessages,
  applyServerErrors,
  errorMessage,
  focusFirstInvalid,
  notBlank,
} from '../landing/auth-form-utils';

const FIELD_FOR_CONFLICT: Record<string, string> = {
  'team name taken': 'name',
  'team tag taken': 'tag',
};

@Component({
  selector: 'app-novi-tim',
  imports: [ReactiveFormsModule, RouterLink, ErrorState],
  templateUrl: './novi-tim.html',
  styleUrl: './novi-tim.scss',
})
export default class NoviTim {
  private readonly teamsApi = inject(TeamsApi);
  private readonly gamesApi = inject(GamesApi);
  private readonly accountsApi = inject(GameAccountsApi);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly games = rxResource({ stream: () => this.gamesApi.list() });
  private readonly myAccounts = rxResource({
    stream: () => this.accountsApi.listMine().pipe(catchError(() => of([]))),
  });

  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly regions = signal<GameOption[]>([]);

  protected readonly form = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(60)],
    }),
    tag: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(5)],
    }),
    gameId: new FormControl('', { nonNullable: true, validators: [notBlank] }),
    region: new FormControl('', { nonNullable: true }),
  });

  private readonly messages: Record<string, FieldMessages> = {
    name: { required: 'Obavezno polje.', maxlength: 'Naziv može imati najviše 60 znakova.' },
    tag: { required: 'Obavezno polje.', maxlength: 'Tag može imati najviše 5 znakova.' },
    gameId: { required: 'Izaberi igru.' },
  };

  private readonly gameId = toSignal(this.form.controls.gameId.valueChanges, { initialValue: '' });
  protected readonly selectedGame = computed(() => {
    const id = Number(this.gameId());
    return (this.games.hasValue() ? this.games.value() : []).find((game) => game.id === id) ?? null;
  });
  protected readonly missingAccount = computed(() => {
    const game = this.selectedGame();
    if (!game || !this.myAccounts.hasValue()) {
      return false;
    }
    return !this.myAccounts.value().some((account) => account.gameCode === game.code);
  });

  constructor() {
    this.form.controls.tag.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      const upper = value.toUpperCase();
      if (upper !== value) {
        this.form.controls.tag.setValue(upper, { emitEvent: false });
      }
    });
    this.form.controls.gameId.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.form.controls.region.setValue('');
      this.regions.set([]);
      const id = Number(value);
      if (id) {
        this.gamesApi
          .regions(id)
          .pipe(catchError(() => of([])))
          .subscribe((regions) => this.regions.set(regions));
      }
    });
  }

  protected error(name: keyof typeof this.form.controls): string | null {
    return errorMessage(this.form.controls[name], this.submitted(), this.messages[name] ?? {});
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
    const value = this.form.getRawValue();
    this.serverError.set(null);
    this.submitting.set(true);
    this.teamsApi
      .create({
        name: value.name.trim(),
        tag: value.tag.trim(),
        gameId: Number(value.gameId),
        region: value.region || null,
        logoUrl: null,
      })
      .subscribe({
        next: (team) => void this.router.navigate(['/timovi', team.id]),
        error: (error: unknown) => {
          const apiError = toApiError(error);
          const backendMessage = (error as { error?: { message?: string } })?.error?.message ?? '';
          const field = FIELD_FOR_CONFLICT[backendMessage.trim().toLowerCase()];
          applyServerErrors(
            this.form,
            field ? { [field]: apiError.message } : apiError.fieldErrors,
          );
          this.serverError.set(field ? null : apiError.message);
          this.submitting.set(false);
        },
      });
  }
}
