import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-error-state',
  template: `
    <p class="message">{{ message() }}</p>
    <button type="button" class="btn btn-ghost" (click)="retry.emit()">Pokušaj ponovo</button>
  `,
  host: { class: 'error-state', role: 'alert' },
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 16px;
      border: 1px solid rgb(239 91 91 / 0.4);
      border-radius: 10px;
      background: rgb(239 91 91 / 0.08);
    }

    .message {
      color: #ffb4b4;
      font-size: 14px;
    }
  `,
})
export class ErrorState {
  readonly message = input.required<string>();
  readonly retry = output<void>();
}
