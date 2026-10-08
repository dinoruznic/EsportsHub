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
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { toApiError } from '../../core/api/api-error';
import { MarketApi } from '../../core/api/market-api';
import { Offer, Team } from '../../core/api/models';
import { formatKm } from '../../shared/format';
import {
  FieldMessages,
  applyServerErrors,
  errorMessage,
  focusFirstInvalid,
  notBlank,
} from '../landing/auth-form-utils';

function positiveAmount(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value.replace(/\./g, '').trim() : '';
  if (value === '') {
    return null;
  }
  return /^\d{1,9}$/.test(value) && Number(value) > 0 ? null : { positive: true };
}

@Component({
  selector: 'app-offer-form',
  imports: [ReactiveFormsModule],
  template: `
    <h3 class="title">Pošalji ponudu</h3>
    <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
      @if (serverError(); as message) {
        <p class="banner" role="alert">{{ message }}</p>
      }
      <div class="field">
        <label class="field-label" for="offer-team">Tim</label>
        <select
          id="offer-team"
          class="field-input"
          formControlName="teamId"
          [attr.aria-invalid]="error('teamId') ? true : null"
        >
          <option value="" disabled>Izaberi tim</option>
          @for (t of teams(); track t.id) {
            <option [value]="t.id">{{ t.name }} ({{ t.tag }})</option>
          }
        </select>
        @if (error('teamId'); as message) {
          <p class="field-error">{{ message }}</p>
        }
      </div>
      <div class="field">
        <label class="field-label" for="offer-amount">
          Iznos (KM)
          @if (preview(); as p) {
            <span class="field-hint num">{{ p }}</span>
          }
        </label>
        <input
          id="offer-amount"
          class="field-input"
          type="text"
          inputmode="numeric"
          formControlName="amount"
          autocomplete="off"
          [attr.aria-invalid]="error('amount') ? true : null"
          [attr.aria-describedby]="error('amount') ? 'offer-amount-error' : null"
        />
        @if (error('amount'); as message) {
          <p class="field-error" id="offer-amount-error">{{ message }}</p>
        }
      </div>
      <div class="field">
        <label class="field-label" for="offer-message">
          Poruka
          <span class="field-hint">neobavezno, do 255 znakova</span>
        </label>
        <textarea
          id="offer-message"
          class="field-input message"
          rows="3"
          formControlName="message"
          [attr.aria-invalid]="error('message') ? true : null"
        ></textarea>
        @if (error('message'); as message) {
          <p class="field-error">{{ message }}</p>
        }
      </div>
      <button type="submit" class="btn btn-gold submit" [disabled]="submitting()">
        {{ submitting() ? 'Šaljem…' : 'Pošalji ponudu' }}
      </button>
    </form>
  `,
  styles: `
    :host {
      display: grid;
      gap: 12px;
      padding: 16px;
      border: 1px solid rgb(226 177 84 / 0.35);
      border-radius: 10px;
      background: var(--panel-2);
    }

    .title {
      font: 700 18px/1 var(--display);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    form {
      display: grid;
      gap: 12px;
    }

    .message {
      height: auto;
      padding: 10px 12px;
      line-height: 1.4;
      resize: vertical;
    }

    .banner {
      padding: 10px 12px;
      border: 1px solid rgb(239 91 91 / 0.4);
      border-radius: 8px;
      background: rgb(239 91 91 / 0.12);
      color: #ffb4b4;
      font-size: 13px;
    }

    .submit {
      justify-self: end;
    }
  `,
})
export class OfferForm implements OnInit {
  private readonly marketApi = inject(MarketApi);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly listingId = input.required<number>();
  readonly teams = input.required<Team[]>();
  readonly sent = output<Offer>();

  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = new FormGroup({
    teamId: new FormControl('', { nonNullable: true, validators: [notBlank] }),
    amount: new FormControl('', { nonNullable: true, validators: [notBlank, positiveAmount] }),
    message: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(255)] }),
  });

  private readonly messages: Record<string, FieldMessages> = {
    teamId: { required: 'Izaberi tim.' },
    amount: { required: 'Obavezno polje.', positive: 'Iznos mora biti cijeli broj veći od 0.' },
    message: { maxlength: 'Poruka može imati najviše 255 znakova.' },
  };

  private readonly amountValue = toSignal(this.form.controls.amount.valueChanges, {
    initialValue: '',
  });
  protected readonly preview = computed(() => {
    const raw = this.amountValue().replace(/\./g, '').trim();
    return /^\d{1,9}$/.test(raw) && Number(raw) > 0 ? formatKm(Number(raw)) : null;
  });

  ngOnInit(): void {
    const teams = this.teams();
    if (teams.length === 1) {
      this.form.controls.teamId.setValue(String(teams[0].id));
    }
  }

  protected error(name: keyof typeof this.form.controls): string | null {
    return errorMessage(this.form.controls[name], this.submitted(), this.messages[name] ?? {});
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
    this.marketApi
      .makeOffer(this.listingId(), {
        teamId: Number(value.teamId),
        amount: Number(value.amount.replace(/\./g, '').trim()),
        message: value.message.trim() || null,
      })
      .subscribe({
        next: (offer) => {
          this.submitting.set(false);
          this.sent.emit(offer);
        },
        error: (error: unknown) => {
          const apiError = toApiError(error);
          applyServerErrors(this.form, apiError.fieldErrors);
          this.serverError.set(apiError.message);
          this.submitting.set(false);
        },
      });
  }
}
