import { Component, inject, input, output, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { toApiError } from '../../core/api/api-error';
import { MatchesApi } from '../../core/api/matches-api';
import { BracketMatch } from '../../core/api/models';
import { Drawer } from '../../shared/drawer/drawer';
import { ErrorState } from '../../shared/error-state/error-state';
import { Skeleton } from '../../shared/skeleton/skeleton';
import { MatchCard } from './bracket/bracket-layout';

@Component({
  selector: 'app-referee-picker',
  imports: [Drawer, ErrorState, Skeleton],
  template: `
    @let m = match();
    <app-drawer [label]="'Sudija za M' + m.number" (close)="close.emit()">
      <header class="head">
        <p class="eyebrow">M{{ m.number }}</p>
        <h2 class="title">Sudija meča</h2>
        <p class="teams">
          {{ m.slots[0].team?.name ?? m.slots[0].placeholder }} vs
          {{ m.slots[1].team?.name ?? m.slots[1].placeholder }}
        </p>
      </header>

      @if (referees.error()) {
        <app-error-state [message]="loadError()" (retry)="referees.reload()" />
      } @else if (!referees.hasValue()) {
        <app-skeleton [count]="3" [height]="52" />
      } @else if (referees.value().length === 0) {
        <p class="empty">Nema sudija. Admin dodjeljuje ulogu sudije.</p>
      } @else {
        <ul class="list" aria-label="Sudije">
          @for (r of referees.value(); track r.username) {
            <li>
              <button
                type="button"
                class="option"
                [attr.data-username]="r.username"
                [attr.aria-pressed]="r.username === m.refereeUsername"
                [disabled]="saving() !== null"
                (click)="pick(r.username)"
              >
                <span class="name">{{ r.displayName || r.username }}</span>
                <span class="username num">{{ r.username }}</span>
                @if (r.username === m.refereeUsername) {
                  <span class="current">Trenutni</span>
                } @else if (saving() === r.username) {
                  <span class="current">Čuvam…</span>
                }
              </button>
            </li>
          }
        </ul>
      }

      @if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }
    </app-drawer>
  `,
  styles: `
    .head {
      display: grid;
      gap: 6px;
    }

    .title {
      font: 700 26px/1 var(--display);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .teams,
    .empty {
      color: var(--muted);
      font-size: 14px;
    }

    .list {
      display: grid;
      gap: 6px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .option {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      grid-template-areas: 'name current' 'username current';
      align-items: center;
      gap: 2px 12px;
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel-2);
      color: var(--text);
      text-align: left;
      cursor: pointer;

      &:hover:not(:disabled) {
        border-color: var(--gold);
      }

      &[aria-pressed='true'] {
        border-color: var(--gold);
        background: rgb(226 177 84 / 0.08);
      }

      &:focus-visible {
        outline: 2px solid var(--gold);
        outline-offset: 2px;
      }

      &:disabled {
        cursor: default;
      }
    }

    .name {
      grid-area: name;
      overflow: hidden;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .username {
      grid-area: username;
      color: var(--faint);
      font-size: 12px;
    }

    .current {
      grid-area: current;
      color: var(--gold);
      font: 700 10.5px/1 var(--mono);
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .error {
      color: var(--red);
      font-size: 13px;
    }
  `,
})
export class RefereePicker {
  private readonly matchesApi = inject(MatchesApi);

  readonly match = input.required<MatchCard>();
  readonly assigned = output<BracketMatch>();
  readonly close = output<void>();

  protected readonly referees = rxResource({ stream: () => this.matchesApi.referees() });
  protected readonly saving = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);

  protected loadError(): string {
    return toApiError(this.referees.error()).message;
  }

  protected pick(username: string): void {
    if (username === this.match().refereeUsername) {
      this.close.emit();
      return;
    }
    this.saving.set(username);
    this.error.set(null);
    this.matchesApi.assignReferee(this.match().id, username).subscribe({
      next: (match) => {
        this.saving.set(null);
        this.assigned.emit(match);
      },
      error: (error: unknown) => {
        this.saving.set(null);
        this.error.set(toApiError(error).message);
      },
    });
  }
}
