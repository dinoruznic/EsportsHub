import { Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DemoStatus } from '../../core/api/models';
import { formatNumber } from '../../shared/format';

export function formatUptime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = String(Math.floor((whole % 3600) / 60)).padStart(2, '0');
  const rest = String(whole % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${minutes}:${rest}` : `${minutes}:${rest}`;
}

@Component({
  selector: 'app-admin-demo-mode',
  imports: [RouterLink],
  template: `
    <section class="panel mode" aria-labelledby="demo-mode-title">
      <div class="head">
        <div>
          <h2 class="section-title" id="demo-mode-title">Demo režim</h2>
          <p class="hint">
            Mečevi se igraju sami kroz RabbitMQ; otvori
            <a routerLink="/uzivo">Uživo</a> da gledaš.
          </p>
        </div>
        <div class="actions">
          @if (status().running) {
            <button
              type="button"
              class="btn btn-ghost stop"
              [disabled]="busy()"
              (click)="stop.emit()"
            >
              Zaustavi
            </button>
          } @else {
            <button
              type="button"
              class="btn btn-gold start"
              [disabled]="busy()"
              (click)="start.emit()"
            >
              Pokreni demo mečeve
            </button>
          }
        </div>
      </div>

      <dl class="facts">
        <div class="fact">
          <dt>Status</dt>
          <dd class="state" [class.running]="status().running">
            @if (status().running) {
              <span class="live-dot" aria-hidden="true"></span>
            }
            {{ status().running ? 'Pokrenut' : 'Zaustavljen' }}
          </dd>
        </div>
        <div class="fact">
          <dt>Mečevi uživo</dt>
          <dd class="num live">{{ format(status().liveMatches) }}</dd>
        </div>
        <div class="fact">
          <dt>Poslani snapshotovi</dt>
          <dd class="num sent">{{ format(status().snapshotsSent) }}</dd>
        </div>
        <div class="fact">
          <dt>Vrijeme rada</dt>
          <dd class="num uptime">{{ uptime() }}</dd>
        </div>
      </dl>

      @if (error(); as message) {
        <p class="error" role="alert">{{ message }}</p>
      }
    </section>
  `,
  styles: `
    .mode {
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

    .hint {
      margin-top: 6px;
      color: var(--muted);
      font-size: 13px;

      a {
        color: var(--gold);
      }
    }

    .facts {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin: 0;
    }

    .fact {
      display: grid;
      gap: 6px;
      padding: 10px 12px;
      border: 1px solid var(--line-soft);
      border-radius: 8px;
    }

    dt {
      color: var(--faint);
      font: 500 10.5px/1.2 var(--mono);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    dd {
      margin: 0;
      color: var(--text);
      font: 700 22px/1 var(--display);
    }

    .state {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--muted);

      &.running {
        color: var(--good);
      }
    }

    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--live);
      box-shadow: 0 0 8px var(--live);
      animation: pulse 1.2s ease-in-out infinite;
    }

    .error {
      color: var(--red);
      font-size: 13px;
    }

    @keyframes pulse {
      50% {
        opacity: 0.25;
      }
    }

    @media (max-width: 719.98px) {
      .facts {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `,
})
export class AdminDemoMode {
  readonly status = input.required<DemoStatus>();
  readonly now = input.required<number>();
  readonly busy = input(false);
  readonly error = input<string | null>(null);
  readonly start = output<void>();
  readonly stop = output<void>();

  protected readonly uptime = computed(() => {
    const startedAt = this.status().startedAt;
    if (!this.status().running || !startedAt) {
      return '--:--';
    }
    return formatUptime((this.now() - Date.parse(startedAt)) / 1000);
  });

  protected format(value: number): string {
    return formatNumber(value);
  }
}
