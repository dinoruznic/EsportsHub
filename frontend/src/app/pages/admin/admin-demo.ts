import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, output, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { AdminApi } from '../../core/api/admin-api';
import { toApiError } from '../../core/api/api-error';
import { DemoResetSummary, DemoStatus } from '../../core/api/models';
import { ConfirmInline } from '../../shared/confirm-inline/confirm-inline';
import { formatNumber } from '../../shared/format';
import { RoleChip } from '../../shared/role-chip/role-chip';
import { AdminDemoMode } from './admin-demo-mode';

interface DemoAccount {
  username: string;
  role: string;
  password: string;
  note: string;
}

const PASSWORD = 'lozinka123';

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { username: 'admin', role: 'ADMIN', password: 'admin12345', note: 'Admin panel i demo režim' },
  { username: 'org_sarajevo', role: 'ORGANIZER', password: PASSWORD, note: 'Sarajevo Open' },
  { username: 'org_mostar', role: 'ORGANIZER', password: PASSWORD, note: 'Balkan LoL Kup' },
  { username: 'sudija_amra', role: 'REFEREE', password: PASSWORD, note: 'Polufinale 1' },
  { username: 'sudija_kenan', role: 'REFEREE', password: PASSWORD, note: 'Polufinale 2' },
  { username: 'sudija_lejla', role: 'REFEREE', password: PASSWORD, note: 'Rezervna sudija' },
  { username: 'dino', role: 'PLAYER', password: PASSWORD, note: 'Dvije ponude na marketu' },
  { username: 'kap_wolves', role: 'PLAYER', password: PASSWORD, note: 'Kapiten Balkan Wolves' },
];

const POLL_EVERY_SECONDS = 2;

const RESET_QUESTION = 'Ovo briše sve podatke osim admin naloga i puni bazu demo podacima.';

@Component({
  selector: 'app-admin-demo',
  imports: [AdminDemoMode, ConfirmInline, RoleChip],
  template: `
    @if (status(); as s) {
      <app-admin-demo-mode
        [status]="s"
        [now]="now()"
        [busy]="modeBusy()"
        [error]="modeError()"
        (start)="start()"
        (stop)="stop()"
      />
    }

    @if (!disabled()) {
      <section class="panel demo" aria-labelledby="demo-title">
        <div class="head">
          <div>
            <h2 class="section-title" id="demo-title">Demo</h2>
            <p class="hint">Čisti podaci za prezentaciju jednim klikom.</p>
          </div>
          <app-confirm-inline
            class="reset"
            label="Resetuj demo podatke"
            [question]="question"
            confirmLabel="Da, resetuj"
            [busy]="busy()"
            (confirmed)="reset()"
          />
        </div>

        @if (busy()) {
          <p class="progress" role="status">Punim bazu demo podacima…</p>
        }
        @if (summary(); as s) {
          <div class="success" role="status">
            <p class="success-title">Demo podaci su spremni</p>
            <p class="success-text">
              Korisnici <span class="num">{{ format(s.users) }}</span> · Timovi
              <span class="num">{{ format(s.teams) }}</span> · Turniri
              <span class="num">{{ format(s.tournaments) }}</span> · Oglasi
              <span class="num">{{ format(s.listings) }}</span>
            </p>
          </div>
        }
        @if (error(); as message) {
          <p class="error" role="alert">{{ message }}</p>
        }

        <h3 class="table-title">Demo nalozi</h3>
        <div class="table-wrap">
          <table class="accounts">
            <thead>
              <tr>
                <th scope="col">Korisnik</th>
                <th scope="col">Uloga</th>
                <th scope="col">Lozinka</th>
                <th scope="col">Za demo</th>
              </tr>
            </thead>
            <tbody>
              @for (a of accounts; track a.username) {
                <tr [attr.data-account]="a.username">
                  <td class="num">{{ a.username }}</td>
                  <td><app-role-chip [role]="a.role" /></td>
                  <td class="num password">{{ a.password }}</td>
                  <td class="note">{{ a.note }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: 20px;
    }

    .demo {
      display: grid;
      gap: 14px;
      padding: 18px 20px;
    }

    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px 24px;
    }

    .section-title {
      font: 700 18px/1 var(--display);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .hint,
    .progress {
      margin-top: 6px;
      color: var(--muted);
      font-size: 13px;
    }

    .success {
      display: grid;
      gap: 6px;
      padding: 12px 14px;
      border: 1px solid rgb(63 178 127 / 0.5);
      border-radius: 10px;
      background: rgb(63 178 127 / 0.1);
    }

    .success-title {
      color: var(--good);
      font: 700 16px/1 var(--display);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .success-text {
      font-size: 14px;

      .num {
        color: var(--gold);
        font-weight: 700;
      }
    }

    .error {
      color: var(--red);
      font-size: 13px;
    }

    .table-title {
      color: var(--faint);
      font: 500 10.5px/1.2 var(--mono);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .table-wrap {
      overflow-x: auto;
    }

    .accounts {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;

      th {
        padding: 8px 12px 8px 0;
        border-bottom: 1px solid var(--line);
        color: var(--faint);
        font: 500 10.5px/1.2 var(--mono);
        letter-spacing: 0.1em;
        text-align: left;
        text-transform: uppercase;
      }

      td {
        padding: 9px 12px 9px 0;
        border-bottom: 1px solid var(--line-soft);
        white-space: nowrap;
      }
    }

    .password {
      color: var(--gold);
    }

    .note {
      color: var(--muted);
    }
  `,
})
export class AdminDemo {
  private readonly adminApi = inject(AdminApi);

  readonly changed = output<void>();

  protected readonly accounts = DEMO_ACCOUNTS;
  protected readonly question = RESET_QUESTION;
  protected readonly busy = signal(false);
  protected readonly summary = signal<DemoResetSummary | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly status = signal<DemoStatus | null>(null);
  protected readonly disabled = signal(false);
  protected readonly modeBusy = signal(false);
  protected readonly modeError = signal<string | null>(null);
  protected readonly now = signal(Date.now());

  constructor() {
    this.loadStatus();
    let ticks = 0;
    const timer = setInterval(() => {
      this.now.set(Date.now());
      ticks++;
      if (this.status()?.running && ticks % POLL_EVERY_SECONDS === 0) {
        this.loadStatus();
      }
    }, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected start(): void {
    this.changeMode(this.adminApi.startDemo());
  }

  protected stop(): void {
    this.changeMode(this.adminApi.stopDemo());
  }

  protected reset(): void {
    this.busy.set(true);
    this.summary.set(null);
    this.error.set(null);
    this.adminApi.resetDemo().subscribe({
      next: (summary) => {
        this.busy.set(false);
        this.summary.set(summary);
        this.changed.emit();
        this.loadStatus();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(
          error instanceof HttpErrorResponse && error.status === 404
            ? 'Demo režim je isključen na serveru.'
            : toApiError(error).message,
        );
      },
    });
  }

  private changeMode(request: Observable<DemoStatus>): void {
    this.modeBusy.set(true);
    this.modeError.set(null);
    request.subscribe({
      next: (status) => {
        this.modeBusy.set(false);
        this.status.set(status);
        this.changed.emit();
      },
      error: (error: unknown) => {
        this.modeBusy.set(false);
        this.modeError.set(toApiError(error).message);
      },
    });
  }

  private loadStatus(): void {
    this.adminApi.demoStatus().subscribe({
      next: (status) => {
        const previous = this.status();
        this.status.set(status);
        if (previous && previous.liveMatches !== status.liveMatches) {
          this.changed.emit();
        }
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 404) {
          this.disabled.set(true);
        }
      },
    });
  }

  protected format(value: number): string {
    return formatNumber(value);
  }
}
