import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <p class="title">{{ title() }}</p>
    @if (text(); as text) {
      <p class="text">{{ text }}</p>
    }
    <div class="actions"><ng-content /></div>
  `,
  host: { class: 'empty-state' },
  styles: `
    :host {
      display: grid;
      justify-items: center;
      gap: 8px;
      padding: 40px 20px;
      border: 1px dashed var(--line);
      border-radius: 10px;
      text-align: center;
    }

    .title {
      font: 700 20px/1.1 var(--display);
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }

    .text {
      max-width: 420px;
      color: var(--muted);
      font-size: 14px;
    }

    .actions {
      margin-top: 8px;
    }

    .actions:empty {
      display: none;
    }
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly text = input<string | null>(null);
}
