import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-placeholder',
  template: `
    <p class="eyebrow">{{ eyebrow() }}</p>
    <h1 class="display-title">{{ heading() }}</h1>
    <p class="text">{{ text() }}</p>
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: block;
      max-width: 960px;
    }

    h1 {
      margin: 10px 0 14px;
      font-size: clamp(48px, 9vw, 88px);
    }

    .text {
      color: var(--muted);
    }

    .actions {
      margin-top: 24px;
    }

    .actions:empty {
      display: none;
    }
  `,
})
export class PagePlaceholder {
  readonly eyebrow = input.required<string>();
  readonly heading = input.required<string>();
  readonly text = input('Uskoro.');
}
