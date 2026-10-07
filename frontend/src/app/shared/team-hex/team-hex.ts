import { Component, computed, input } from '@angular/core';

const PALETTE = ['#4d6a8c', '#6a5c94', '#3d7a6c', '#8c5656', '#8c7044', '#4a8290', '#7a5784', '#5c7a43'];

export function teamColor(teamId: number): string {
  return PALETTE[Math.abs(teamId) % PALETTE.length];
}

export function initials(tagOrName: string): string {
  return tagOrName.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase();
}

@Component({
  selector: 'app-team-hex',
  template: `
    <svg viewBox="0 0 24 26" [style.width.px]="size()" [style.height.px]="size() * 1.0833" aria-hidden="true">
      <path
        class="shape"
        [class.empty]="teamId() === null"
        d="M12 1.2 22.4 7.1v11.8L12 24.8 1.6 18.9V7.1Z"
        [attr.fill]="color()"
      />
      @if (teamId() !== null) {
        <text x="12" y="13.6">{{ text() }}</text>
      }
    </svg>
  `,
  host: { class: 'team-hex' },
  styles: `
    :host {
      display: inline-grid;
      flex: none;
    }

    .shape {
      stroke: rgb(255 255 255 / 0.14);
      stroke-width: 1;
    }

    .shape.empty {
      stroke: var(--line);
      stroke-dasharray: 2.5 2;
    }

    text {
      fill: #f3f5f8;
      font: 700 8px var(--mono);
      text-anchor: middle;
      dominant-baseline: middle;
    }
  `,
})
export class TeamHex {
  readonly teamId = input<number | null>(null);
  readonly label = input('');
  readonly size = input(24);

  protected readonly color = computed(() => {
    const id = this.teamId();
    return id === null ? 'none' : teamColor(id);
  });
  protected readonly text = computed(() => initials(this.label()));
}
