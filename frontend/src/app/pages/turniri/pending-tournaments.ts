import { Component, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { toApiError } from '../../core/api/api-error';
import { Tournament } from '../../core/api/models';
import { TournamentsApi } from '../../core/api/tournaments-api';
import { ConfirmInline } from '../../shared/confirm-inline/confirm-inline';
import { ErrorState } from '../../shared/error-state/error-state';
import { formatDate } from '../../shared/format';
import { GameBadge } from '../../shared/game-badge/game-badge';
import { Skeleton } from '../../shared/skeleton/skeleton';

@Component({
  selector: 'app-pending-tournaments',
  imports: [RouterLink, ConfirmInline, ErrorState, GameBadge, Skeleton],
  template: `
    <h2 class="heading">
      Čeka odobrenje
      @if (pending.hasValue()) {
        <span class="num count">{{ pending.value().length }}</span>
      }
    </h2>
    @if (pending.error()) {
      <app-error-state [message]="loadError()" (retry)="pending.reload()" />
    } @else if (!pending.hasValue()) {
      <app-skeleton [count]="1" [height]="56" />
    } @else if (pending.value().length === 0) {
      <p class="none">Nema turnira koji čekaju odobrenje.</p>
    } @else {
      <ul class="rows">
        @for (t of pending.value(); track t.id) {
          <li class="row" [attr.data-pending-id]="t.id">
            <app-game-badge [code]="t.gameCode" [name]="gameNames()[t.gameCode] ?? null" />
            <a class="name" [routerLink]="['/turniri', t.id]">{{ t.name }}</a>
            <span class="by">
              <a class="player" [routerLink]="['/igraci', t.organizerUsername]">{{
                t.organizerUsername
              }}</a>
              · {{ created(t) }}
            </span>
            <span class="actions">
              <button
                type="button"
                class="btn btn-gold approve"
                [disabled]="busyId() === t.id"
                (click)="approve(t)"
              >
                Odobri
              </button>
              <app-confirm-inline
                label="Odbij"
                question="Odbiti turnir?"
                confirmLabel="Da, odbij"
                [busy]="busyId() === t.id"
                (confirmed)="reject(t)"
              />
            </span>
            @if (errors()[t.id]; as message) {
              <p class="row-error" role="alert">{{ message }}</p>
            }
          </li>
        }
      </ul>
    }
  `,
  styleUrl: './pending-tournaments.scss',
})
export class PendingTournaments {
  private readonly api = inject(TournamentsApi);

  readonly gameNames = input<Record<string, string>>({});
  readonly changed = output<void>();

  protected readonly pending = rxResource({ stream: () => this.api.pending() });
  protected readonly busyId = signal<number | null>(null);
  protected readonly errors = signal<Record<number, string>>({});

  protected loadError(): string {
    return toApiError(this.pending.error()).message;
  }

  protected created(t: Tournament): string {
    return formatDate(t.createdAt);
  }

  protected approve(t: Tournament): void {
    this.run(t, this.api.approve(t.id));
  }

  protected reject(t: Tournament): void {
    this.run(t, this.api.reject(t.id));
  }

  private run(t: Tournament, request: Observable<Tournament>): void {
    this.busyId.set(t.id);
    this.errors.update((errors) => ({ ...errors, [t.id]: '' }));
    request.subscribe({
      next: () => {
        this.busyId.set(null);
        this.pending.reload();
        this.changed.emit();
      },
      error: (error: unknown) => {
        this.busyId.set(null);
        this.errors.update((errors) => ({ ...errors, [t.id]: toApiError(error).message }));
      },
    });
  }
}
