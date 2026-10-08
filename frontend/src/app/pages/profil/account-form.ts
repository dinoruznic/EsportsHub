import {
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { toApiError } from '../../core/api/api-error';
import { GameAccountsApi } from '../../core/api/game-accounts-api';
import { GameOptions, GamesApi } from '../../core/api/games-api';
import { Game, GameAccount, GameAccountRequest, GameOption } from '../../core/api/models';
import { rankLabel } from './account-format';
import {
  FieldMessages,
  applyServerErrors,
  errorMessage,
  focusFirstInvalid,
  notBlank,
} from '../landing/auth-form-utils';

function wholeNumber(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value.trim() : '';
  return value === '' || /^\d{1,9}$/.test(value) ? null : { wholeNumber: true };
}

function idOf(options: GameOption[], label: string | null): string {
  if (!label) {
    return '';
  }
  return String(options.find((option) => option.label === label)?.id ?? '');
}

const EMPTY_OPTIONS: GameOptions = { regions: [], positions: [], ranks: [] };

@Component({
  selector: 'app-account-form',
  imports: [ReactiveFormsModule],
  templateUrl: './account-form.html',
  styleUrl: './account-form.scss',
  host: { class: 'panel' },
})
export class AccountForm implements OnInit {
  private readonly accountsApi = inject(GameAccountsApi);
  private readonly gamesApi = inject(GamesApi);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly games = input.required<Game[]>();
  readonly usedGameCodes = input<string[]>([]);
  readonly account = input<GameAccount | null>(null);
  readonly saved = output<GameAccount>();
  readonly cancelled = output<void>();

  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly options = signal<GameOptions>(EMPTY_OPTIONS);
  protected readonly optionsLoading = signal(false);
  private readonly gameId = signal<number | null>(null);

  protected readonly form = new FormGroup({
    gameId: new FormControl('', { nonNullable: true, validators: [notBlank] }),
    inGameName: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(60)],
    }),
    regionId: new FormControl('', { nonNullable: true }),
    positionId: new FormControl('', { nonNullable: true }),
    rankId: new FormControl('', { nonNullable: true }),
    rating: new FormControl('', { nonNullable: true, validators: [wholeNumber] }),
  });

  private readonly messages: Record<string, FieldMessages> = {
    gameId: { required: 'Izaberi igru.' },
    inGameName: {
      required: 'Obavezno polje.',
      maxlength: 'Ime u igri može imati najviše 60 znakova.',
    },
    rating: { wholeNumber: 'Unesi cijeli broj, 0 ili veći.' },
  };

  protected readonly editing = computed(() => this.account() !== null);
  protected readonly selectableGames = computed(() => {
    if (this.editing()) {
      return this.games();
    }
    const used = new Set(this.usedGameCodes());
    return this.games().filter((game) => !used.has(game.code));
  });
  protected readonly game = computed(
    () => this.games().find((g) => g.id === this.gameId()) ?? null,
  );
  protected readonly rankType = computed(() => this.game()?.rankType ?? 'NONE');

  constructor() {
    this.form.controls.gameId.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      if (!this.editing()) {
        this.selectGame(Number(value) || null, null);
      }
    });
  }

  ngOnInit(): void {
    const account = this.account();
    if (!account) {
      return;
    }
    const game = this.games().find((g) => g.code === account.gameCode) ?? null;
    this.form.controls.gameId.setValue(game ? String(game.id) : '', { emitEvent: false });
    this.form.controls.gameId.disable({ emitEvent: false });
    this.form.controls.inGameName.setValue(account.inGameName);
    this.form.controls.rating.setValue(account.rating === null ? '' : String(account.rating));
    this.selectGame(game?.id ?? null, account);
  }

  protected error(name: keyof typeof this.form.controls): string | null {
    return errorMessage(this.form.controls[name], this.submitted(), this.messages[name] ?? {});
  }

  protected rankName(label: string): string {
    return rankLabel(label);
  }

  protected cancel(): void {
    this.cancelled.emit();
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
    const account = this.account();
    const request$ = account
      ? this.accountsApi.update(account.id, {
          ...this.request(),
          marketStatus: account.marketStatus,
        })
      : this.accountsApi.create({ ...this.request(), gameId: this.gameId()! });
    request$.subscribe({
      next: (saved) => {
        this.submitting.set(false);
        this.saved.emit(saved);
      },
      error: (error: unknown) => {
        const apiError = toApiError(error);
        applyServerErrors(this.form, apiError.fieldErrors);
        this.serverError.set(apiError.message);
        this.submitting.set(false);
      },
    });
  }

  private selectGame(gameId: number | null, account: GameAccount | null): void {
    this.gameId.set(gameId);
    this.form.controls.regionId.setValue('');
    this.form.controls.positionId.setValue('');
    this.form.controls.rankId.setValue('');
    if (!account) {
      this.form.controls.rating.setValue('');
    }
    this.options.set(EMPTY_OPTIONS);
    if (gameId === null) {
      return;
    }
    this.optionsLoading.set(true);
    this.gamesApi.allOptions(gameId).subscribe({
      next: (options) => {
        if (this.gameId() !== gameId) {
          return;
        }
        this.options.set(options);
        this.optionsLoading.set(false);
        if (account) {
          this.form.controls.regionId.setValue(idOf(options.regions, account.region));
          this.form.controls.positionId.setValue(idOf(options.positions, account.position));
          this.form.controls.rankId.setValue(idOf(options.ranks, account.rank));
        }
      },
      error: (error: unknown) => {
        this.optionsLoading.set(false);
        this.serverError.set(toApiError(error).message);
      },
    });
  }

  private request(): GameAccountRequest {
    const value = this.form.getRawValue();
    const type = this.rankType();
    return {
      inGameName: value.inGameName.trim(),
      regionId: value.regionId ? Number(value.regionId) : null,
      positionId: value.positionId ? Number(value.positionId) : null,
      rankId: type === 'TIER' && value.rankId ? Number(value.rankId) : null,
      rating: type === 'NUMERIC' && value.rating.trim() !== '' ? Number(value.rating.trim()) : null,
    };
  }
}
