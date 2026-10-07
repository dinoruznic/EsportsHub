import { Component, input } from '@angular/core';

@Component({
  selector: 'app-game-badge',
  template: `
    <span class="code">{{ code() }}</span>
    @if (name(); as name) {
      <span class="name">{{ name }}</span>
    }
  `,
  host: { class: 'game-badge' },
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-width: 0;
      color: var(--muted);
      font-size: 12px;
      font-weight: 600;
    }

    .code {
      padding: 4px 6px;
      border: 1px solid var(--line);
      border-radius: 4px;
      background: var(--panel-2);
      color: var(--text);
      font: 600 10px/1 var(--mono);
      letter-spacing: 0.06em;
    }

    .name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
})
export class GameBadge {
  readonly code = input.required<string>();
  readonly name = input<string | null>(null);
}
