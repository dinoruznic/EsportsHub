import { Component, computed, inject, input, output, signal } from '@angular/core';
import { AdminApi } from '../../core/api/admin-api';
import { toApiError } from '../../core/api/api-error';
import { AdminUser } from '../../core/api/models';
import { AuthService } from '../../core/auth/auth.service';
import { ConfirmInline } from '../../shared/confirm-inline/confirm-inline';
import { Drawer } from '../../shared/drawer/drawer';
import { RoleChip } from '../../shared/role-chip/role-chip';

const MANAGED = [
  { role: 'ORGANIZER', label: 'Organizator', hint: 'Pravi turnire i dodjeljuje sudije.' },
  { role: 'REFEREE', label: 'Sudija', hint: 'Vodi dodijeljene mečeve.' },
  { role: 'ADMIN', label: 'Admin', hint: 'Upravlja korisnicima i odobrava turnire.' },
];

@Component({
  selector: 'app-user-roles-drawer',
  imports: [ConfirmInline, Drawer, RoleChip],
  template: `
    @let u = user();
    <app-drawer [label]="'Uloge korisnika ' + u.username" (close)="close.emit()">
      <header class="head">
        <p class="eyebrow">Uloge</p>
        <h2 class="title">{{ u.displayName || u.username }}</h2>
        <p class="handle num">&#64;{{ u.username }}</p>
      </header>

      <div class="fixed">
        <app-role-chip role="PLAYER" [large]="true" />
        <span class="fixed-hint">Svaki korisnik je igrač.</span>
      </div>

      <ul class="toggles">
        @for (item of managed; track item.role) {
          @let on = has(item.role);
          @let locked = item.role === 'ADMIN' && isSelf();
          <li class="toggle-row" [attr.data-role]="item.role">
            <div class="toggle-text">
              <span class="toggle-label" [id]="'role-' + item.role">{{ item.label }}</span>
              <span class="toggle-hint">
                {{ locked ? 'Ne možeš ukloniti svoju admin ulogu.' : item.hint }}
              </span>
            </div>
            <button
              type="button"
              class="switch"
              role="switch"
              [attr.aria-labelledby]="'role-' + item.role"
              [attr.aria-checked]="on"
              [disabled]="locked || busy() !== null"
              (click)="toggle(item.role)"
            >
              <span class="knob"></span>
            </button>
            @if (item.role === 'ADMIN' && confirmAdmin()) {
              <app-confirm-inline
                class="admin-confirm"
                label="Ukloni admin ulogu"
                question="Ukloniti admin ulogu?"
                confirmLabel="Da, ukloni"
                [busy]="busy() === 'ADMIN'"
                [(asking)]="confirmAdmin"
                (confirmed)="revoke('ADMIN')"
              />
            }
          </li>
        }
      </ul>

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

    .handle,
    .fixed-hint,
    .toggle-hint {
      color: var(--muted);
      font-size: 13px;
    }

    .fixed {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .toggles {
      display: grid;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    .toggle-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px 16px;
      padding: 12px 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel-2);
    }

    .toggle-text {
      display: grid;
      gap: 4px;
    }

    .toggle-label {
      font-weight: 600;
    }

    .admin-confirm {
      grid-column: 1 / -1;
    }

    .switch {
      position: relative;
      width: 42px;
      height: 24px;
      padding: 0;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--raise);
      cursor: pointer;

      &[aria-checked='true'] {
        border-color: var(--gold);
        background: rgb(226 177 84 / 0.3);

        .knob {
          transform: translateX(18px);
          background: var(--gold);
        }
      }

      &:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }

      &:focus-visible {
        outline: 2px solid var(--gold);
        outline-offset: 2px;
      }
    }

    .knob {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--muted);
      transition: transform 0.15s ease;
    }

    .error {
      color: var(--red);
      font-size: 13px;
    }
  `,
})
export class UserRolesDrawer {
  private readonly adminApi = inject(AdminApi);
  private readonly auth = inject(AuthService);

  readonly user = input.required<AdminUser>();
  readonly changed = output<AdminUser>();
  readonly close = output<void>();

  protected readonly managed = MANAGED;
  protected readonly busy = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly confirmAdmin = signal(false);
  protected readonly isSelf = computed(
    () => this.user().username === this.auth.currentUser()?.username,
  );

  protected has(role: string): boolean {
    return this.user().roles.includes(role);
  }

  protected toggle(role: string): void {
    if (!this.has(role)) {
      this.run(role, this.adminApi.grantRole(this.user().username, role));
    } else if (role === 'ADMIN') {
      this.confirmAdmin.set(true);
    } else {
      this.revoke(role);
    }
  }

  protected revoke(role: string): void {
    this.run(role, this.adminApi.revokeRole(this.user().username, role));
  }

  private run(role: string, request: ReturnType<AdminApi['grantRole']>): void {
    this.busy.set(role);
    this.error.set(null);
    request.subscribe({
      next: (roles) => {
        this.busy.set(null);
        this.confirmAdmin.set(false);
        this.changed.emit({ ...this.user(), roles });
      },
      error: (error: unknown) => {
        this.busy.set(null);
        this.error.set(toApiError(error).message);
      },
    });
  }
}
