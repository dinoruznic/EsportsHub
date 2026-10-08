import { Component, computed, input } from '@angular/core';
import { SnapshotStats } from '../../core/realtime/messages';
import { formatGold, goldLead, share } from './match-format';

interface StatRow {
  key: string;
  label: string;
  left: string;
  right: string;
  share: number | null;
  note: string | null;
}

@Component({
  selector: 'app-match-stats',
  template: `
    <h2 class="heading">Statistika uživo</h2>
    @if (rows(); as rows) {
      <dl class="rows">
        @for (row of rows; track row.key) {
          <div class="row" [attr.data-stat]="row.key">
            <dt>
              {{ row.label }}
              @if (row.note) {
                <span class="note">{{ row.note }}</span>
              }
            </dt>
            <dd class="values">
              @for (value of [row.left]; track value) {
                <span class="num value blue">{{ value }}</span>
              }
              <span class="bar" [class.empty]="row.share === null">
                <span class="part blue" [style.width.%]="row.share ?? 50"></span>
                <span class="part red"></span>
              </span>
              @for (value of [row.right]; track value) {
                <span class="num value red">{{ value }}</span>
              }
            </dd>
          </div>
        }
      </dl>
    } @else {
      <p class="waiting">Čeka se prvi snapshot iz igre.</p>
    }
  `,
  host: { class: 'panel' },
  styles: `
    :host {
      display: grid;
      align-content: start;
      gap: 14px;
      padding: 18px 20px;
    }

    .heading {
      font: 700 18px/1 var(--display);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .rows {
      display: grid;
      gap: 16px;
      margin: 0;
    }

    .row {
      display: grid;
      gap: 8px;
    }

    dt {
      display: flex;
      justify-content: center;
      gap: 10px;
      color: var(--faint);
      font: 500 10.5px/1.2 var(--mono);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .note {
      color: var(--gold);
    }

    .values {
      display: grid;
      grid-template-columns: 64px minmax(0, 1fr) 64px;
      align-items: center;
      gap: 12px;
      margin: 0;
    }

    .value {
      font-size: 20px;
      font-weight: 700;
      animation: bump 0.6s ease-out;

      &.blue {
        color: var(--blue);
      }

      &.red {
        color: var(--red);
        text-align: right;
      }
    }

    .bar {
      display: flex;
      height: 8px;
      overflow: hidden;
      border-radius: 999px;
      background: var(--line-soft);

      &.empty {
        opacity: 0.35;
      }
    }

    .part {
      height: 100%;
      transition: width 0.4s ease;

      &.blue {
        background: var(--blue);
      }

      &.red {
        flex: 1;
        background: var(--red);
      }
    }

    .waiting {
      color: var(--muted);
      font-size: 14px;
    }

    @keyframes bump {
      from {
        color: var(--gold);
        transform: scale(1.18);
      }
    }
  `,
})
export class MatchStats {
  readonly snapshot = input<SnapshotStats | null>(null);

  protected readonly rows = computed<StatRow[] | null>(() => {
    const s = this.snapshot();
    if (!s) {
      return null;
    }
    const goldKnown = s.goldA !== null && s.goldB !== null;
    return [
      {
        key: 'kills',
        label: 'Kills',
        left: String(s.killsA ?? 0),
        right: String(s.killsB ?? 0),
        share: share(s.killsA, s.killsB),
        note: null,
      },
      {
        key: 'gold',
        label: 'Gold',
        left: formatGold(s.goldA),
        right: formatGold(s.goldB),
        share: goldKnown ? share(s.goldA, s.goldB) : null,
        note: goldLead(s.goldA, s.goldB),
      },
      {
        key: 'towers',
        label: 'Tornjevi',
        left: String(s.towersA ?? 0),
        right: String(s.towersB ?? 0),
        share: share(s.towersA, s.towersB),
        note: null,
      },
    ];
  });
}
