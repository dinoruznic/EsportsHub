import { Component, computed, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { MarketApi } from '../../core/api/market-api';
import { Contract, Offer } from '../../core/api/models';
import { ConfirmInline } from '../../shared/confirm-inline/confirm-inline';
import { formatDate, formatKm } from '../../shared/format';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { TeamHex } from '../../shared/team-hex/team-hex';
import { OfferStatus } from './offer-status';

const ACCEPT_EXPLANATION =
  'Potpisuje se ugovor, igrač prelazi u tim, ostale ponude se odbijaju i oglas se zatvara.';

@Component({
  selector: 'app-listing-offers',
  imports: [RouterLink, ConfirmInline, Skeleton, TeamHex, OfferStatus],
  template: `
    @if (contract(); as c) {
      <div class="success" role="status">
        <p class="success-title">Ugovor je potpisan</p>
        <p class="success-text">
          {{ c.inGameName }} prelazi u tim <strong>{{ c.teamName }}</strong> za
          <span class="num">{{ amount(c.salary) }}</span
          >, od {{ date(c.startDate) }}.
        </p>
        <a class="btn btn-gold" [routerLink]="['/timovi', c.teamId]">Otvori tim</a>
      </div>
    } @else {
      <h3 class="title">Ponude</h3>
      @if (offers.error()) {
        <p class="error" role="alert">{{ loadError() }}</p>
      } @else if (!offers.hasValue()) {
        <app-skeleton [count]="1" [height]="70" />
      } @else if (sorted().length === 0) {
        <p class="none">Još nema ponuda za ovaj oglas.</p>
      } @else {
        <ul class="list">
          @for (o of sorted(); track o.id) {
            <li class="offer" [attr.data-offer-id]="o.id" [attr.data-status]="o.status">
              <app-team-hex [teamId]="o.fromTeamId" [label]="o.fromTeamName" [size]="34" />
              <div class="body">
                <div class="line">
                  <a class="team" [routerLink]="['/timovi', o.fromTeamId]">{{ o.fromTeamName }}</a>
                  <span class="num amount">{{ amount(o.amount) }}</span>
                  <app-offer-status [status]="o.status" />
                </div>
                @if (o.message) {
                  <p class="message">„{{ o.message }}"</p>
                }
                <p class="date">{{ date(o.createdAt) }}</p>
                @if (o.status === 'PENDING') {
                  <div class="actions">
                    <app-confirm-inline
                      class="accept"
                      label="Prihvati"
                      tone="gold"
                      [question]="explanation"
                      confirmLabel="Da, prihvati"
                      [busy]="busyId() === o.id"
                      (confirmed)="accept(o)"
                    />
                    <button
                      type="button"
                      class="btn btn-ghost reject"
                      [disabled]="busyId() === o.id"
                      (click)="reject(o)"
                    >
                      Odbij
                    </button>
                  </div>
                }
              </div>
            </li>
          }
        </ul>
      }
      @if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }
    }
  `,
  styleUrl: './listing-offers.scss',
})
export class ListingOffers {
  private readonly marketApi = inject(MarketApi);

  readonly listingId = input.required<number>();
  readonly accepted = output<Contract>();
  readonly changed = output<void>();

  protected readonly explanation = ACCEPT_EXPLANATION;
  protected readonly offers = rxResource({
    params: () => this.listingId(),
    stream: ({ params }) => this.marketApi.offers(params),
  });
  protected readonly sorted = computed(() =>
    (this.offers.hasValue() ? [...this.offers.value()] : []).sort(
      (a, b) =>
        Number(b.status === 'PENDING') - Number(a.status === 'PENDING') ||
        b.createdAt.localeCompare(a.createdAt),
    ),
  );
  protected readonly busyId = signal<number | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly contract = signal<Contract | null>(null);

  protected loadError(): string {
    return toApiError(this.offers.error()).message;
  }

  protected amount(value: number | null): string {
    return value === null ? '—' : formatKm(value);
  }

  protected date(value: string | null): string {
    return value ? formatDate(value) : '—';
  }

  protected accept(offer: Offer): void {
    this.run(offer, this.marketApi.acceptOffer(offer.id), (contract) => {
      this.contract.set(contract as Contract);
      this.accepted.emit(contract as Contract);
    });
  }

  protected reject(offer: Offer): void {
    this.run(offer, this.marketApi.rejectOffer(offer.id), () => {
      this.offers.reload();
      this.changed.emit();
    });
  }

  private run(offer: Offer, request: Observable<unknown>, done: (value: unknown) => void): void {
    this.busyId.set(offer.id);
    this.error.set(null);
    request.subscribe({
      next: (value) => {
        this.busyId.set(null);
        done(value);
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.error.set(toApiError(error).message);
      },
    });
  }
}
