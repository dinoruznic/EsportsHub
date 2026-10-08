import { Component, computed, input } from '@angular/core';
import { tierColor, tierKey } from './account-format';

@Component({
  selector: 'app-rank-emblem',
  template: `
    <svg
      viewBox="0 0 48 48"
      [style.width.px]="size()"
      [style.height.px]="size()"
      aria-hidden="true"
    >
      <path
        class="shield"
        d="M24 3 42 10v14c0 11-8 18-18 22C14 42 6 35 6 24V10Z"
        [attr.fill]="color()"
      />
      <path class="inner" d="M24 12 34 24 24 36 14 24Z" />
      @if (high()) {
        <path class="crown" d="M15 7l4 4 5-6 5 6 4-4" />
      }
    </svg>
  `,
  host: { class: 'rank-emblem', '[attr.data-tier]': 'tier()', '[style.--tier]': 'color()' },
  styles: `
    :host {
      display: inline-grid;
      flex: none;
      filter: drop-shadow(0 0 8px color-mix(in srgb, var(--tier) 35%, transparent));
    }

    .shield {
      stroke: rgb(255 255 255 / 0.25);
      stroke-width: 1.2;
    }

    .inner {
      fill: rgb(10 14 20 / 0.35);
      stroke: rgb(255 255 255 / 0.45);
      stroke-width: 1.2;
    }

    .crown {
      fill: none;
      stroke: #f3f5f8;
      stroke-width: 1.6;
      stroke-linejoin: round;
    }
  `,
})
export class RankEmblem {
  readonly rank = input<string | null>(null);
  readonly size = input(40);

  protected readonly tier = computed(() => tierKey(this.rank()) || 'nepoznat');
  protected readonly color = computed(() => tierColor(this.rank()) ?? 'var(--muted)');
  protected readonly high = computed(() =>
    ['master', 'grandmaster', 'challenger', 'immortal', 'radiant'].includes(tierKey(this.rank())),
  );
}
