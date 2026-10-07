import { Component, input, output, signal } from '@angular/core';

@Component({
  selector: 'app-confirm-inline',
  template: `
    @if (asking()) {
      <span class="question">{{ question() }}</span>
      <button type="button" class="btn btn-gold confirm" [disabled]="busy()" (click)="confirm()">
        {{ confirmLabel() }}
      </button>
      <button type="button" class="btn btn-ghost cancel" [disabled]="busy()" (click)="asking.set(false)">
        Ne
      </button>
    } @else {
      <button type="button" class="btn btn-ghost trigger" [disabled]="busy()" (click)="asking.set(true)">
        {{ label() }}
      </button>
    }
  `,
  host: { class: 'confirm-inline' },
  styles: `
    :host {
      display: inline-flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }

    .question {
      color: var(--muted);
      font-size: 13px;
    }
  `,
})
export class ConfirmInline {
  readonly label = input.required<string>();
  readonly question = input('Sigurno?');
  readonly confirmLabel = input('Da');
  readonly busy = input(false);
  readonly confirmed = output<void>();

  protected readonly asking = signal(false);

  protected confirm(): void {
    this.asking.set(false);
    this.confirmed.emit();
  }
}
