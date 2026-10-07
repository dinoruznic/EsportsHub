import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  template: `
    @for (item of items(); track item) {
      <div class="block" [style.height.px]="height()"></div>
    }
  `,
  host: { class: 'skeleton', 'aria-busy': 'true', 'aria-label': 'Učitavanje' },
  styles: `
    :host {
      display: grid;
      gap: 16px;
    }

    .block {
      border: 1px solid var(--line-soft);
      border-radius: 10px;
      background: linear-gradient(100deg, var(--panel) 30%, var(--panel-2) 50%, var(--panel) 70%) 0 0 / 300% 100%;
      animation: shimmer 1.4s linear infinite;
    }

    @keyframes shimmer {
      to {
        background-position: -150% 0;
      }
    }
  `,
})
export class Skeleton {
  readonly count = input(3);
  readonly height = input(180);
  protected readonly items = computed(() => Array.from({ length: this.count() }, (_, index) => index));
}
